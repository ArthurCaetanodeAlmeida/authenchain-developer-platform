import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { afterEach, expect, it, vi } from 'vitest'
const browser = vi.hoisted(() => {
  const fn: any = vi.fn()
  fn[Symbol.for('nodejs.util.promisify.custom')] = fn
  return fn
})
vi.mock('node:child_process', async (original) => ({ ...await original<typeof import('node:child_process')>(), execFile: browser }))
import { loginWithOAuth } from '../src/oauth-cli.js'
import { loadStoredCredential } from '../src/credentials.js'
let directory: string
const access = 'synthetic-loopback-access-secret-marker'
const refresh = 'synthetic-loopback-refresh-secret-marker'
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); if (directory) await rm(directory, { recursive: true, force: true }) })
it('performs a real loopback login, rejects forged callbacks and never passes tokens to browser argv or diagnostics', async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'authenchain-loopback-'))
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_DIR', directory)
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_STORAGE', 'encrypted-file')
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_PASSPHRASE', 'synthetic-passphrase-loopback-only')
  vi.stubEnv('AUTHENCHAIN_MCP_REMOTE_URL', 'https://mcp.example.test/mcp')
  vi.stubEnv('AUTHENCHAIN_MCP_OAUTH_CLIENT_ID', 'synthetic-client')
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  const request = (url: string, host?: string) => new Promise<number>((resolve, reject) => {
    http.get(url, { headers: host ? { host } : {} }, (response) => { response.resume(); response.once('end', () => resolve(response.statusCode!)) }).once('error', reject)
  })
  browser.mockImplementation(async (_command: string, args: string[]) => {
    const authorize = new URL(args[0])
    const callback = new URL(authorize.searchParams.get('redirect_uri')!)
    callback.searchParams.set('state', authorize.searchParams.get('state')!)
    callback.searchParams.set('iss', 'https://issuer.example.test/')
    callback.searchParams.set('code', 'synthetic-code-secret-marker')
    expect(await request(callback.toString(), 'forged.example.test')).toBe(400)
    const forged = new URL(callback); forged.searchParams.set('state', 'forged-state')
    expect(await request(forged.toString())).toBe(400)
    forged.searchParams.set('state', authorize.searchParams.get('state')!); forged.searchParams.set('iss', 'https://foreign.example.test/')
    expect(await request(forged.toString())).toBe(400)
    expect(await request(callback.toString())).toBe(200)
    return { stdout: '', stderr: '' }
  })
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
    const pathname = new URL(url).pathname
    if (pathname.includes('oauth-protected-resource')) return Response.json({ authorization_servers: ['https://issuer.example.test/'] })
    if (pathname.includes('openid-configuration')) return Response.json({ issuer: 'https://issuer.example.test/', authorization_endpoint: 'https://issuer.example.test/authorize', token_endpoint: 'https://issuer.example.test/token' })
    if (pathname === '/token') return Response.json({ access_token: access, refresh_token: refresh, expires_in: 600 })
    if (pathname === '/api/mcp/context') return Response.json({ organization: { environment: 'sandbox' } })
    throw new Error('Unexpected synthetic endpoint')
  }))
  const result = await loginWithOAuth({ environment: 'sandbox' })
  expect(result.storage).toBe('encrypted-file')
  expect(await loadStoredCredential()).toMatchObject({ accessToken: access, refreshToken: refresh })
  const diagnostics = JSON.stringify([browser.mock.calls, stdout.mock.calls, stderr.mock.calls, result])
  for (const secret of [access, refresh, 'synthetic-code-secret-marker']) expect(diagnostics).not.toContain(secret)
  expect(browser).toHaveBeenCalledTimes(1)
})
