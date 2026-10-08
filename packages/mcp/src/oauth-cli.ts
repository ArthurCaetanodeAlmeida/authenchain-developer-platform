import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import http from 'node:http'
import { promisify } from 'node:util'

import {
  deleteStoredCredential,
  loadStoredCredential,
  saveStoredCredential,
  type StoredMcpCredential,
  withCredentialLock,
} from './credentials.js'

const execFileAsync = promisify(execFile)
const DEFAULT_REMOTE_URL = 'https://mcp.authenchain.com/mcp'
const DEFAULT_CALLBACK_PORT = 8765

function metadataUrl(resource: URL) {
  const path = resource.pathname === '/' ? '' : resource.pathname.replace(/^\//, '/')
  return new URL(`/.well-known/oauth-protected-resource${path}`, resource.origin)
}

function secureEndpoint(value: string | URL, expectedOrigin?: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (expectedOrigin && url.origin !== expectedOrigin)) throw new Error('OAuth endpoint does not match the trusted HTTPS issuer.')
  return url
}

async function jsonFetch(url: string | URL, init?: RequestInit) {
  const response = await fetch(secureEndpoint(url), { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { accept: 'application/json', ...(init?.headers || {}) } })
  const reader = response.body?.getReader()
  if (!reader) throw new Error('OAuth response is empty.')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 65536) { await reader.cancel(); throw new Error('OAuth response is too large.') }
      chunks.push(chunk.value)
    }
  } finally { reader.releaseLock() }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  let payload: Record<string, unknown> | null = null
  try { const parsed = JSON.parse(bytes.toString('utf8')); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed } catch { /* never include token response bodies in diagnostics */ }
  finally { bytes.fill(0) }
  if (!response.ok || !payload) throw new Error(`OAuth request failed (${response.status}).`)
  return payload
}

async function openBrowser(url: string) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  await execFileAsync(command, args, { timeout: 10_000 }).catch(() => {
    process.stderr.write(`Open this URL in a browser:\n${url}\n`)
  })
}

async function callbackServer(expectedState: string, expectedIssuer: string) {
  let settle: ((value: URL) => void) | null = null
  let reject: ((reason?: unknown) => void) | null = null
  const result = new Promise<URL>((resolve, rejectPromise) => { settle = resolve; reject = rejectPromise })
  const server = http.createServer((request, response) => {
    if (!['127.0.0.1:8765', 'localhost:8765'].includes(request.headers.host || '')) { response.writeHead(400).end('Invalid callback host'); return }
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    if (request.method !== 'GET' || url.pathname !== '/callback') {
      response.writeHead(404).end('Not found')
      return
    }
    if (url.searchParams.get('state') !== expectedState || url.searchParams.get('iss') !== expectedIssuer) { response.writeHead(400).end('Invalid OAuth callback'); return }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    response.end('<!doctype html><title>AuthenChain</title><p>Authentication response received. You may close this window.</p>')
    settle?.(url)
  })
  await new Promise<void>((resolve, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(DEFAULT_CALLBACK_PORT, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to create OAuth callback listener.')
  const timeout = setTimeout(() => reject?.(new Error('OAuth login timed out.')), 5 * 60_000)
  return {
    redirectUri: `http://127.0.0.1:${address.port}/callback`,
    close() { clearTimeout(timeout); server.close() },
    async wait() {
      try { return await result } finally { clearTimeout(timeout); server.close() }
    },
  }
}

async function resolveClientId(
  protectedMetadata: Record<string, unknown>,
  authorizationMetadata: Record<string, unknown>,
  redirectUri: string,
) {
  const configured = process.env.AUTHENCHAIN_MCP_OAUTH_CLIENT_ID?.trim()
  if (configured) return configured
  const cimd = typeof protectedMetadata.authenchain_cli_client_id === 'string'
    ? protectedMetadata.authenchain_cli_client_id
    : null
  if (cimd) return cimd
  if (process.env.AUTHENCHAIN_MCP_ALLOW_LEGACY_DCR !== 'true') {
    throw new Error('No registered OAuth client is available. Configure AUTHENCHAIN_MCP_OAUTH_CLIENT_ID or register the official AuthenChain CIMD client.')
  }
  const endpoint = typeof authorizationMetadata.registration_endpoint === 'string'
    ? authorizationMetadata.registration_endpoint
    : null
  if (!endpoint) throw new Error('Legacy dynamic client registration is not advertised by the authorization server.')
  const registered = await jsonFetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'AuthenChain MCP CLI',
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'native',
    }),
  })
  if (typeof registered.client_id !== 'string') throw new Error('Dynamic registration did not return a client_id.')
  return registered.client_id
}

