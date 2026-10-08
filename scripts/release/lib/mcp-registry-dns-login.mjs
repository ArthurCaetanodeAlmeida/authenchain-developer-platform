import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

// Implements the official Registry DNS exchange in memory. The private seed
// is never passed to a child process, written to disk or included in errors.
// Protocol: modelcontextprotocol/registry, cmd/publisher/auth/common.go.
export async function registryDnsLogin(directory = path.join(os.homedir(), '.config', 'mcp-publisher')) {
  const registry = 'https://registry.modelcontextprotocol.io'
  const domain = process.env.MCP_REGISTRY_DOMAIN
  assert(domain && /^[a-z0-9.-]+$/.test(domain), 'Approved registry domain required')
  const hex = process.env.MCP_PRIVATE_KEY ?? ''
  assert(/^[a-f0-9]{64}$/i.test(hex), 'An Ed25519 registry seed is required')
  delete process.env.MCP_PRIVATE_KEY
  const seed = Buffer.from(hex, 'hex')
  const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed])
  let signature
  try {
    const key = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    signature = { domain, timestamp, signed_timestamp: crypto.sign(null, Buffer.from(timestamp), key).toString('hex') }
  } finally { seed.fill(0); der.fill(0) }
  const response = await fetch(`${registry}/v0/auth/dns`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(signature), redirect: 'error', signal: AbortSignal.timeout(15000) })
  assert(response.ok, `Registry DNS exchange failed (${response.status})`)
  const text = await response.text()
  assert(Buffer.byteLength(text) <= 65536, 'Registry response too large')
  let payload
  try { payload = JSON.parse(text) } catch { throw new Error('Invalid Registry response') }
  assert(typeof payload.registry_token === 'string' && payload.registry_token.length > 0 && payload.registry_token.length <= 16384, 'Invalid Registry token')
  await fs.mkdir(directory, { recursive: true, mode: 0o700 })
  assert(!(await fs.lstat(directory)).isSymbolicLink(), 'Unsafe registry credential directory')
  await fs.chmod(directory, 0o700)
  const target = path.join(directory, 'token.json')
  const temporary = `${target}.${crypto.randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, JSON.stringify({ token: payload.registry_token, method: 'dns', registry }), { flag: 'wx', mode: 0o600 })
    await fs.rename(temporary, target)
  } finally { await fs.rm(temporary, { force: true }) }
  console.log(JSON.stringify({ registryDnsAuthenticated: true, privateKeyInArgv: false }))
}
