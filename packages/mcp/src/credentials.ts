import crypto from 'node:crypto'
import { mkdir, readFile, rm, writeFile, chmod, rename, lstat, open } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const KEYCHAIN_SERVICE = 'cloud.forgetechindustrial.authenchain-mcp'
const KEYCHAIN_ACCOUNT = 'oauth'

export type StoredMcpCredential = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  clientId: string
  tokenEndpoint: string
  revocationEndpoint?: string
  scope: string
  resource: string
  environment?: 'production' | 'sandbox'
}

function fallbackPath() {
  const configured = process.env.AUTHENCHAIN_MCP_CREDENTIAL_DIR
  if (configured && !path.isAbsolute(configured)) throw new Error('Credential directory must use an absolute path.')
  return path.join(configured || path.join(os.homedir(), '.config', 'authenchain'), 'mcp-credentials.json.enc')
}

async function keychainEntry() {
  if (process.platform !== 'darwin' || process.env.AUTHENCHAIN_MCP_CREDENTIAL_STORAGE === 'encrypted-file') return null
  // Native Security.framework binding: tokens never enter process argv.
  const { AsyncEntry } = await import('@napi-rs/keyring')
  return new AsyncEntry(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
}

async function keychainLoad() {
  try { return await (await keychainEntry())?.getPassword(AbortSignal.timeout(5_000)) || null }
  catch { return null }
}

async function keychainSave(value: string) {
  try {
    const entry = await keychainEntry()
    if (!entry) return false
    await entry.setPassword(value, AbortSignal.timeout(5_000))
    return true
  } catch { return false }
}

async function keychainDelete() {
  let entry: Awaited<ReturnType<typeof keychainEntry>>
  try { entry = await keychainEntry() } catch { throw new Error('System credential storage is unavailable; logout could not confirm removal from the keychain.') }
  if (!entry) return
  try { await entry.deleteCredential(AbortSignal.timeout(5_000)) }
  catch { throw new Error('System credential deletion failed. Unlock the keychain and retry logout.') }
}

function passphrase() {
  const value = process.env.AUTHENCHAIN_MCP_CREDENTIAL_PASSPHRASE || ''
  if (value.length < 32) {
    throw new Error('No supported system keychain is available. Set AUTHENCHAIN_MCP_CREDENTIAL_PASSPHRASE with at least 32 characters or use AUTHENCHAIN_API_KEY.')
  }
  return value
}

function encrypt(value: string) {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(passphrase(), salt, 32)
  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return JSON.stringify({ v: 1, salt: salt.toString('base64url'), iv: iv.toString('base64url'),
      tag: cipher.getAuthTag().toString('base64url'), ciphertext: ciphertext.toString('base64url') })
  } finally { key.fill(0) }
}

function decrypt(value: string) {
  const payload = JSON.parse(value) as Record<string, unknown>
  if (payload.v !== 1) throw new Error('Unsupported credential envelope.')
  const salt = Buffer.from(String(payload.salt), 'base64url')
  const iv = Buffer.from(String(payload.iv), 'base64url')
  const key = crypto.scryptSync(passphrase(), salt, 32)
  let plaintext: Buffer | undefined
  try {
    if (salt.length !== 16 || iv.length !== 12 || Buffer.from(String(payload.tag), 'base64url').length !== 16) throw new Error('Invalid credential envelope.')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(Buffer.from(String(payload.tag), 'base64url'))
    plaintext = Buffer.concat([decipher.update(Buffer.from(String(payload.ciphertext), 'base64url')), decipher.final()])
    return plaintext.toString('utf8')
  } finally { key.fill(0); plaintext?.fill(0) }
}