async function validateSelectedEnvironment(accessToken: string, environment: 'production' | 'sandbox') {
  const apiBaseUrl = secureEndpoint(process.env.AUTHENCHAIN_BASE_URL || 'https://api.authenchain.com')
  const response = await fetch(new URL('/api/mcp/context', apiBaseUrl), {
    redirect: 'error',
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  const payload = await response.json().catch(() => null) as { organization?: { environment?: string } } | null
  if (!response.ok || payload?.organization?.environment !== environment) {
    throw new Error(`The authorized AuthenChain environment is not ${environment}. Switch environments in the dashboard and login again.`)
  }
}

export async function loginWithOAuth(options: { write?: boolean; environment?: 'production' | 'sandbox' } = {}) {
  const resource = secureEndpoint(process.env.AUTHENCHAIN_MCP_REMOTE_URL || DEFAULT_REMOTE_URL)
  const protectedMetadata = await jsonFetch(metadataUrl(resource))
  const authorizationServer = Array.isArray(protectedMetadata.authorization_servers)
    ? protectedMetadata.authorization_servers.find((value): value is string => typeof value === 'string')
    : null
  if (!authorizationServer) throw new Error('Protected resource metadata does not name an authorization server.')
  const issuer = secureEndpoint(authorizationServer)
  const metadata = await jsonFetch(new URL('.well-known/openid-configuration', issuer))
  const authorizationEndpoint = secureEndpoint(String(metadata.authorization_endpoint || ''), issuer.origin).toString()
  const tokenEndpoint = secureEndpoint(String(metadata.token_endpoint || ''), issuer.origin).toString()
  if (metadata.issuer !== issuer.toString()) throw new Error('OAuth discovery issuer mismatch.')
  if (metadata.revocation_endpoint) secureEndpoint(String(metadata.revocation_endpoint), issuer.origin)
  if (metadata.registration_endpoint) secureEndpoint(String(metadata.registration_endpoint), issuer.origin)
  if (!authorizationEndpoint || !tokenEndpoint) throw new Error('Authorization server metadata is incomplete.')

  const verifier = crypto.randomBytes(48).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier, 'utf8').digest('base64url')
  const state = crypto.randomBytes(24).toString('base64url')
  const callback = await callbackServer(state, issuer.toString())
  let clientId: string
  try { clientId = await resolveClientId(protectedMetadata, metadata, callback.redirectUri) } catch (error) { callback.close(); throw error }
  const scopes = ['openid', 'profile', 'email', 'offline_access', 'mcp:connect', 'mcp:tools:read', 'provenance:verify']
  if (options.write) scopes.push('mcp:tools:write', 'provenance:sign')
  const authorize = new URL(authorizationEndpoint)
  for (const [name, value] of Object.entries({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callback.redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: scopes.join(' '),
    resource: resource.toString(),
    audience: resource.origin,
  })) authorize.searchParams.set(name, value)
  const organizationId = process.env.AUTHENCHAIN_MCP_AUTH0_ORGANIZATION_ID?.trim()
  if (organizationId) authorize.searchParams.set('organization', organizationId)
  await openBrowser(authorize.toString())
  const returned = await callback.wait()
  if (returned.searchParams.get('state') !== state) throw new Error('OAuth state mismatch.')
  const returnedIssuer = returned.searchParams.get('iss')
  if (!returnedIssuer || new URL(returnedIssuer).toString() !== issuer.toString()) {
    throw new Error('OAuth authorization response issuer mismatch.')
  }
  const error = returned.searchParams.get('error')
  if (error) throw new Error(`OAuth authorization failed: ${/^[a-z_]{1,64}$/.test(error) ? error : 'authorization_failed'}`)
  const code = returned.searchParams.get('code')
  if (!code) throw new Error('OAuth callback did not include an authorization code.')
  const token = await jsonFetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: callback.redirectUri,
      code,
      code_verifier: verifier,
      resource: resource.toString(),
    }),
  })
  if (typeof token.access_token !== 'string') throw new Error('Token response did not include an access token.')
  const environment = options.environment || 'sandbox'
  await validateSelectedEnvironment(token.access_token, environment)
  const credential: StoredMcpCredential = {
    accessToken: token.access_token,
    refreshToken: typeof token.refresh_token === 'string' ? token.refresh_token : undefined,
    expiresAt: tokenExpiresAt(token.expires_in),
    clientId,
    tokenEndpoint,
    revocationEndpoint: typeof metadata.revocation_endpoint === 'string' ? metadata.revocation_endpoint : undefined,
    scope: typeof token.scope === 'string' ? token.scope : scopes.join(' '),
    resource: resource.toString(),
    environment,
  }
  const storage = await withCredentialLock(() => saveStoredCredential(credential))
  return { storage, expiresAt: credential.expiresAt, scope: credential.scope }
}

