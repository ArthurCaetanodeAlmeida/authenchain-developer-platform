import { z } from 'zod'

export const MCP_RESULT_SCHEMA_VERSION = 'authenchain.mcp-result.v1' as const
export const MCP_ERROR_SCHEMA_VERSION = 'authenchain.mcp-error.v1' as const

const jsonRecordSchema = z.record(z.string(), z.unknown())

export const mcpResultSchema = z.object({
  schemaVersion: z.literal(MCP_RESULT_SCHEMA_VERSION),
  ok: z.literal(true),
  environment: z.string(),
  traceId: z.string().nullable(),
  data: jsonRecordSchema,
  pagination: jsonRecordSchema.optional(),
  links: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
})

export type McpResultEnvelope = z.infer<typeof mcpResultSchema>

function text(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function successResult(params: {
  environment: string
  traceId?: string | null
  data: Record<string, unknown>
  pagination?: Record<string, unknown>
  links?: Array<{ label: string; url: string }>
}) {
  const envelope: McpResultEnvelope = {
    schemaVersion: MCP_RESULT_SCHEMA_VERSION,
    ok: true,
    environment: params.environment,
    traceId: params.traceId ?? null,
    data: params.data,
    ...(params.pagination ? { pagination: params.pagination } : {}),
    ...(params.links?.length ? { links: params.links } : {}),
  }
  return {
    content: [{ type: 'text' as const, text: text(envelope) }],
    structuredContent: envelope,
  }
}

export function errorResult(params: {
  code: string
  message: string
  traceId?: string | null
  retryable?: boolean
}) {
  const envelope = {
    schemaVersion: MCP_ERROR_SCHEMA_VERSION,
    ok: false,
    code: params.code,
    message: params.message,
    traceId: params.traceId ?? null,
    retryable: params.retryable === true,
  }
  return {
    content: [{ type: 'text' as const, text: text(envelope) }],
    structuredContent: envelope,
    isError: true as const,
  }
}

export function traceIdFrom(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  return typeof record.trace_id === 'string'
    ? record.trace_id
    : typeof record.traceId === 'string'
      ? record.traceId
      : null
}

export function recordFrom(value: unknown): Record<string, unknown> {
  const sanitized = sanitizePublicData(value)
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : { value: sanitized }
}

const FORBIDDEN_OUTPUT_KEYS = /^(tenant_?id|org_?id|organization_?id|company_?id|api_?key_?id|key_?hash(?:_?sha)?|password_?hash|secret|authorization|access_?token|refresh_?token|token|private_?key)$/i
const MAX_OUTPUT_DEPTH = 12
const MAX_OUTPUT_STRING_LENGTH = 32_768

export function sanitizePublicData(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.length <= MAX_OUTPUT_STRING_LENGTH
      ? value
      : `${value.slice(0, MAX_OUTPUT_STRING_LENGTH)}...[truncated]`
  }
  if (typeof value !== 'object') return String(value)
  if (depth >= MAX_OUTPUT_DEPTH) return '[Max depth reached]'
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => sanitizePublicData(item, seen, depth + 1))
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 500)
      .filter(([key]) => !FORBIDDEN_OUTPUT_KEYS.test(key))
      .map(([key, item]) => [key, sanitizePublicData(item, seen, depth + 1)]),
  )
}
