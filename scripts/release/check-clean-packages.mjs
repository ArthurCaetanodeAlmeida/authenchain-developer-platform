import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

const root = process.cwd()
const directory = mkdtempSync(path.join(os.tmpdir(), 'authenchain-clean-package-'))
const env = { PATH: process.env.PATH, AUTHENCHAIN_API_KEY: 'synthetic-package-conformance', AUTHENCHAIN_MCP_ENVIRONMENT: 'sandbox', AUTHENCHAIN_MCP_LOG_LEVEL: 'error' }
try {
  const tarballs = ['sdks/node', 'packages/mcp'].map((workspace) => {
    const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory, `./${workspace}`], { encoding: 'utf8', env }))[0]
    assert(packed.files.length > 5)
    for (const file of packed.files) assert(!/(^|\/)(?:\.env[^/]*|prisma|infra|node_modules|\.ssh|audits)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i.test(file.path), `Forbidden package member: ${file.path}`)
    return path.join(directory, packed.filename)
  })
  const project = path.join(directory, 'empty-project')
  mkdirSync(project)
  writeFileSync(path.join(project, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...tarballs], { cwd: project, env, stdio: 'pipe' })
  const sdk = await import(pathToFileURL(path.join(project, 'node_modules/@authenchain/node/dist/index.js')).href)
  let calledUrl
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => { calledUrl = String(url); return Response.json({ ok: true, schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic package tenant', environment: 'sandbox' }, dashboardUrl: 'https://forgetechindustrial.cloud', apiVersion: '1', scopes: ['mcp:connect'], capabilities: {}, limitations: [] }) }
  try { await new sdk.AuthenChain({ apiKey: env.AUTHENCHAIN_API_KEY }).getMcpContext(); assert.equal(calledUrl, 'https://api.authenchain.com/api/mcp/context') } finally { globalThis.fetch = originalFetch }
  const mcp = JSON.parse(readFileSync(path.join(project, 'node_modules/@authenchain/mcp/package.json'), 'utf8'))
  const metadata = JSON.parse(readFileSync(path.join(project, 'node_modules/@authenchain/mcp/server.json'), 'utf8'))
  assert.equal(mcp.version, metadata.version)
  assert.equal(mcp.mcpName, metadata.name)
  assert.equal(metadata.remotes, undefined)
  for (const [era, versionNegotiation] of [['modern', { mode: { pin: '2026-07-28' }, probe: { timeoutMs: 2000 } }], ['legacy', { mode: 'legacy' }]]) {
    const client = new Client({ name: 'clean-package-check', version: '1' }, { versionNegotiation })
    const transport = new StdioClientTransport({ command: path.join(project, 'node_modules/.bin/authenchain-mcp'), args: [], env, stderr: 'pipe' })
    let diagnostic = ''
    transport.stderr?.on('data', (chunk) => { diagnostic += chunk })
    try {
      await client.connect(transport)
      assert.equal(client.getProtocolEra(), era)
      assert.equal(client.getNegotiatedProtocolVersion(), era === 'modern' ? '2026-07-28' : '2025-11-25')
      assert.equal((await client.listTools()).tools.length, 9)
      assert(!diagnostic.includes(env.AUTHENCHAIN_API_KEY), 'Credential in diagnostic output')
    } finally { await client.close() }
  }
  console.log(JSON.stringify({ cleanInstall: true, sdkCanonicalDefault: true, mcpBin: true, protocols: ['2026-07-28', '2025-11-25'], version: mcp.version, secretsExcluded: true }))
} finally { rmSync(directory, { recursive: true, force: true }) }
