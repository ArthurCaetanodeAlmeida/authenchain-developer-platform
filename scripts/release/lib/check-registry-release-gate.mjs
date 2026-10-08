import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFileSync, readdirSync, lstatSync } from 'node:fs'
import path from 'node:path'
import { checkCanonicalHealth } from './check-canonical-health.mjs'

export async function checkRegistryReleaseGate(root = process.cwd()) {
  const manifest = JSON.parse(readFileSync(`${root}/PUBLIC_EXPORT_MANIFEST.json`, 'utf8'))
  assert.match(manifest.sourceRevision ?? '', /^[a-f0-9]{40}$/)
  assert.equal(manifest.backendRepository, process.env.AUTHENCHAIN_BACKEND_REPOSITORY, 'Unapproved backend repository')
  assert.match(manifest.backendRepository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
  assert(Array.isArray(manifest.files) && manifest.files.length > 0, 'Export file inventory is required')
  const declared = new Set()
  for (const item of manifest.files) {
    assert(typeof item.path === 'string' && !item.path.includes('\\') && !path.isAbsolute(item.path) && item.path.split('/').every((part) => part && part !== '.' && part !== '..'), 'Unsafe export path')
    assert.match(item.sha256 ?? '', /^[a-f0-9]{64}$/)
    assert(!declared.has(item.path), 'Duplicate export path')
    declared.add(item.path)
    const segments = item.path.split('/')
    for (let index = 1; index <= segments.length; index++) assert(!lstatSync(path.join(root, ...segments.slice(0, index))).isSymbolicLink(), 'Export symlink is forbidden')
  }
  const actual = []
  function walk(directory, relative = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name
      if (['node_modules', '.git', 'dist', '.next', '__pycache__', '.pytest_cache'].includes(entry.name)) continue
      if (name === 'PUBLIC_EXPORT_MANIFEST.json') continue
      assert(!entry.isSymbolicLink(), 'Export symlink is forbidden')
      if (entry.isDirectory()) walk(path.join(directory, entry.name), name)
      else { assert(entry.isFile(), 'Export contains a special file'); actual.push(name) }
    }
  }
  walk(root)
  assert.deepEqual(actual.sort(), [...declared].sort(), 'Export file inventory changed')
  for (const item of manifest.files) assert.equal(crypto.createHash('sha256').update(readFileSync(`${root}/${item.path}`)).digest('hex'), item.sha256, `Export changed: ${item.path}`)
  const packageJson = JSON.parse(readFileSync(`${root}/packages/mcp/package.json`, 'utf8'))
  const server = JSON.parse(readFileSync(`${root}/packages/mcp/server.json`, 'utf8'))
  assert.equal(packageJson.mcpName, 'com.authenchain/authenchain', 'Noncanonical Registry namespace')
  assert.equal(packageJson.homepage, 'https://api.authenchain.com/docs/mcp', 'Noncanonical public homepage')
  assert.equal(packageJson.mcpName, process.env.AUTHENCHAIN_REGISTRY_NAMESPACE, 'Registry ownership/namespace has not been finalized')
  assert.equal(server.name, packageJson.mcpName)
  assert.equal(server.version, packageJson.version)
  assert.equal(server.remotes, undefined)
  const authorization = process.env.AUTHENCHAIN_BACKEND_READ_TOKEN
  assert(authorization, 'A read-only backend CI credential is required')
  async function github(endpoint) {
    const response = await fetch(`https://api.github.com/repos/${manifest.backendRepository}${endpoint}`, { headers: { authorization: `Bearer ${authorization}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }, redirect: 'error', signal: AbortSignal.timeout(10000) })
    assert(response.ok, `Backend acceptance inspection failed (${response.status})`)
    return response.json()
  }
  const repository = await github('')
  const comparison = await github(`/compare/${encodeURIComponent(repository.default_branch)}...${manifest.sourceRevision}`)
  assert(['behind', 'identical'].includes(comparison.status), 'Source acceptance is not merged into the default branch')
  const runs = await github(`/actions/workflows/mcp-audit-acceptance.yml/runs?head_sha=${manifest.sourceRevision}&event=push&per_page=100`)
  assert(runs.workflow_runs?.some((run) => run.head_sha === manifest.sourceRevision && run.status === 'completed' && run.conclusion === 'success' && run.head_branch === repository.default_branch && run.event === 'push'), 'Merged A-F acceptance did not succeed for this source revision')
  await checkCanonicalHealth(manifest.sourceRevision)
  console.log(JSON.stringify({ mergedAcceptance: true, immutableExport: true, namespace: packageJson.mcpName }))
}
