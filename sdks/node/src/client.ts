import {
  AuthenChainApiError,
  AuthenChainError,
  AuthenChainHookError,
  AuthenChainNetworkError,
  AuthenChainTimeoutError,
  AuthenChainValidationError,
} from './errors.js'
import {
  buildOperationHeaders,
  extractResponseIdentifiers,
  getRetryDelayMs,
  isRetryableStatusCode,
  type NormalizedRetryConfig,
  normalizeRetryConfig,
  safeDiagnosticsRedaction,
  sanitizeForDiagnostics,
  sleep,
} from './internal.js'
import type {
  AuthenChainApiErrorPayload,
  AuthenChainConfig,
  ErrorHookContext,
  OperationRequestOptions,
  RequestHookContext,
  ResponseHookContext,
} from './types.js'

export const AUTHENCHAIN_PRODUCTION_BASE_URL = 'https://api.authenchain.com'
const DEFAULT_BASE_URL = AUTHENCHAIN_PRODUCTION_BASE_URL
const DEFAULT_TIMEOUT_MS = 10_000
// PHASE3-SDK-002: any hook that fails to settle within this budget is
// timed-out so a buggy / hung integration hook cannot block the main
// SDK request indefinitely. Caller-overridable via `hookTimeoutMs`.
const DEFAULT_HOOK_TIMEOUT_MS = 5_000

export interface AuthenChainResponse<T> {
  data: T
  headers: Headers
}

interface RequestQuery {
  [key: string]: string | number | boolean | null | undefined
}

interface RequestOptions<T> {
  body?: unknown
  query?: RequestQuery
  requestOptions?: OperationRequestOptions
  validateResponse?: (payload: unknown, response: Response) => T
}

