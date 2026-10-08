export const MCP_ASSURANCE_LEVELS = ['A0', 'A1', 'A2', 'A3', 'A4'] as const
export type McpAssuranceLevel = (typeof MCP_ASSURANCE_LEVELS)[number]

export const CALLER_SUPPLIED_HASH_ASSURANCE = {
  assuranceLevel: 'A0' as const,
  captureMethod: 'attest_submitted_hash' as const,
  limitations: [
    'AuthenChain received a hash supplied by the caller and did not observe the original content.',
    'The signature proves integrity of the submitted hash and signed metadata, not how or when the original content was produced.',
  ],
}

const SENSITIVE_KEY = /(?:^|_)(?:authorization|api_?key|access_?token|refresh_?token|password|secret|private_?key|raw_?content|prompt|model_?input|model_?output)(?:$|_)/i
const SENSITIVE_REASON = /(?:bearer\s+[a-z0-9._~-]+|(?:sk|ac_(?:live|test))[-_][a-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password\s*[:=]|api[_ -]?key\s*[:=])/i

export function validateMutationReason(reason: string) {
  return !SENSITIVE_REASON.test(reason)
}

export function validateBoundedMetadata(value: unknown) {
  const issues: string[] = []
  let entries = 0
  const visit = (node: unknown, path: string, depth: number) => {
    if (depth > 6) {
      issues.push(`${path} exceeds maximum nesting depth`)
      return
    }
    if (node == null || typeof node === 'boolean' || typeof node === 'number') return
    if (typeof node === 'string') {
      if (SENSITIVE_REASON.test(node)) issues.push(`${path} contains credentials`)
      if (node.length > 2_048) issues.push(`${path} exceeds 2048 characters`)
      return
    }
    if (Array.isArray(node)) {
      if (node.length > 50) issues.push(`${path} exceeds 50 items`)
      node.slice(0, 51).forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1))
      return
    }
    if (typeof node !== 'object') {
      issues.push(`${path} must contain JSON values only`)
      return
    }
    for (const [key, item] of Object.entries(node as Record<string, unknown>)) {
      entries += 1
      if (entries > 200) {
        issues.push('metadata exceeds 200 fields')
        return
      }
      if (!key || key.length > 64) issues.push(`${path} contains an invalid key`)
      if (key === 'prompt_id' && (typeof item !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(item))) issues.push(`${path}.prompt_id must be an identifier`)
      if (key !== 'prompt_id' && SENSITIVE_KEY.test(key)) issues.push(`${path}.${key} is a sensitive or raw-content field`)
      visit(item, `${path}.${key}`, depth + 1)
    }
  }
  visit(value, 'metadata', 0)
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 16 * 1_024) {
      issues.push('metadata exceeds 16 KiB')
    }
  } catch {
    issues.push('metadata must be JSON serializable')
  }
  return [...new Set(issues)]
}


/** Full packs contain signatures and canonical hashes, never raw content or credentials. */
export function validateBoundedEvidencePack(value: unknown) {
  const errors: string[] = []
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 1048576) return ['Evidence Pack exceeds 1 MiB']
  let count = 0
  const visit = (node: unknown, depth: number) => {
    if (++count > 100000 || depth > 24) { errors.push('Evidence Pack exceeds the structural limit'); return }
    if (typeof node === 'string' && SENSITIVE_REASON.test(node)) errors.push('Evidence Pack contains credentials')
    if (Array.isArray(node)) { node.forEach((item) => visit(item, depth + 1)); return }
    if (!node || typeof node !== 'object') return
    for (const [key, item] of Object.entries(node)) {
      if (/^(?:content|raw_content|rawContent|prompt|model_input|model_output|authorization|access_token|refresh_token|private_key|api_key|password)$/i.test(key)) errors.push('Evidence Pack contains raw content or credentials')
      visit(item, depth + 1)
    }
  }
  visit(value, 0)
  if (!value || typeof value !== 'object' || !Array.isArray((value as Record<string, unknown>).proofs)) errors.push('Evidence Pack requires a proofs array')
  return [...new Set(errors)]
}
