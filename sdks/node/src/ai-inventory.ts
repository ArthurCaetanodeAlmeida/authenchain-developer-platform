import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys, ensureResponseObject } from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  ActivateAiInventoryDeploymentInput,
  ActivateAiInventoryDeploymentResponse,
  AuthenChainAiInventoryBinding,
  AuthenChainAiInventoryBindingReference,
  CreateAiInventoryDeploymentInput,
  CreateAiInventoryDeploymentResponse,
  CreateAiInventoryModelVersionInput,
  CreateAiInventoryModelVersionResponse,
  CreateAiInventorySystemInput,
  CreateAiInventorySystemResponse,
  FetchAiInventoryBindingInput,
  FetchAiInventoryBindingResponse,
  GetAiInventorySystemInput,
  GetAiInventorySystemResponse,
  JsonObject,
  ListAiInventorySystemsInput,
  ListAiInventorySystemsResponse,
  MetadataInput,
  ProvenanceMetadata,
  RequestAiInventoryModelChangeInput,
  RequestAiInventoryModelChangeResponse,
  ResolveAiInventoryBindingInput,
  ResolveAiInventoryBindingResponse,
} from './types.js'

const OPERATION_KEYS = ['idempotencyKey', 'requestId', 'correlationId', 'signal', 'approvalRequestId', 'mutationReason'] as const

const LIST_SYSTEMS_KEYS = [
  'status',
  'aiUseCaseId',
  'page',
  'pageSize',
  ...OPERATION_KEYS,
] as const

const CREATE_SYSTEM_KEYS = [
  'id',
  'workspaceId',
  'aiUseCaseId',
  'systemKey',
  'displayName',
  'description',
  'status',
  'internalOwnerTeam',
  'businessUnit',
  'allowedPurposeSummary',
  'jurisdictionMarkers',
  'productionUse',
  'ownerUserId',
  'ownerName',
  'ownerEmail',
  'backupOwnerUserId',
  'backupOwnerName',
  'backupOwnerEmail',
  'allowedPurposeIds',
  'policyVersionRefs',
  'sourceRiskClassificationId',
  'sourceImpactAssessmentId',
  'reason',
  ...OPERATION_KEYS,
] as const

const CREATE_MODEL_VERSION_KEYS = [
  'id',
  'aiSystemId',
  'provider',
  'providerDisplayName',
  'modelName',
  'modelVersion',
  'releaseLabel',
  'displayName',
  'hostingMode',
  'status',
  'endpointReferenceHash',
  'region',
  'fineTuneReferenceHash',
  'providerMetadata',
  'sourceRiskClassificationId',
  'sourceImpactAssessmentId',
  'reason',
  ...OPERATION_KEYS,
] as const

const CREATE_DEPLOYMENT_KEYS = [
  'id',
  'aiSystemId',
  'aiModelVersionId',
  'environment',
  'status',
  'ownerUserId',
  'ownerName',
  'ownerEmail',
  'allowedPurposeId',
  'policyBindingId',
  'policyVersionRefs',
  'endpointReferenceHash',
  'region',
  'residencyMarker',
  'dataHandlingMarkers',
  'sourceRiskClassificationId',
  'sourceImpactAssessmentId',
  'deprecatedModelVersionException',
  'reason',
  ...OPERATION_KEYS,
] as const

const ACTIVATE_DEPLOYMENT_KEYS = [
  'deploymentId',
  'expectedDeploymentHash',
  'deprecatedModelVersionException',
  'reason',
  ...OPERATION_KEYS,
] as const

const REQUEST_CHANGE_KEYS = [
  'id',
  'aiSystemId',
  'aiModelDeploymentId',
  'changeType',
  'beforeHash',
  'afterHash',
  'reason',
  'evidenceReferences',
  'changePayload',
  'sourceRiskClassificationId',
  'sourceImpactAssessmentId',
  ...OPERATION_KEYS,
] as const

