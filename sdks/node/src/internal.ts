import { AuthenChainValidationError } from './errors.js'
import type {
  JsonObject,
  JsonValue,
  OperationRequestOptions,
  ProvenanceMetadata,
  RegulatoryMetadataV1,
  RetryConfig,
} from './types.js'

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])
const REDACTED = '[REDACTED]'
const ALWAYS_REDACT_KEY_PATTERN =
  /authorization|cookie|set-cookie|api[-_]?key|secret|token|password|credential|private[-_]?key|encrypted[-_]?dek|ciphertext|(^|[-_])dek($|[-_])/i
const PAYLOAD_DIAGNOSTIC_KEY_PATTERN = /content|input|output|body|payload|raw/i
const SAFE_DIAGNOSTIC_KEYS = new Set([
  'method',
  'url',
  'path',
  'status',
  'attempt',
  'maxAttempts',
  'requestId',
  'correlationId',
  'idempotencyKey',
  'traceId',
  'durationMs',
  'willRetry',
  'name',
  'message',
  'code',
])

export interface NormalizedRetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

export interface ResponseContext {
  status: number
  headers: Headers
}

export interface ResponseIdentifiers {
  requestId?: string
  traceId?: string
}

export function normalizeRetryConfig(config?: RetryConfig | false): NormalizedRetryConfig {
  if (!config) {
    return {
      maxAttempts: 1,
      baseDelayMs: 250,
      maxDelayMs: 2_000,
    }
  }

  return {
    maxAttempts: Math.max(1, Math.floor(config.maxAttempts ?? 3)),
    baseDelayMs: Math.max(1, Math.floor(config.baseDelayMs ?? 250)),
    maxDelayMs: Math.max(1, Math.floor(config.maxDelayMs ?? 2_000)),
  }
}

export function getRetryDelayMs(attempt: number, config: NormalizedRetryConfig) {
  return Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** Math.max(0, attempt - 1))
}

export function isRetryableStatusCode(status: number) {
  return RETRYABLE_STATUS_CODES.has(status)
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function buildOperationHeaders(options?: OperationRequestOptions) {
  const headers: Record<string, string> = {}
  if (!options) return headers

  if (options.approvalRequestId) headers['x-authenchain-approval-id'] = options.approvalRequestId
  if (options.mutationReason) headers['x-authenchain-mcp-reason'] = encodeURIComponent(options.mutationReason)
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey
  if (options.requestId) headers['x-request-id'] = options.requestId
  if (options.correlationId) headers['x-correlation-id'] = options.correlationId

  return headers
}

export function extractResponseIdentifiers(
  headers: Headers,
  payload?: unknown,
  requestOptions?: OperationRequestOptions
): ResponseIdentifiers {
  const requestId =
    headers.get('x-request-id') ??
    headers.get('request-id') ??
    (isRecord(payload) && typeof payload.request_id === 'string' ? payload.request_id : undefined) ??
    requestOptions?.requestId

  const traceId =
    (isRecord(payload) && typeof payload.trace_id === 'string' ? payload.trace_id : undefined) ??
    headers.get('x-trace-id') ??
    undefined

  return { requestId, traceId }
}

export function sanitizeForDiagnostics(value: unknown): unknown {
  return safeDiagnosticsRedaction(value)
}

export function safeDiagnosticsRedaction(value: unknown, options: { allowPayloadDiagnostics?: boolean } = {}): unknown {
  return redactUnknown(value, new WeakSet<object>(), null, options.allowPayloadDiagnostics === true)
}

export function assertNoUnknownKeys(
  value: unknown,
  allowedKeys: readonly string[],
  context: string,
  enabled = true
) {
  if (!enabled || !isRecord(value)) return
  const allowed = new Set(allowedKeys)
  const unknown = Object.keys(value).filter((key) => !allowed.has(key))
  if (unknown.length > 0) {
    throw new AuthenChainValidationError({
      message: `${context} contains unsupported field(s): ${unknown.join(', ')}. Put custom metadata under metadata.extra.`,
      code: 'UNKNOWN_FIELD',
      details: { context, unknownFields: unknown },
    })
  }
}

export function ensureJsonObject(value: unknown, path: string): JsonObject {
  const sanitized = ensureJsonSerializable(value, path)
  if (!isRecord(sanitized)) {
    throw new AuthenChainValidationError({
      message: `${path} must be a JSON object`,
      code: 'INVALID_JSON_OBJECT',
      details: sanitizeForDiagnostics(value),
    })
  }
  return sanitized
}

export function ensureJsonSerializable(value: unknown, path: string): JsonValue {
  return sanitizeJsonValue(value, path, new WeakSet<object>())
}

export function ensureResponseObject(
  payload: unknown,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    headers?: Headers
  }
): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new AuthenChainValidationError({
      message: `AuthenChain returned a malformed response for ${context.endpoint}`,
      status: context.status,
      code: 'MALFORMED_RESPONSE',
      requestId: context.requestId,
      traceId: context.traceId,
      details: sanitizeForDiagnostics(payload),
      headers: context.headers ? headersToObject(context.headers) : undefined,
    })
  }
  return payload
}

