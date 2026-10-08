import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys, ensureResponseObject, requireStringField, requireBooleanField, requireStringArrayField } from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  GetGovernanceReadinessInput,
  GetGovernanceReadinessResponse,
  GetMcpContextResponse,
  ListPendingGovernanceInput,
  ListPendingGovernanceResponse,
  LookupPublicEvidenceInput,
  LookupPublicEvidenceResponse,
  OperationRequestOptions,
} from './types.js'

const OPERATION_KEYS = ['idempotencyKey', 'requestId', 'correlationId', 'signal', 'approvalRequestId', 'mutationReason'] as const
const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response): T => {
    const context = { endpoint, status: response.status, headers: response.headers }
    const record = ensureResponseObject(payload, context)
    const invalid = (field: string): never => { throw new AuthenChainValidationError({ message: `Malformed MCP response field: ${field}`, code: 'MALFORMED_RESPONSE', status: response.status }) }
    const object = (value: unknown, field: string) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field)
      return value as Record<string, unknown>
    }
    const text = (value: unknown, field: string) => requireStringField(value, field, context)
    const strings = (value: unknown, field: string) => requireStringArrayField(value, field, context)
    const boolean = (value: unknown, field: string) => requireBooleanField(value, field, context)
    const integer = (value: unknown, field: string, min = 0) => { if (!Number.isSafeInteger(value) || Number(value) < min) invalid(field) }
    const array = (value: unknown, field: string): unknown[] => { if (!Array.isArray(value)) invalid(field); return value as unknown[] }
    const timestamp = (value: unknown, field: string) => { if (!Number.isFinite(Date.parse(text(value, field)))) invalid(field) }
    const url = (value: unknown, field: string) => { try { const parsed = new URL(text(value, field)); if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) invalid(field) } catch { invalid(field) } }
    const requirement = (value: unknown, field: string) => {
      const item = object(value, field)
      for (const key of ['id', 'label', 'detail']) text(item[key], `${field}.${key}`)
      boolean(item.met, `${field}.met`)
      if (item.notEvaluated != null) boolean(item.notEvaluated, `${field}.notEvaluated`)
      if (item.correction !== null) {
        const correction = object(item.correction, `${field}.correction`)
        text(correction.href, `${field}.correction.href`); url(correction.url, `${field}.correction.url`); text(correction.actionLabel, `${field}.correction.actionLabel`)
      }
    }
    if (record.ok != null && record.ok !== true) invalid('ok')
    if (endpoint === '/api/mcp/context') {
      if (record.schemaVersion !== 'authenchain.mcp-context.v1') invalid('schemaVersion')
      const org = object(record.organization, 'organization')
      text(org.name, 'organization.name')
      if (!['sandbox', 'production'].includes(String(org.environment))) invalid('organization.environment')
      url(record.dashboardUrl, 'dashboardUrl'); text(record.apiVersion, 'apiVersion')
      strings(record.scopes, 'scopes'); object(record.capabilities, 'capabilities'); strings(record.limitations, 'limitations')
    } else if (endpoint === '/api/regulatory/governance/readiness') {
      const view = object(record.readiness, 'readiness')
      if (view.schemaVersion !== 'authenchain.governance-readiness.v1') invalid('readiness.schemaVersion')
      timestamp(view.generatedAt, 'readiness.generatedAt'); url(view.dashboardUrl, 'readiness.dashboardUrl'); object(view.summary, 'readiness.summary'); strings(view.limitations, 'readiness.limitations')
      for (const [index, value] of array(view.useCases, 'readiness.useCases').entries()) {
        const item = object(value, `useCases.${index}`)
        for (const key of ['id', 'key', 'name']) text(item[key], `useCases.${index}.${key}`)
        if (!['ready', 'partial', 'blocked'].includes(String(item.readiness))) invalid('useCase.readiness')
        boolean(item.productionEligible, 'useCase.productionEligible')
        if (item.signingBlockedReason !== null) text(item.signingBlockedReason, 'useCase.signingBlockedReason')
        const score = object(item.score, 'useCase.score'); integer(score.met, 'score.met'); integer(score.total, 'score.total')
        if (Number(score.met) > Number(score.total)) invalid('score.met')
        for (const key of ['requirements', 'notEvaluated']) array(item[key], key).forEach((entry) => requirement(entry, key))
        strings(item.blockers, 'blockers'); strings(item.warnings, 'warnings'); object(item.links, 'links')
      }
    } else if (endpoint === '/api/regulatory/governance/pending') {
      const view = object(record.pending, 'pending')
      if (view.schemaVersion !== 'authenchain.governance-pending.v1') invalid('pending.schemaVersion')
      timestamp(view.generatedAt, 'pending.generatedAt'); strings(view.limitations, 'pending.limitations')
      const pagination = object(view.pagination, 'pending.pagination')
      for (const key of ['page', 'pageSize', 'total', 'totalPages']) integer(pagination[key], `pagination.${key}`, key === 'page' || key === 'pageSize' ? 1 : 0)
      if (Number(pagination.pageSize) > 100) invalid('pagination.pageSize')
      for (const value of array(view.items, 'pending.items')) {
        const item = object(value, 'pending.item'); text(item.id, 'item.id')
        const useCase = object(item.useCase, 'item.useCase'); for (const key of ['id', 'key', 'name']) text(useCase[key], `useCase.${key}`)
        text(item.readiness, 'item.readiness'); boolean(item.productionEligible, 'item.productionEligible'); requirement(item.requirement, 'item.requirement')
      }
    } else {
      if (!SHA256_PATTERN.test(text(record.hash, 'hash'))) invalid('hash')
      boolean(record.found, 'found'); array(record.evidencePacks, 'evidencePacks'); array(record.policies, 'policies')
      if (record.verificationScope !== 'public_hash_registry' || record.cryptographicEvidencePackVerified !== false) invalid('verificationScope')
      text(record.limitation, 'limitation')
    }
    return record as T
  }
}

