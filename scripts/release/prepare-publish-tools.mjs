import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const manifest = JSON.parse(await readFile(new URL('./tools-manifest.json', import.meta.url), 'utf8'))
const destination = path.resolve(process.argv[2] || '.release-tools')
await mkdir(destination, { recursive: true })
for (const [key, name] of [['node', 'node.tar.xz'], ['npm', 'npm.tgz'], ['mcpPublisher', 'mcp-publisher.tar.gz']]) {
  const tool = manifest[key]
  const response = await fetch(tool.url, { signal: AbortSignal.timeout(120000) })
  assert(response.ok, `Pinned ${key} download failed`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (tool.sha256) assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), tool.sha256, `Pinned ${key} checksum mismatch`)
  else assert.equal(`sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`, tool.integrity, `Pinned ${key} SRI mismatch`)
  await writeFile(path.join(destination, name), bytes)
}
console.log(JSON.stringify({ pinnedToolsVerified: true }))