export class AuthenChainHttpClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly defaultHeaders: Record<string, string>
  private readonly retryConfig: NormalizedRetryConfig
  private readonly onRequest?: AuthenChainConfig['onRequest']
  private readonly onResponse?: AuthenChainConfig['onResponse']
  private readonly onError?: AuthenChainConfig['onError']
  private readonly allowPayloadDiagnostics: boolean
  private readonly strictHooks: boolean
  private readonly hookTimeoutMs: number
  readonly strictInputValidation: boolean

  constructor(config: AuthenChainConfig) {
    if (!config.apiKey?.trim()) {
      throw new AuthenChainValidationError({
        message: 'AuthenChain requires a non-empty apiKey',
        code: 'MISSING_API_KEY',
      })
    }

    this.apiKey = config.apiKey
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? process.env.AUTHENCHAIN_BASE_URL ?? DEFAULT_BASE_URL)
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.defaultHeaders = cleanHeaders(config.defaultHeaders)
    this.retryConfig = normalizeRetryConfig(config.retry)
    this.onRequest = config.onRequest
    this.onResponse = config.onResponse
    this.onError = config.onError
    this.allowPayloadDiagnostics = config.allowPayloadDiagnostics === true || config.allowSensitiveDiagnostics === true
    this.strictHooks = config.strictHooks === true
    this.hookTimeoutMs =
      typeof config.hookTimeoutMs === 'number' && Number.isFinite(config.hookTimeoutMs) && config.hookTimeoutMs > 0
        ? config.hookTimeoutMs
        : DEFAULT_HOOK_TIMEOUT_MS
    this.strictInputValidation = config.strictInputValidation !== false
  }

  retryAttempts() {
    return this.retryConfig.maxAttempts
  }

  async get<T>(path: string, query?: RequestQuery, requestOptions?: OperationRequestOptions, validateResponse?: (payload: unknown, response: Response) => T) {
    return this.request<T>('GET', path, { query, requestOptions, validateResponse })
  }

  async post<T>(path: string, body?: unknown, requestOptions?: OperationRequestOptions, validateResponse?: (payload: unknown, response: Response) => T) {
    return this.request<T>('POST', path, { body, requestOptions, validateResponse })
  }

  async patch<T>(path: string, body?: unknown, requestOptions?: OperationRequestOptions, validateResponse?: (payload: unknown, response: Response) => T) {
    return this.request<T>('PATCH', path, { body, requestOptions, validateResponse })
  }

  async request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, options: RequestOptions<T> = {}): Promise<AuthenChainResponse<T>> {
    const url = new URL(path, `${this.baseUrl}/`)
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value == null) continue
        url.searchParams.set(key, String(value))
      }
    }

    const operationHeaders = buildOperationHeaders(options.requestOptions)
    const maxAttempts = this.retryConfig.maxAttempts

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
      const headers: Record<string, string> = {
        accept: 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        ...this.defaultHeaders,
        ...operationHeaders,
      }

      if (method !== 'GET') {
        headers['content-type'] = 'application/json'
      }

      const requestHookContext: RequestHookContext = {
        method,
        url: url.toString(),
        path,
        headers: safeDiagnosticsRedaction(headers, { allowPayloadDiagnostics: this.allowPayloadDiagnostics }) as Record<string, string>,
        body: safeDiagnosticsRedaction(options.body, { allowPayloadDiagnostics: this.allowPayloadDiagnostics }),
        attempt,
        maxAttempts,
        requestId: options.requestOptions?.requestId,
        correlationId: options.requestOptions?.correlationId,
        idempotencyKey: options.requestOptions?.idempotencyKey,
      }

      const startedAt = Date.now()
      await this.emitRequest(requestHookContext)

      try {
        const signal = options.requestOptions?.signal
          ? AbortSignal.any([controller.signal, options.requestOptions.signal])
          : controller.signal
        const response = await fetch(url, {
          method,
          headers,
          body: options.body == null ? undefined : JSON.stringify(options.body),
          signal,
        })

        const payload = await parsePayload(response)
        const identifiers = extractResponseIdentifiers(response.headers, payload, options.requestOptions)
        const durationMs = Date.now() - startedAt

        if (!response.ok) {
          const apiError = this.buildApiError(response, payload, identifiers, options.requestOptions)
          const willRetry = attempt < maxAttempts && isRetryableStatusCode(response.status)
          await this.emitError({
            method,
            url: url.toString(),
            path,
            durationMs,
            attempt,
            maxAttempts,
            willRetry,
            error: apiError,
          })

          if (willRetry) {
            await sleep(getRetryDelayMs(attempt, this.retryConfig))
            continue
          }

          throw apiError
        }

        const data = options.validateResponse
          ? options.validateResponse(payload, response)
          : ((payload ?? {}) as T)

        await this.emitResponse({
          method,
          url: url.toString(),
          path,
          status: response.status,
          headers: safeDiagnosticsRedaction(headersToObject(response.headers), { allowPayloadDiagnostics: this.allowPayloadDiagnostics }) as Record<string, string>,
          payload: safeDiagnosticsRedaction(payload, { allowPayloadDiagnostics: this.allowPayloadDiagnostics }),
          durationMs,
          attempt,
          maxAttempts,
          requestId: identifiers.requestId,
          traceId: identifiers.traceId,
        })

        return {
          data,
          headers: response.headers,
        }
      } catch (error) {
        if (error instanceof AuthenChainApiError) {
          throw error
        }

        const durationMs = Date.now() - startedAt
        const normalizedError = this.normalizeRequestError(error, options.requestOptions)
        const shouldRetry =
          attempt < maxAttempts &&
          normalizedError instanceof AuthenChainNetworkError &&
          !(normalizedError instanceof AuthenChainTimeoutError)

        await this.emitError({
          method,
          url: url.toString(),
          path,
          durationMs,
          attempt,
          maxAttempts,
          willRetry: shouldRetry,
          error: normalizedError,
        })

        if (shouldRetry) {
          await sleep(getRetryDelayMs(attempt, this.retryConfig))
          continue
        }

        throw normalizedError
      } finally {
        clearTimeout(timeout)
      }
    }

    throw new AuthenChainNetworkError({
      message: `AuthenChain request exhausted all retry attempts for ${path}`,
      code: 'RETRY_EXHAUSTED',
    })
  }

  private buildApiError(
    response: Response,
    payload: unknown,
    identifiers: { requestId?: string; traceId?: string },
    requestOptions?: OperationRequestOptions
  ) {
    const errorPayload = isRecord(payload) ? (payload as AuthenChainApiErrorPayload) : {}
    return new AuthenChainApiError({
      message:
        typeof errorPayload.message === 'string'
          ? errorPayload.message
          : typeof errorPayload.error === 'string'
            ? errorPayload.error
            : `AuthenChain request failed with status ${response.status}`,
      status: response.status,
      code: typeof errorPayload.code === 'string' ? errorPayload.code : undefined,
      requestId: identifiers.requestId ?? requestOptions?.requestId,
      traceId: identifiers.traceId,
      details: safeDiagnosticsRedaction(payload, { allowPayloadDiagnostics: this.allowPayloadDiagnostics }),
      headers: safeDiagnosticsRedaction(headersToObject(response.headers), { allowPayloadDiagnostics: this.allowPayloadDiagnostics }) as Record<string, string>,
    })
  }

  private normalizeRequestError(error: unknown, requestOptions?: OperationRequestOptions) {
    if (error instanceof AuthenChainError) {
      return error
    }

    if (isAbortError(error)) {
      if (requestOptions?.signal?.aborted) {
        return new AuthenChainNetworkError({
          message: 'AuthenChain request was aborted by the caller',
          code: 'REQUEST_ABORTED',
          requestId: requestOptions.requestId,
          cause: error,
        })
      }
      return new AuthenChainTimeoutError(this.timeoutMs, {
        requestId: requestOptions?.requestId,
        cause: error,
      })
    }

    return new AuthenChainNetworkError({
      message: error instanceof Error ? error.message : 'AuthenChain request failed due to a network error',
      code: 'NETWORK_ERROR',
      requestId: requestOptions?.requestId,
      details: safeDiagnosticsRedaction(error, { allowPayloadDiagnostics: this.allowPayloadDiagnostics }),
      cause: error,
    })
  }

  private async emitRequest(context: RequestHookContext) {
    await safeInvokeHook('onRequest', this.onRequest, context, this.strictHooks, this.hookTimeoutMs)
  }

  private async emitResponse(context: ResponseHookContext) {
    await safeInvokeHook('onResponse', this.onResponse, context, this.strictHooks, this.hookTimeoutMs)
  }

  private async emitError(context: ErrorHookContext) {
    await safeInvokeHook('onError', this.onError, context, this.strictHooks, this.hookTimeoutMs)
  }
}

function normalizeBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, '')
  const url = new URL(normalized)
  if (url.protocol === 'http:' && !isLocalHttpHost(url.hostname)) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain requires HTTPS for non-local baseUrl values',
      code: 'INSECURE_BASE_URL',
      details: { protocol: url.protocol, host: url.hostname },
    })
  }
  return url.toString().replace(/\/$/, '')
}

function isLocalHttpHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

function cleanHeaders(headers?: Record<string, string>) {
  if (!headers) return {}
  return Object.fromEntries(
    Object.entries(headers).filter((entry): entry is [string, string] => Boolean(entry[0]) && Boolean(entry[1]))
  )
}

async function parsePayload(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function headersToObject(headers: Headers) {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

// PHASE3-SDK-002: race the hook against a timeout so a hanging or
// network-blocking hook implementation can never indefinitely block
// the main SDK request. The timer is cleared in finally on both the
// success and the throw paths. The timed-out hook is itself wrapped in
// an `AuthenChainHookError` whose `details` are sanitized, so no raw
// hook arguments or payload bytes leak into the error.
async function invokeHookWithTimeout<TContext>(
  hook: (context: TContext) => void | Promise<void>,
  context: TContext,
  timeoutMs: number
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('hook_timeout')), timeoutMs)
  })
  try {
    await Promise.race([Promise.resolve().then(() => hook(context)), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function safeInvokeHook<TContext>(
  hookName: string,
  hook: ((context: TContext) => void | Promise<void>) | undefined,
  context: TContext,
  strictHooks: boolean,
  hookTimeoutMs: number
) {
  if (!hook) return
  try {
    await invokeHookWithTimeout(hook, context, hookTimeoutMs)
  } catch (error) {
    const isTimeout = error instanceof Error && error.message === 'hook_timeout'
    const hookError = new AuthenChainHookError(hookName, {
      // Sanitize even the synthetic timeout cause so a future change to
      // the cause shape cannot accidentally surface unsafe content.
      details: isTimeout
        ? { code: 'HOOK_TIMEOUT', timeoutMs: hookTimeoutMs }
        : sanitizeForDiagnostics(error),
      cause: isTimeout ? undefined : error,
    })
    if (strictHooks) throw hookError
    console.warn(JSON.stringify({
      kind: 'authenchain_sdk_event',
      level: 'warn',
      eventType: 'sdk.hook_failed',
      hookName,
      error: hookError.details,
    }))
  }
}