export function requireStringField(
  value: unknown,
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): string {
  if (typeof value !== 'string' || !value) {
    throwMalformedField(field, context)
  }
  return value
}

export function requireNullableStringField(
  value: unknown,
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): string | null {
  if (value === null) return null
  return requireStringField(value, field, context)
}

export function requireBooleanField(
  value: unknown,
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): boolean {
  if (typeof value !== 'boolean') {
    throwMalformedField(field, context)
  }
  return value
}

export function requireStringArrayField(
  value: unknown,
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throwMalformedField(field, context)
  }
  return value
}

export function requireMetadataField(
  value: unknown,
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): ProvenanceMetadata {
  const record = ensureResponseObject(value, context)
  const metadata: ProvenanceMetadata = {
    schema_version: record.schema_version === '1.1' ? '1.1' : record.schema_version === '1.0' ? '1.0' : throwMalformedField(`${field}.schema_version`, context),
    issuer: requireStringField(record.issuer, `${field}.issuer`, context),
    content_type: requireContentType(record.content_type, `${field}.content_type`, context),
    created_at: requireStringField(record.created_at, `${field}.created_at`, context),
    nonce: requireStringField(record.nonce, `${field}.nonce`, context),
    trace_id: requireStringField(record.trace_id, `${field}.trace_id`, context),
  }

  if (record.assurance != null) {
    const assurance = ensureResponseObject(record.assurance, context)
    const level = requireStringField(assurance.assuranceLevel, `${field}.assurance.assuranceLevel`, context)
    const method = requireStringField(assurance.captureMethod, `${field}.assurance.captureMethod`, context)
    if (record.schema_version !== '1.1' || assurance.schemaVersion !== 'authenchain.assurance.v1' ||
        !['A0', 'A1'].includes(level) || typeof assurance.contentObserved !== 'boolean' ||
        (level === 'A0' ? method !== 'attest_submitted_hash' || assurance.contentObserved !== false : method !== 'observe_submitted_content' || assurance.contentObserved !== true)) throwMalformedField(`${field}.assurance`, context)
    metadata.assurance = {
      schemaVersion: 'authenchain.assurance.v1', assuranceLevel: level as 'A0' | 'A1',
      captureMethod: method as 'attest_submitted_hash' | 'observe_submitted_content', contentObserved: assurance.contentObserved,
      limitations: requireStringArrayField(assurance.limitations, `${field}.assurance.limitations`, context),
    }
  } else if (record.schema_version === '1.1') throwMalformedField(`${field}.assurance`, context)

  if (record.model != null) metadata.model = requireStringField(record.model, `${field}.model`, context)
  if (record.user_ref != null) metadata.user_ref = requireStringField(record.user_ref, `${field}.user_ref`, context)
  if (record.extra != null) metadata.extra = ensureJsonObject(record.extra, `${field}.extra`)
  if (record.regulatory != null) {
    metadata.regulatory = ensureJsonObject(record.regulatory, `${field}.regulatory`) as unknown as RegulatoryMetadataV1
  }

  return metadata
}

export function requireContentType(
  value: unknown,
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): ProvenanceMetadata['content_type'] {
  if (value === 'text' || value === 'image' || value === 'video') {
    return value
  }
  throwMalformedField(field, context)
}

function throwMalformedField(
  field: string,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): never {
  throw new AuthenChainValidationError({
    message: `AuthenChain returned a malformed response for ${context.endpoint}: invalid ${field}`,
    status: context.status,
    code: 'MALFORMED_RESPONSE',
    requestId: context.requestId,
    traceId: context.traceId,
    details: sanitizeForDiagnostics(context.payload),
    headers: context.headers ? headersToObject(context.headers) : undefined,
  })
}

