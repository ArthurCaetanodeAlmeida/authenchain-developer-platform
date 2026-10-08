import { checkRegistryReleaseGate } from './lib/check-registry-release-gate.mjs'

// Deliberately unconditional: URL encoding and symlinks cannot skip this CLI.
checkRegistryReleaseGate().catch((error) => {
  console.error(error instanceof Error ? error.message : 'release_check_failed')
  process.exitCode = 1
})
