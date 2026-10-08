import type { AuthenChainMcpConfig } from './config.js'

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const
const REDACTED = '[REDACTED]'
const SENSITIVE = /authorization|api.?key|secret|token|password|credential|content|payload|signature/i

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.length > 512 ? `${value.slice(0, 512)}...` : value
  if (typeof value !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitize(item, seen))
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([key, item]) => [key, SENSITIVE.test(key) ? REDACTED : sanitize(item, seen)]),
  )
}

export function createLogger(config: Pick<AuthenChainMcpConfig, 'logLevel'>) {
  function write(level: keyof typeof LEVELS, event: string, data?: unknown) {
    if (LEVELS[level] > LEVELS[config.logLevel]) return
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: 'authenchain-mcp',
      event,
      ...(data === undefined ? {} : { data: sanitize(data) }),
    })
    process.stderr.write(`${line}\n`)
  }
  return {
    error: (event: string, data?: unknown) => write('error', event, data),
    warn: (event: string, data?: unknown) => write('warn', event, data),
    info: (event: string, data?: unknown) => write('info', event, data),
    debug: (event: string, data?: unknown) => write('debug', event, data),
  }
}

export type McpLogger = ReturnType<typeof createLogger>
