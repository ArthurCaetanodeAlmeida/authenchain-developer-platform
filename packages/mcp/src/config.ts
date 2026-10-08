import { z } from 'zod'

export type McpProfile = 'read-only' | 'full'
export type McpCredentialKind = 'api-key' | 'oauth'

export type AuthenChainMcpConfig = {
  apiKey: string
  baseUrl: string
  dashboardUrl: string
  expectedEnvironment: 'production' | 'sandbox'
  credentialKind: McpCredentialKind
  profile: McpProfile
  allowProductionWrites: boolean
  governanceEnabled: boolean
  allowedHosts: string[]
  dangerouslyAllowLocalhost: boolean
  timeoutMs: number
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  confirmationSecret?: string
  confirmationSubject?: string
  confirmationReplayStore?: ConfirmationReplayStore
  mutationApprovalStore?: MutationApprovalStore
  toolAllowlist?: string[]
}

export type ConfirmationReplayStore = {
  put: (nonce: string, expiresAt: number) => Promise<void>
  claim: (nonce: string, expiresAt: number) => Promise<boolean>
}

export type MutationApprovalStore = {
  request: (params: {
    tool: string
    environment: string
    idempotencyKey: string
    reason: string
    payload: unknown
    expiresAt: number
  }) => Promise<{ approvalRequestId: string; approvalUrl: string; expiresAt: string }>
  claim: (params: {
    approvalRequestId: string
    tool: string
    environment: string
    idempotencyKey: string
    reason: string
    payload: unknown
    now: number
  }) => Promise<boolean>
}

const envSchema = z.object({
  AUTHENCHAIN_API_KEY: z.string().trim().min(1),
  AUTHENCHAIN_BASE_URL: z.string().trim().url().default('https://api.authenchain.com'),
  AUTHENCHAIN_DASHBOARD_URL: z.string().trim().url().default('https://api.authenchain.com'),
  AUTHENCHAIN_MCP_ENVIRONMENT: z.enum(['production', 'sandbox']),
  AUTHENCHAIN_MCP_PROFILE: z.enum(['read-only', 'full']).default('read-only'),
  AUTHENCHAIN_MCP_ALLOW_PRODUCTION_WRITES: z.enum(['true', 'false', '1', '0']).default('false'),
  AUTHENCHAIN_MCP_GOVERNANCE_ENABLED: z.enum(['true', 'false', '1', '0']).default('true'),
  AUTHENCHAIN_MCP_ALLOWED_HOSTS: z.string().default('api.authenchain.com,forgetechindustrial.cloud'),
  AUTHENCHAIN_MCP_DANGEROUSLY_ALLOW_LOCALHOST: z.enum(['true', 'false', '1', '0']).default('false'),
  AUTHENCHAIN_MCP_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
  AUTHENCHAIN_MCP_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  AUTHENCHAIN_MCP_CONFIRMATION_SECRET: z.string().min(32).optional(),
})

function enabled(value: string) {
  return value === 'true' || value === '1'
}

function normalizedHost(value: string) {
  return value.trim().toLowerCase().replace(/^\[|\]$/g, '')
}

function isLocalhost(hostname: string) {
  const host = normalizedHost(hostname)
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

export function validateMcpBaseUrl(params: {
  baseUrl: string
  allowedHosts: string[]
  dangerouslyAllowLocalhost: boolean
}) {
  const url = new URL(params.baseUrl)
  if (url.username || url.password) throw new Error('AUTHENCHAIN_BASE_URL must not contain credentials')
  const local = isLocalhost(url.hostname)
  if (url.protocol !== 'https:' && !(local && params.dangerouslyAllowLocalhost)) {
    throw new Error('AUTHENCHAIN_BASE_URL must use HTTPS; localhost HTTP requires explicit dangerous opt-in')
  }
  const allowed = new Set(params.allowedHosts.map(normalizedHost).filter(Boolean))
  if (!allowed.has(normalizedHost(url.hostname)) && !(local && params.dangerouslyAllowLocalhost)) {
    throw new Error(`AUTHENCHAIN_BASE_URL host is not allowlisted: ${url.hostname}`)
  }
  return url.toString().replace(/\/+$/, '')
}

export function loadMcpConfig(
  source: NodeJS.ProcessEnv = process.env,
  trusted: { credentialKind?: McpCredentialKind } = {},
): AuthenChainMcpConfig {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'environment').join(', ')
    throw new Error(`Invalid AuthenChain MCP configuration: ${fields}`)
  }
  const allowedHosts = parsed.data.AUTHENCHAIN_MCP_ALLOWED_HOSTS
    .split(',')
    .map(normalizedHost)
    .filter(Boolean)
  const dangerouslyAllowLocalhost = enabled(parsed.data.AUTHENCHAIN_MCP_DANGEROUSLY_ALLOW_LOCALHOST)
  const credentialKind = trusted.credentialKind ?? 'api-key'
  // A raw API key is a headless credential. The public MCP package never turns
  // it into an interactive writer, even if hostile environment variables ask
  // for the full profile. Interactive mutations require OAuth user context.
  const requestedProfile = parsed.data.AUTHENCHAIN_MCP_PROFILE
  const profile = credentialKind === 'oauth' ? requestedProfile : 'read-only'
  return {
    apiKey: parsed.data.AUTHENCHAIN_API_KEY,
    baseUrl: validateMcpBaseUrl({
      baseUrl: parsed.data.AUTHENCHAIN_BASE_URL,
      allowedHosts,
      dangerouslyAllowLocalhost,
    }),
    dashboardUrl: new URL(parsed.data.AUTHENCHAIN_DASHBOARD_URL).toString().replace(/\/+$/, ''),
    expectedEnvironment: parsed.data.AUTHENCHAIN_MCP_ENVIRONMENT,
    credentialKind,
    profile,
    allowProductionWrites: credentialKind === 'oauth' && enabled(parsed.data.AUTHENCHAIN_MCP_ALLOW_PRODUCTION_WRITES),
    governanceEnabled: enabled(parsed.data.AUTHENCHAIN_MCP_GOVERNANCE_ENABLED),
    allowedHosts,
    dangerouslyAllowLocalhost,
    timeoutMs: parsed.data.AUTHENCHAIN_MCP_TIMEOUT_MS,
    logLevel: parsed.data.AUTHENCHAIN_MCP_LOG_LEVEL,
    confirmationSecret: parsed.data.AUTHENCHAIN_MCP_CONFIRMATION_SECRET,
    confirmationSubject: undefined,
    confirmationReplayStore: undefined,
    mutationApprovalStore: undefined,
    toolAllowlist: undefined,
  }
}
