import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(process.argv[2])
const files = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Artifact symlinks are forbidden')
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(absolute)
    else { assert(entry.isFile(), 'Special artifact file'); const bytes = await readFile(absolute); files.push({ path: path.relative(root, absolute), sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }) }
  }
}
await walk(root)
assert(files.length > 0, 'Empty release artifact')
const body = JSON.stringify({ schemaVersion: 1, files: files.sort((a, b) => a.path.localeCompare(b.path)) }, null, 2) + '\n'
await writeFile(path.join(root, 'ARTIFACT_MANIFEST.json'), body)
process.stdout.write(crypto.createHash('sha256').update(body).digest('hex') + '\n')
