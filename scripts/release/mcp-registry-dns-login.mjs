import { registryDnsLogin } from './lib/mcp-registry-dns-login.mjs'

// Deliberately unconditional: URL encoding and symlinks cannot skip this CLI.
registryDnsLogin().catch((error) => {
  console.error(error instanceof Error ? error.message : 'release_check_failed')
  process.exitCode = 1
})