function tokenExpiresAt(value: unknown) {
  const seconds = value == null ? 600 : Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400) throw new Error('OAuth token lifetime is invalid.')
  return Date.now() + seconds * 1000
}

async function refreshCredential(credential: StoredMcpCredential) {
  if (!credential.refreshToken) throw new Error('OAuth session expired. Run `authenchain-mcp login` again.')
  const payload = await jsonFetch(credential.tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credential.clientId,
      refresh_token: credential.refreshToken,
      resource: credential.resource,
    }),
  })
  if (typeof payload.access_token !== 'string') throw new Error('Refresh response did not include an access token.')
  const refreshed: StoredMcpCredential = {
    ...credential,
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : credential.refreshToken,
    expiresAt: tokenExpiresAt(payload.expires_in),
    scope: typeof payload.scope === 'string' ? payload.scope : credential.scope,
  }
  await saveStoredCredential(refreshed)
  return refreshed
}

let tokenResolution: Promise<string> | null = null

async function resolveCurrentOAuthAccessToken() {
  const credential = await loadStoredCredential()
  if (!credential) throw new Error('No OAuth credential found. Run `authenchain-mcp login` or set AUTHENCHAIN_API_KEY.')
  const current = credential.expiresAt > Date.now() + 120_000 ? credential : await withCredentialLock(async () => {
    // Another process may have completed rotation while we waited for the lock.
    const latest = await loadStoredCredential()
    if (!latest) throw new Error('OAuth session was removed. Login again.')
    return latest.expiresAt > Date.now() + 120_000 ? latest : refreshCredential(latest)
  })
  return current.accessToken
}

export async function resolveOAuthAccessToken() {
  tokenResolution ??= resolveCurrentOAuthAccessToken().finally(() => { tokenResolution = null })
  return tokenResolution
}

export async function resolveOAuthEnvironment() {
  const credential = await loadStoredCredential()
  if (!credential?.environment) throw new Error('Stored OAuth credential does not identify an environment. Run `authenchain-mcp login` again.')
  return credential.environment
}

export async function oauthStatus() {
  const credential = await loadStoredCredential()
  if (!credential) return { authenticated: false as const }
  return {
    authenticated: true as const,
    expiresAt: new Date(credential.expiresAt).toISOString(),
    expired: credential.expiresAt <= Date.now(),
    scope: credential.scope.split(/\s+/).filter(Boolean),
    resource: credential.resource,
    environment: credential.environment || null,
  }
}

export async function oauthLogout() {
  return withCredentialLock(async () => {
    const credential = await loadStoredCredential()
    let revocation: 'not_available' | 'succeeded' | 'failed' = 'not_available'
    if (credential?.revocationEndpoint) {
      try {
        const response = await fetch(secureEndpoint(credential.revocationEndpoint), {
          method: 'POST', redirect: 'error',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: credential.refreshToken || credential.accessToken, client_id: credential.clientId }),
          signal: AbortSignal.timeout(10_000),
        })
        revocation = response.ok ? 'succeeded' : 'failed'
      } catch { revocation = 'failed' }
    }
    await deleteStoredCredential()
    return { localCredentialDeleted: true, revocation }
  })
}