const RESOLVE_BINDING_KEYS = [
  'enforcementMode',
  'aiSystemId',
  'deploymentEnvironment',
  'aiModelVersionId',
  'aiModelVersionHash',
  'aiModelDeploymentId',
  'allowedPurposeId',
  'policyBindingId',
  'policyVersionRefs',
  'metadata',
  ...OPERATION_KEYS,
] as const

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response) =>
    ensureResponseObject(payload, { endpoint, status: response.status }) as T
}

function requireStringId(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new AuthenChainValidationError({
      message: `${field} must be a non-empty string`,
      code: 'INVALID_AI_INVENTORY_INPUT',
      details: { field },
    })
  }
  return value.trim()
}

function omitOperationKeys<T extends Record<string, unknown>>(input: T) {
  const {
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    signal: _signal,
    ...body
  } = input
  return body
}

export async function getAiInventorySystem(
  client: AuthenChainHttpClient,
  input: GetAiInventorySystemInput,
): Promise<GetAiInventorySystemResponse> {
  assertNoUnknownKeys(input, ['id', ...OPERATION_KEYS], 'AuthenChain.getAiInventorySystem input', client.strictInputValidation)
  const id = requireStringId(input.id, 'id')
  const endpoint = `/api/regulatory/ai-systems/${encodeURIComponent(id)}`
  const { data } = await client.get<GetAiInventorySystemResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<GetAiInventorySystemResponse>(endpoint),
  )
  return data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAiInventoryMetadata(
  input:
    | AuthenChainAiInventoryBindingReference
    | AuthenChainAiInventoryBinding
    | ResolveAiInventoryBindingResponse,
) {
  if (isRecord(input) && isRecord(input.binding)) return input.binding
  return input
}

export function attachAiInventoryBindingToMetadata<T extends MetadataInput | ProvenanceMetadata | JsonObject>(
  metadata: T,
  inventory:
    | AuthenChainAiInventoryBindingReference
    | AuthenChainAiInventoryBinding
    | ResolveAiInventoryBindingResponse,
): T {
  if (!isRecord(metadata)) {
    throw new AuthenChainValidationError({
      message: 'metadata must be a JSON object',
      code: 'INVALID_AI_INVENTORY_INPUT',
      details: { field: 'metadata' },
    })
  }
  const regulatory: Record<string, unknown> = isRecord(metadata.regulatory)
    ? { ...metadata.regulatory }
    : {}
  regulatory.ai_inventory = normalizeAiInventoryMetadata(inventory)
  return {
    ...metadata,
    regulatory,
  } as T
}

export async function listAiInventorySystems(
  client: AuthenChainHttpClient,
  input: ListAiInventorySystemsInput = {},
): Promise<ListAiInventorySystemsResponse> {
  assertNoUnknownKeys(input, LIST_SYSTEMS_KEYS, 'AuthenChain.listAiInventorySystems input', client.strictInputValidation)
  const endpoint = '/api/regulatory/ai-systems'
  const { data } = await client.get<ListAiInventorySystemsResponse>(
    endpoint,
    {
      status: input.status,
      aiUseCaseId: input.aiUseCaseId,
      page: input.page,
      pageSize: input.pageSize,
    },
    input,
    validateResponse<ListAiInventorySystemsResponse>(endpoint),
  )
  return data
}

export async function createAiInventorySystem(
  client: AuthenChainHttpClient,
  input: CreateAiInventorySystemInput,
): Promise<CreateAiInventorySystemResponse> {
  assertNoUnknownKeys(input, CREATE_SYSTEM_KEYS, 'AuthenChain.createAiInventorySystem input', client.strictInputValidation)
  const endpoint = '/api/regulatory/ai-systems'
  const { data } = await client.post<CreateAiInventorySystemResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<CreateAiInventorySystemResponse>(endpoint),
  )
  return data
}

