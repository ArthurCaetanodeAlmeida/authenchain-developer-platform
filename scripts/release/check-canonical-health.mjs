import { checkCanonicalHealth } from './lib/check-canonical-health.mjs'

// Deliberately unconditional: URL encoding and symlinks cannot skip this CLI.
checkCanonicalHealth().catch((error) => {
  console.error(error instanceof Error ? error.message : 'release_check_failed')
  process.exitCode = 1
})
