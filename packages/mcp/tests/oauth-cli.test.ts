import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveStoredCredential, loadStoredCredential } from '../src/credentials.js'
import { oauthLogout, oauthStatus, resolveOAuthAccessToken } from '../src/oauth-cli.js'
const access = 'synthetic-access-token-distinct-marker'
const refresh = 'synthetic-refresh-token-distinct-marker'
const fixture = () => ({ accessToken: access, refreshToken: refresh, expiresAt: Date.now() + 600000, clientId: 'fixture-client', tokenEndpoint: 'https://issuer.example.test/token', revocationEndpoint: 'https://issuer.example.test/revoke', resource: 'https://mcp.example.test/mcp', scope: 'mcp:connect', environment: 'sandbox' as const })
let directory: string
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mcp-oauth-isolation-'))
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_DIR', directory)
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_STORAGE', 'encrypted-file')
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_PASSPHRASE', 'synthetic-passphrase-for-tests-000000001')
})
afterEach(async () => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); await rm(directory, { recursive: true, force: true }) })
describe('OAuth refresh/logout and secret-free diagnostics with isolated encrypted storage', () => {
  it('rotates once for simultaneous resolutions and keeps status free of tokens', async () => {
    await saveStoredCredential({ ...fixture(), expiresAt: Date.now() - 1 })
    const fetch = vi.fn(async () => Response.json({ access_token: access + '-rotated', refresh_token: refresh + '-rotated', expires_in: 600 }))
    vi.stubGlobal('fetch', fetch)
    expect(await Promise.all(Array.from({ length: 12 }, () => resolveOAuthAccessToken()))).toEqual(Array(12).fill(access + '-rotated'))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(await oauthStatus())).not.toMatch(/synthetic-(?:access|refresh)-token/)
    expect((await loadStoredCredential())?.refreshToken).toBe(refresh + '-rotated')
  })
  it.each([true, false])('reports revocation success accurately: %s', async (ok) => {
    await saveStoredCredential(fixture())
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: ok ? 200 : 503 })))
    const result = await oauthLogout()
    expect(result).toEqual({ localCredentialDeleted: true, revocation: ok ? 'succeeded' : 'failed' })
    expect(await loadStoredCredential()).toBeNull()
    expect(JSON.stringify([stdout.mock.calls, stderr.mock.calls, result])).not.toContain(access)
    expect(JSON.stringify([stdout.mock.calls, stderr.mock.calls, result])).not.toContain(refresh)
  })
  it('does not reveal response bodies or tokens when renewal fails', async () => {
    await saveStoredCredential({ ...fixture(), expiresAt: Date.now() - 1 })
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ secret: access, refresh }, { status: 401 })))
    await expect(resolveOAuthAccessToken()).rejects.toThrow('OAuth request failed (401)')
    expect((await loadStoredCredential())?.refreshToken).toBe(refresh)
  })
  it('serializes rotating refresh across two real CLI processes', async () => {
    await saveStoredCredential({ ...fixture(), expiresAt: Date.now() - 1 })
    const moduleUrl = new URL('../dist/oauth-cli.js', import.meta.url).href
    const counter = path.join(directory, 'refresh-count.txt')
    const source = `import crypto from 'node:crypto'; import { appendFile } from 'node:fs/promises'; globalThis.fetch = async () => { await appendFile(${JSON.stringify(counter)}, 'refresh\\n'); await new Promise(r => setTimeout(r, 150)); return Response.json({ access_token: crypto.randomUUID(), refresh_token: crypto.randomUUID(), expires_in: 600 }) }; const { resolveOAuthAccessToken } = await import(${JSON.stringify(moduleUrl)}); await resolveOAuthAccessToken();`
    const run = () => new Promise<{ output: string; code: number | null }>((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env } })
      let output = ''; child.stdout.on('data', (data) => { output += data }); child.stderr.on('data', (data) => { output += data }); child.once('error', reject); child.once('close', (code) => resolve({ output, code }))
    })
    const results = await Promise.all([run(), run()])
    expect(results).toEqual([{ output: '', code: 0 }, { output: '', code: 0 }])
    expect((await readFile(counter, 'utf8')).trim().split('\n')).toHaveLength(1)
  })
})
