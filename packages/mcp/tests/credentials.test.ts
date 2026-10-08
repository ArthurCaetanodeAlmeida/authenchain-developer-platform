import { mkdtemp, readFile, rm, mkdir, chmod, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ unavailable: false, saved: '', deleted: false }))
const child = vi.hoisted(() => ({ execFile: vi.fn(), spawn: vi.fn(), exec: vi.fn() }))
vi.mock('node:child_process', () => child)
vi.mock('@napi-rs/keyring', () => ({ AsyncEntry: class {
  constructor() { if (state.unavailable) throw new Error('synthetic unavailable backend') }
  async getPassword() { return state.saved || undefined }
  async setPassword(value: string) { state.saved = value }
  async deleteCredential() { state.saved = ''; state.deleted = true; return true }
} }))
import { saveStoredCredential, loadStoredCredential, deleteStoredCredential } from '../src/credentials.js'

const credential = { accessToken: 'synthetic-access-token-visible-marker', refreshToken: 'synthetic-refresh-token-visible-marker', expiresAt: Date.now() + 600000, clientId: 'synthetic-client', tokenEndpoint: 'https://issuer.example.test/token', resource: 'https://mcp.example.test/mcp', scope: 'mcp:connect', environment: 'sandbox' as const }
let directory: string
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'authenchain-credential-test-'))
  vi.spyOn(os, 'homedir').mockReturnValue(directory)
  state.unavailable = false; state.saved = ''; state.deleted = false
  vi.stubEnv('AUTHENCHAIN_MCP_CREDENTIAL_PASSPHRASE', 'synthetic-fallback-passphrase-000000001')
})
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }) })
describe('credential storage without child-process secrets', () => {
  it.skipIf(process.platform !== 'darwin')('uses a mocked native keychain and never invokes a credential-bearing child process', async () => {
    expect(await saveStoredCredential(credential)).toBe('keychain')
    expect(await loadStoredCredential()).toEqual(credential)
    await deleteStoredCredential()
    expect(state.deleted).toBe(true)
    expect(await loadStoredCredential()).toBeNull()
    expect(child.execFile).not.toHaveBeenCalled(); expect(child.exec).not.toHaveBeenCalled(); expect(child.spawn).not.toHaveBeenCalled()
  })
  it('encrypts fallback data and repairs existing directory permissions', async () => {
    state.unavailable = true
    const parent = path.join(directory, '.config', 'authenchain')
    await mkdir(parent, { recursive: true }); await chmod(parent, 0o755)
    expect(await saveStoredCredential(credential)).toBe('encrypted-file')
    const destination = path.join(parent, 'mcp-credentials.json.enc')
    const stored = await readFile(destination, 'utf8')
    expect(stored).not.toContain(credential.accessToken); expect(stored).not.toContain(credential.refreshToken)
    expect((await stat(parent)).mode & 0o777).toBe(0o700)
    expect((await stat(destination)).mode & 0o777).toBe(0o600)
    expect(await loadStoredCredential()).toEqual(credential)
    if (process.platform === 'darwin') await expect(deleteStoredCredential()).rejects.toThrow('could not confirm removal')
    state.unavailable = false
    await deleteStoredCredential(); expect(await loadStoredCredential()).toBeNull()
    expect(child.execFile).not.toHaveBeenCalled()
  })
  it('rejects invalid cached credentials and unsafe endpoints', async () => {
    await expect(saveStoredCredential({ ...credential, expiresAt: NaN })).rejects.toThrow('invalid')
    await expect(saveStoredCredential({ ...credential, tokenEndpoint: 'http://untrusted.example.test/token' })).rejects.toThrow('HTTPS')
  })
})