function sanitizeJsonValue(value: unknown, path: string, seen: WeakSet<object>): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw validationError(`${path} contains a non-finite number`, value)
    }
    return value
  }

  if (typeof value === 'undefined') {
    throw validationError(`${path} contains undefined, which is not JSON-serializable`, value)
  }

  if (typeof value === 'bigint') {
    throw validationError(`${path} contains bigint, which is not JSON-serializable`, String(value))
  }

  if (typeof value === 'function') {
    throw validationError(`${path} contains a function, which is not JSON-serializable`, value)
  }

  if (typeof value === 'symbol') {
    throw validationError(`${path} contains a symbol, which is not JSON-serializable`, String(value))
  }

  if (value instanceof Date) {
    const iso = value.toISOString()
    if (!iso) {
      throw validationError(`${path} contains an invalid Date`, value)
    }
    return iso
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeJsonValue(item, `${path}[${index}]`, seen))
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      throw validationError(`${path} contains a circular reference`, value)
    }

    seen.add(value)
    try {
      if (hasToJson(value) && !isPlainObject(value)) {
        return sanitizeJsonValue(value.toJSON(), `${path}.toJSON()`, seen)
      }

      if (!isPlainObject(value)) {
        throw validationError(
          `${path} must be a plain object, array, Date, or JSON-serializable value`,
          value
        )
      }

      const result: JsonObject = {}
      for (const [key, nested] of Object.entries(value)) {
        result[key] = sanitizeJsonValue(nested, `${path}.${key}`, seen)
      }
      return result
    } finally {
      seen.delete(value)
    }
  }

  throw validationError(`${path} contains an unsupported value`, value)
}

function sanitizeUnknown(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'undefined') return '[undefined]'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return '[function]'
  if (typeof value === 'symbol') return value.toString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: REDACTED,
    }
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => sanitizeUnknown(item, seen))
  if (typeof value === 'object') {
    if (seen.has(value)) return '[circular]'
    seen.add(value)
    try {
      const result: Record<string, unknown> = {}
      for (const [key, nested] of Object.entries(value)) {
        result[key] = sanitizeUnknown(nested, seen)
      }
      return result
    } finally {
      seen.delete(value)
    }
  }

  return String(value)
}

function redactUnknown(
  value: unknown,
  seen: WeakSet<object>,
  key: string | null,
  allowPayloadDiagnostics: boolean
): unknown {
  if (key && ALWAYS_REDACT_KEY_PATTERN.test(key)) return REDACTED
  if (key && !allowPayloadDiagnostics && PAYLOAD_DIAGNOSTIC_KEY_PATTERN.test(key)) return REDACTED
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return key && (SAFE_DIAGNOSTIC_KEYS.has(key) || allowPayloadDiagnostics) ? value : REDACTED
  if (typeof value === 'undefined') return '[undefined]'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return '[function]'
  if (typeof value === 'symbol') return value.toString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: REDACTED,
    }
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item, seen, key, allowPayloadDiagnostics))
  if (typeof value === 'object') {
    if (seen.has(value)) return '[circular]'
    seen.add(value)
    try {
      const result: Record<string, unknown> = {}
      for (const [nestedKey, nested] of Object.entries(value)) {
        if (ALWAYS_REDACT_KEY_PATTERN.test(nestedKey)) {
          result[nestedKey] = REDACTED
          continue
        }
        if (!allowPayloadDiagnostics && PAYLOAD_DIAGNOSTIC_KEY_PATTERN.test(nestedKey)) {
          result[nestedKey] = REDACTED
          continue
        }
        if (!allowPayloadDiagnostics && !SAFE_DIAGNOSTIC_KEYS.has(nestedKey)) {
          result[nestedKey] = '[REDACTED]'
          continue
        }
        result[nestedKey] = redactUnknown(nested, seen, nestedKey, allowPayloadDiagnostics)
      }
      return result
    } finally {
      seen.delete(value)
    }
  }

  return REDACTED
}

function validationError(message: string, value: unknown) {
  return new AuthenChainValidationError({
    message,
    code: 'INVALID_JSON_SERIALIZABLE_VALUE',
    details: sanitizeForDiagnostics(value),
  })
}

function headersToObject(headers: Headers) {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

function hasToJson(value: object): value is { toJSON: () => unknown } {
  return typeof (value as { toJSON?: unknown }).toJSON === 'function'
}

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