function parseCredential(value: string): StoredMcpCredential {
  let parsed: Partial<StoredMcpCredential>
  try { parsed = JSON.parse(value) } catch { throw new Error('Stored MCP credential is invalid.') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Stored MCP credential is invalid.')
  if (
    typeof parsed.accessToken !== 'string' || !parsed.accessToken ||
    (parsed.refreshToken != null && typeof parsed.refreshToken !== 'string') ||
    typeof parsed.expiresAt !== 'number' || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= 0 ||
    typeof parsed.clientId !== 'string' ||
    typeof parsed.tokenEndpoint !== 'string' ||
    typeof parsed.scope !== 'string' ||
    typeof parsed.resource !== 'string'
  ) throw new Error('Stored MCP credential is invalid.')
  for (const value of [parsed.tokenEndpoint, parsed.resource, ...(parsed.revocationEndpoint ? [parsed.revocationEndpoint] : [])]) {
    const url = new URL(value!)
    if (url.username || url.password || url.hash || url.protocol !== 'https:') throw new Error('Stored MCP endpoint must use HTTPS without embedded credentials.')
  }
  return parsed as StoredMcpCredential
}

type StorageSelection = 'keychain' | 'encrypted-file' | 'logged-out'
function selectionPath() { return path.join(path.dirname(fallbackPath()), 'mcp-credential-storage.json') }
async function credentialDirectory() {
  const directory = path.dirname(fallbackPath())
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const info = await lstat(directory)
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Credential directory must be a real directory.')
  await chmod(directory, 0o700)
  return directory
}
async function selectStorage(storage: StorageSelection) {
  await credentialDirectory()
  const temporary = `${selectionPath()}.${crypto.randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify({ storage }), { mode: 0o600, flag: 'wx' })
    await rename(temporary, selectionPath())
  } finally { await rm(temporary, { force: true }) }
}
async function selectedStorage(): Promise<StorageSelection | null> {
  try {
    const info = await lstat(selectionPath())
    if (!info.isFile() || info.isSymbolicLink() || info.size > 1024) throw new Error('Invalid credential storage selection.')
    const value = JSON.parse(await readFile(selectionPath(), 'utf8'))
    if (!['keychain', 'encrypted-file', 'logged-out'].includes(value.storage)) throw new Error('Invalid credential storage selection.')
    return value.storage
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new Error('Invalid credential storage selection.')
  }
}

export async function loadStoredCredential() {
  const selection = await selectedStorage()
  if (selection === 'logged-out') return null
  const fromKeychain = selection === 'encrypted-file' ? null : await keychainLoad()
  if (fromKeychain) return parseCredential(fromKeychain)
  if (selection === 'keychain') throw new Error('Selected system credential storage is unavailable.')
  try {
    const info = await lstat(fallbackPath())
    if (!info.isFile() || info.isSymbolicLink() || info.size > 65_536) throw new Error('Stored MCP credential file is invalid.')
    if (typeof process.getuid === 'function' && info.uid !== process.getuid()) throw new Error('Credential file owner is invalid.')
    await chmod(fallbackPath(), 0o600)
    return parseCredential(decrypt(await readFile(fallbackPath(), 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function saveStoredCredential(credential: StoredMcpCredential) {
  const serialized = JSON.stringify(credential)
  parseCredential(serialized)
  if (await keychainSave(serialized)) { await selectStorage('keychain'); return 'keychain' as const }
  const destination = fallbackPath()
  await credentialDirectory()
  const temporary = `${destination}.${crypto.randomUUID()}.tmp`
  try {
    await writeFile(temporary, encrypt(serialized), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await rename(temporary, destination)
    await chmod(destination, 0o600)
  } finally { await rm(temporary, { force: true }) }
  await selectStorage('encrypted-file')
  return 'encrypted-file' as const
}

export async function deleteStoredCredential() {
  // A tombstone prevents an older secondary cache from resurrecting the session.
  await selectStorage('logged-out')
  try { await keychainDelete() } finally { await rm(fallbackPath(), { force: true }) }
}

/** OS-exclusive lock shared by CLI processes. A stalled/crashed owner fails closed:
 * no second process can reuse a rotating refresh token. Never reclaim a live lock. */
export async function withCredentialLock<T>(operation: () => Promise<T>): Promise<T> {
  const directory = await credentialDirectory()
  const lockPath = path.join(directory, 'oauth-operation.lock')
  const deadline = Date.now() + 30_000
  while (true) {
    let lock
    try { lock = await open(lockPath, 'wx', 0o600) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (Date.now() >= deadline) throw new Error('Another OAuth operation owns the credential lock. If that process crashed, confirm it stopped before removing oauth-operation.lock and logging in again.')
      await new Promise((resolve) => setTimeout(resolve, 100))
      continue
    }
    try { await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: Date.now() })); return await operation() }
    finally { await lock.close(); await rm(lockPath, { force: true }) }
  }
}
