export interface AuthenChainErrorOptions {
  message: string
  status?: number
  code?: string
  requestId?: string
  traceId?: string
  details?: unknown
  headers?: Record<string, string>
  cause?: unknown
}

export class AuthenChainError extends Error {
  readonly status?: number
  readonly code?: string
  readonly requestId?: string
  readonly traceId?: string
  readonly details?: unknown
  readonly payload?: unknown
  readonly headers: Record<string, string>

  constructor(params: AuthenChainErrorOptions) {
    super(params.message, params.cause === undefined ? undefined : { cause: params.cause })
    this.name = 'AuthenChainError'
    this.status = params.status
    this.code = params.code
    this.requestId = params.requestId
    this.traceId = params.traceId
    this.details = params.details
    this.payload = params.details
    this.headers = params.headers ?? {}
  }
}

export class AuthenChainNetworkError extends AuthenChainError {
  constructor(params: AuthenChainErrorOptions) {
    super(params)
    this.name = 'AuthenChainNetworkError'
  }
}

export class AuthenChainTimeoutError extends AuthenChainNetworkError {
  readonly timeoutMs: number

  constructor(timeoutMs: number, params: Omit<AuthenChainErrorOptions, 'message' | 'status' | 'code'> = {}) {
    super({
      ...params,
      message: `AuthenChain request timed out after ${timeoutMs}ms`,
      status: 408,
      code: 'TIMEOUT',
    })
    this.name = 'AuthenChainTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export class AuthenChainApiError extends AuthenChainError {
  constructor(params: AuthenChainErrorOptions) {
    super(params)
    this.name = 'AuthenChainApiError'
  }
}

export class AuthenChainValidationError extends AuthenChainError {
  constructor(params: AuthenChainErrorOptions) {
    super(params)
    this.name = 'AuthenChainValidationError'
  }
}

export class AuthenChainHookError extends AuthenChainError {
  readonly hookName: string

  constructor(hookName: string, params: Omit<AuthenChainErrorOptions, 'message' | 'code'> = {}) {
    super({
      ...params,
      message: `AuthenChain ${hookName} hook failed`,
      code: 'HOOK_FAILED',
    })
    this.name = 'AuthenChainHookError'
    this.hookName = hookName
  }
}