export async function getMcpContext(
  client: AuthenChainHttpClient,
  input: OperationRequestOptions = {},
): Promise<GetMcpContextResponse> {
  assertNoUnknownKeys(input, OPERATION_KEYS, 'AuthenChain.getMcpContext input', client.strictInputValidation)
  const endpoint = '/api/mcp/context'
  const { data } = await client.get<GetMcpContextResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<GetMcpContextResponse>(endpoint),
  )
  return data
}

export async function getGovernanceReadiness(
  client: AuthenChainHttpClient,
  input: GetGovernanceReadinessInput = {},
): Promise<GetGovernanceReadinessResponse> {
  assertNoUnknownKeys(input, ['useCaseId', ...OPERATION_KEYS], 'AuthenChain.getGovernanceReadiness input', client.strictInputValidation)
  const endpoint = '/api/regulatory/governance/readiness'
  const { data } = await client.get<GetGovernanceReadinessResponse>(
    endpoint,
    { useCaseId: input.useCaseId },
    input,
    validateResponse<GetGovernanceReadinessResponse>(endpoint),
  )
  return data
}

export async function listPendingGovernance(
  client: AuthenChainHttpClient,
  input: ListPendingGovernanceInput = {},
): Promise<ListPendingGovernanceResponse> {
  assertNoUnknownKeys(
    input,
    ['useCaseId', 'page', 'pageSize', ...OPERATION_KEYS],
    'AuthenChain.listPendingGovernance input',
    client.strictInputValidation,
  )
  const endpoint = '/api/regulatory/governance/pending'
  const { data } = await client.get<ListPendingGovernanceResponse>(
    endpoint,
    { useCaseId: input.useCaseId, page: input.page, pageSize: input.pageSize },
    input,
    validateResponse<ListPendingGovernanceResponse>(endpoint),
  )
  return data
}

export async function lookupPublicEvidence(
  client: AuthenChainHttpClient,
  input: LookupPublicEvidenceInput,
): Promise<LookupPublicEvidenceResponse> {
  assertNoUnknownKeys(input, ['hash', ...OPERATION_KEYS], 'AuthenChain.lookupPublicEvidence input', client.strictInputValidation)
  const hash = input.hash?.trim()
  if (!hash || !SHA256_PATTERN.test(hash)) {
    throw new AuthenChainValidationError({
      message: 'hash must be a SHA-256 digest with an optional sha256: prefix',
      code: 'INVALID_HASH',
      details: { field: 'hash' },
    })
  }
  const endpoint = '/api/public/evidence/lookup'
  const { data } = await client.get<LookupPublicEvidenceResponse>(
    endpoint,
    { hash },
    input,
    validateResponse<LookupPublicEvidenceResponse>(endpoint),
  )
  return data
}
