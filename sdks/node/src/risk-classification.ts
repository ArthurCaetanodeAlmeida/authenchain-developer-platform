import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys, ensureResponseObject } from './internal.js'
import { signProvenance } from './sign.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  AuthenChainAiUseCaseInput,
  ClassifyAiUseCaseInput,
  ClassifyAiUseCaseResponse,
  CreateAiUseCaseResponse,
  GetAiUseCaseInput,
  GetAiUseCaseResponse,
  ListAiUseCasesInput,
  ListAiUseCasesResponse,
  GetRiskClassificationHistoryInput,
  GetRiskClassificationHistoryResponse,
  SignResponse,
  SignWithRiskContextInput,
} from './types.js'

const USE_CASE_INPUT_KEYS = [
  'name',
  'description',
  'ownerUserId',
  'businessOwner',
  'technicalOwner',
  'jurisdiction',
  'sector',
  'decisionType',
  'contextFlags',
  'dataSensitivity',
  'modelProvider',
  'modelName',
  'modelVersion',
  'workflowName',
  'reason',
  'idempotencyKey',
  'requestId',
  'correlationId',
  'signal',
  'approvalRequestId',
  'mutationReason',
] as const

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response) => ensureResponseObject(payload, { endpoint, status: response.status }) as T
}

function requireId(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new AuthenChainValidationError({
      message: `${field} must be a non-empty string`,
      code: 'INVALID_RISK_CLASSIFICATION_INPUT',
      details: { field },
    })
  }
  return value.trim()
}

export async function createAiUseCase(
  client: AuthenChainHttpClient,
  input: AuthenChainAiUseCaseInput
): Promise<CreateAiUseCaseResponse> {
  assertNoUnknownKeys(input, USE_CASE_INPUT_KEYS, 'AuthenChain.createAiUseCase input', client.strictInputValidation)
  const { idempotencyKey: _idempotencyKey, requestId: _requestId, correlationId: _correlationId, signal: _signal, ...body } = input
  const { data } = await client.post<CreateAiUseCaseResponse>(
    '/api/regulatory/risk/use-cases',
    body,
    input,
    validateResponse<CreateAiUseCaseResponse>('/api/regulatory/risk/use-cases')
  )
  return data
}

export async function listAiUseCases(
  client: AuthenChainHttpClient,
  input: ListAiUseCasesInput = {}
): Promise<ListAiUseCasesResponse> {
  assertNoUnknownKeys(
    input,
    ['status', 'page', 'pageSize', 'requestId', 'correlationId', 'idempotencyKey', 'signal'],
    'AuthenChain.listAiUseCases input',
    client.strictInputValidation
  )
  const endpoint = '/api/regulatory/risk/use-cases'
  const { data } = await client.get<ListAiUseCasesResponse>(
    endpoint,
    { status: input.status, page: input.page, pageSize: input.pageSize },
    input,
    validateResponse<ListAiUseCasesResponse>(endpoint)
  )
  return data
}

export async function getAiUseCase(
  client: AuthenChainHttpClient,
  input: GetAiUseCaseInput
): Promise<GetAiUseCaseResponse> {
  assertNoUnknownKeys(input, ['id', 'requestId', 'correlationId', 'idempotencyKey', 'signal'], 'AuthenChain.getAiUseCase input', client.strictInputValidation)
  const id = requireId(input.id, 'id')
  const endpoint = `/api/regulatory/risk/use-cases/${encodeURIComponent(id)}`
  const { data } = await client.get<GetAiUseCaseResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<GetAiUseCaseResponse>(endpoint)
  )
  return data
}

export async function classifyAiUseCase(
  client: AuthenChainHttpClient,
  input: ClassifyAiUseCaseInput
): Promise<ClassifyAiUseCaseResponse> {
  assertNoUnknownKeys(input, ['id', 'reason', 'requestId', 'correlationId', 'idempotencyKey', 'signal'], 'AuthenChain.classifyAiUseCase input', client.strictInputValidation)
  const id = requireId(input.id, 'id')
  const endpoint = `/api/regulatory/risk/use-cases/${encodeURIComponent(id)}/classify`
  const { data } = await client.post<ClassifyAiUseCaseResponse>(
    endpoint,
    { reason: input.reason },
    input,
    validateResponse<ClassifyAiUseCaseResponse>(endpoint)
  )
  return data
}

export async function getRiskClassificationHistory(
  client: AuthenChainHttpClient,
  input: GetRiskClassificationHistoryInput
): Promise<GetRiskClassificationHistoryResponse> {
  assertNoUnknownKeys(
    input,
    ['aiUseCaseId', 'page', 'pageSize', 'requestId', 'correlationId', 'idempotencyKey', 'signal'],
    'AuthenChain.getRiskClassificationHistory input',
    client.strictInputValidation
  )
  const aiUseCaseId = requireId(input.aiUseCaseId, 'aiUseCaseId')
  const endpoint = `/api/regulatory/risk/use-cases/${encodeURIComponent(aiUseCaseId)}/history`
  const { data } = await client.get<GetRiskClassificationHistoryResponse>(
    endpoint,
    { page: input.page, pageSize: input.pageSize },
    input,
    validateResponse<GetRiskClassificationHistoryResponse>(endpoint)
  )
  return data
}

export async function signWithRiskContext(
  client: AuthenChainHttpClient,
  input: SignWithRiskContextInput
): Promise<SignResponse> {
  return signProvenance(client, {
    ...input,
    aiUseCaseId: requireId(input.aiUseCaseId, 'aiUseCaseId'),
    riskClassificationId: requireId(input.riskClassificationId, 'riskClassificationId'),
  })
}
