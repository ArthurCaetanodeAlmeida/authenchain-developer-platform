import { AuthenChainApiError, AuthenChainError } from '@authenchain/node'

export type SafeMcpError = {
  code: string
  message: string
  traceId: string | null
  retryable: boolean
}

const SAFE_MESSAGES: Record<string, string> = {
  REQUEST_ABORTED: 'The operation was cancelled.',
  REQUEST_TIMEOUT: 'The AuthenChain API did not respond before the timeout.',
  NETWORK_ERROR: 'The AuthenChain API could not be reached.',
  INVALID_HASH: 'Provide a valid SHA-256 hash.',
  CONFIRMATION_REQUIRED: 'Preview this mutation and provide its confirmation token before executing it.',
  PRODUCTION_WRITES_DISABLED: 'Production writes are disabled for this MCP server.',
  READ_ONLY_PROFILE: 'This MCP server is running with the read-only profile.',
  HEADLESS_CREDENTIAL_READ_ONLY: 'API key and other headless MCP credentials are read-only. Use interactive OAuth for mutations.',
  HUMAN_APPROVAL_REQUIRED: 'Approve this exact production mutation in the AuthenChain dashboard, then provide its approvalRequestId.',
  HUMAN_APPROVAL_INVALID_EXPIRED_OR_USED: 'The human approval is invalid, expired, mismatched, rejected, or already used. Preview again.',
  PRODUCTION_HUMAN_APPROVAL_UNAVAILABLE: 'Production mutations require the AuthenChain server-side human approval service.',
  INVALID_IDEMPOTENCY_KEY: 'Provide an idempotency key with 8 to 128 letters, digits, dots, underscores, colons, or hyphens.',
  MUTATION_REASON_REQUIRED: 'Provide a short reason explaining why this mutation is required.',
}

export function safeMcpError(error: unknown): SafeMcpError {
  if (error instanceof AuthenChainApiError) {
    const code = error.code || `HTTP_${error.status || 500}`
    return {
      code,
      message: SAFE_MESSAGES[code] || error.message.slice(0, 240),
      traceId: error.traceId || null,
      retryable: error.status === 429 || (typeof error.status === 'number' && error.status >= 500),
    }
  }
  if (error instanceof AuthenChainError) {
    const code = error.code || 'AUTHENCHAIN_ERROR'
    return {
      code,
      message: SAFE_MESSAGES[code] || error.message.slice(0, 240),
      traceId: error.traceId || null,
      retryable: code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT',
    }
  }
  const internalCode = error instanceof Error ? error.message : 'internal_error'
  const known = new Set([
    'confirmation_token_invalid',
    'confirmation_token_mismatch_or_expired',
    'confirmation_token_replayed_or_unknown',
  ])
  if (known.has(internalCode)) {
    return {
      code: internalCode.toUpperCase(),
      message: 'The mutation confirmation is invalid, expired, mismatched, or already used. Preview again.',
      traceId: null,
      retryable: false,
    }
  }
  if (
    internalCode === 'READ_ONLY_PROFILE' ||
    internalCode === 'HEADLESS_CREDENTIAL_READ_ONLY' ||
    internalCode === 'HUMAN_APPROVAL_REQUIRED' ||
    internalCode === 'HUMAN_APPROVAL_INVALID_EXPIRED_OR_USED' ||
    internalCode === 'PRODUCTION_HUMAN_APPROVAL_UNAVAILABLE' ||
    internalCode === 'PRODUCTION_WRITES_DISABLED' ||
    internalCode === 'CONFIRMATION_REQUIRED' ||
    internalCode === 'INVALID_IDEMPOTENCY_KEY' ||
    internalCode === 'MUTATION_REASON_REQUIRED'
  ) {
    return { code: internalCode, message: SAFE_MESSAGES[internalCode], traceId: null, retryable: false }
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'The AuthenChain MCP operation failed. Review stderr logs and retry with the trace ID when available.',
    traceId: null,
    retryable: false,
  }
}