export async function createAiInventoryModelVersion(
  client: AuthenChainHttpClient,
  input: CreateAiInventoryModelVersionInput,
): Promise<CreateAiInventoryModelVersionResponse> {
  assertNoUnknownKeys(input, CREATE_MODEL_VERSION_KEYS, 'AuthenChain.createAiInventoryModelVersion input', client.strictInputValidation)
  const endpoint = '/api/regulatory/ai-model-versions'
  const { data } = await client.post<CreateAiInventoryModelVersionResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<CreateAiInventoryModelVersionResponse>(endpoint),
  )
  return data
}

export async function createAiInventoryDeployment(
  client: AuthenChainHttpClient,
  input: CreateAiInventoryDeploymentInput,
): Promise<CreateAiInventoryDeploymentResponse> {
  assertNoUnknownKeys(input, CREATE_DEPLOYMENT_KEYS, 'AuthenChain.createAiInventoryDeployment input', client.strictInputValidation)
  const aiSystemId = requireStringId(input.aiSystemId, 'aiSystemId')
  const endpoint = `/api/regulatory/ai-systems/${encodeURIComponent(aiSystemId)}/deployments`
  const {
    aiSystemId: _aiSystemId,
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...body
  } = input
  const { data } = await client.post<CreateAiInventoryDeploymentResponse>(
    endpoint,
    body,
    input,
    validateResponse<CreateAiInventoryDeploymentResponse>(endpoint),
  )
  return data
}

export async function activateAiInventoryDeployment(
  client: AuthenChainHttpClient,
  input: ActivateAiInventoryDeploymentInput,
): Promise<ActivateAiInventoryDeploymentResponse> {
  assertNoUnknownKeys(input, ACTIVATE_DEPLOYMENT_KEYS, 'AuthenChain.activateAiInventoryDeployment input', client.strictInputValidation)
  const deploymentId = requireStringId(input.deploymentId, 'deploymentId')
  const endpoint = `/api/regulatory/ai-deployments/${encodeURIComponent(deploymentId)}/activate`
  const {
    deploymentId: _deploymentId,
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...body
  } = input
  const { data } = await client.post<ActivateAiInventoryDeploymentResponse>(
    endpoint,
    body,
    input,
    validateResponse<ActivateAiInventoryDeploymentResponse>(endpoint),
  )
  return data
}

export async function requestAiInventoryModelChange(
  client: AuthenChainHttpClient,
  input: RequestAiInventoryModelChangeInput,
): Promise<RequestAiInventoryModelChangeResponse> {
  assertNoUnknownKeys(input, REQUEST_CHANGE_KEYS, 'AuthenChain.requestAiInventoryModelChange input', client.strictInputValidation)
  const endpoint = '/api/regulatory/ai-model-changes'
  const { data } = await client.post<RequestAiInventoryModelChangeResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<RequestAiInventoryModelChangeResponse>(endpoint),
  )
  return data
}

export async function resolveAiInventoryBinding(
  client: AuthenChainHttpClient,
  input: ResolveAiInventoryBindingInput,
): Promise<ResolveAiInventoryBindingResponse> {
  assertNoUnknownKeys(input, RESOLVE_BINDING_KEYS, 'AuthenChain.resolveAiInventoryBinding input', client.strictInputValidation)
  const endpoint = '/api/regulatory/ai-inventory/binding/resolve'
  const { data } = await client.post<ResolveAiInventoryBindingResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<ResolveAiInventoryBindingResponse>(endpoint),
  )
  return data
}

export async function fetchAiInventoryBinding(
  client: AuthenChainHttpClient,
  input: FetchAiInventoryBindingInput,
): Promise<FetchAiInventoryBindingResponse> {
  assertNoUnknownKeys(
    input,
    ['inventoryBindingHash', ...OPERATION_KEYS],
    'AuthenChain.fetchAiInventoryBinding input',
    client.strictInputValidation,
  )
  const inventoryBindingHash = requireStringId(input.inventoryBindingHash, 'inventoryBindingHash')
  const endpoint = `/api/regulatory/ai-inventory/bindings/${encodeURIComponent(inventoryBindingHash)}`
  const { data } = await client.get<FetchAiInventoryBindingResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<FetchAiInventoryBindingResponse>(endpoint),
  )
  return data
}
