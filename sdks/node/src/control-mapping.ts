import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys, ensureResponseObject } from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  ExportControlMappingEvidencePackSectionInput,
  ExportControlMappingEvidencePackSectionResponse,
  GenerateControlMappingSnapshotInput,
  GenerateControlMappingSnapshotResponse,
  GetControlMappingMaturityInput,
  GetControlMappingMaturityResponse,
  GetControlMappingSnapshotInput,
  GetControlMappingSnapshotResponse,
  ListControlFrameworksInput,
  ListControlFrameworksResponse,
  ListControlRequirementsInput,
  ListControlRequirementsResponse,
  PreviewControlMappingInput,
  PreviewControlMappingResponse,
} from './types.js'

const OPERATION_KEYS = ['idempotencyKey', 'requestId', 'correlationId'] as const

const LIST_FRAMEWORKS_KEYS = [...OPERATION_KEYS] as const
const LIST_REQUIREMENTS_KEYS = ['frameworkId', 'q', ...OPERATION_KEYS] as const
const SNAPSHOT_ID_KEYS = ['snapshotId', 'id', ...OPERATION_KEYS] as const
const EXPORT_KEYS = ['snapshotId', 'id', 'shareMode', ...OPERATION_KEYS] as const
const SCOPE_KEYS = [
  'workspaceId',
  'frameworkIds',
  'jurisdiction',
  'aiSystemId',
  'modelVersionId',
  'deploymentId',
  'environment',
  'periodStart',
  'periodEnd',
  'sourceRecords',
  'externalEvidence',
  'idempotency',
  ...OPERATION_KEYS,
] as const

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response) =>
    ensureResponseObject(payload, { endpoint, status: response.status }) as T
}

function requireSnapshotId(input: { snapshotId?: string; id?: string }, field = 'snapshotId') {
  const value = input.snapshotId ?? input.id
  if (!value?.trim()) {
    throw new AuthenChainValidationError({
      message: `${field} must be a non-empty string`,
      code: 'INVALID_CONTROL_MAPPING_INPUT',
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
    ...body
  } = input
  return body
}

export async function listControlFrameworks(
  client: AuthenChainHttpClient,
  input: ListControlFrameworksInput = {},
): Promise<ListControlFrameworksResponse> {
  assertNoUnknownKeys(input, LIST_FRAMEWORKS_KEYS, 'AuthenChain.listControlFrameworks input', client.strictInputValidation)
  const endpoint = '/api/regulatory/control-mapping/frameworks'
  const { data } = await client.get<ListControlFrameworksResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<ListControlFrameworksResponse>(endpoint),
  )
  return data
}

export async function listControlRequirements(
  client: AuthenChainHttpClient,
  input: ListControlRequirementsInput = {},
): Promise<ListControlRequirementsResponse> {
  assertNoUnknownKeys(input, LIST_REQUIREMENTS_KEYS, 'AuthenChain.listControlRequirements input', client.strictInputValidation)
  const endpoint = '/api/regulatory/control-mapping/controls'
  const { data } = await client.get<ListControlRequirementsResponse>(
    endpoint,
    {
      frameworkId: input.frameworkId,
      q: input.q,
    },
    input,
    validateResponse<ListControlRequirementsResponse>(endpoint),
  )
  return data
}

export async function previewControlMapping(
  client: AuthenChainHttpClient,
  input: PreviewControlMappingInput,
): Promise<PreviewControlMappingResponse> {
  assertNoUnknownKeys(input, SCOPE_KEYS, 'AuthenChain.previewControlMapping input', client.strictInputValidation)
  const endpoint = '/api/regulatory/control-mapping/preview'
  const { data } = await client.post<PreviewControlMappingResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<PreviewControlMappingResponse>(endpoint),
  )
  return data
}

export async function generateControlMappingSnapshot(
  client: AuthenChainHttpClient,
  input: GenerateControlMappingSnapshotInput,
): Promise<GenerateControlMappingSnapshotResponse> {
  assertNoUnknownKeys(input, SCOPE_KEYS, 'AuthenChain.generateControlMappingSnapshot input', client.strictInputValidation)
  const endpoint = '/api/regulatory/control-mapping/snapshots'
  const { data } = await client.post<GenerateControlMappingSnapshotResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<GenerateControlMappingSnapshotResponse>(endpoint),
  )
  return data
}

export async function getControlMappingSnapshot(
  client: AuthenChainHttpClient,
  input: GetControlMappingSnapshotInput,
): Promise<GetControlMappingSnapshotResponse> {
  assertNoUnknownKeys(input, SNAPSHOT_ID_KEYS, 'AuthenChain.getControlMappingSnapshot input', client.strictInputValidation)
  const snapshotId = requireSnapshotId(input)
  const endpoint = `/api/regulatory/control-mapping/snapshots/${encodeURIComponent(snapshotId)}`
  const { data } = await client.get<GetControlMappingSnapshotResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<GetControlMappingSnapshotResponse>(endpoint),
  )
  return data
}

export async function exportControlMappingEvidencePackSection(
  client: AuthenChainHttpClient,
  input: ExportControlMappingEvidencePackSectionInput,
): Promise<ExportControlMappingEvidencePackSectionResponse> {
  assertNoUnknownKeys(input, EXPORT_KEYS, 'AuthenChain.exportControlMappingEvidencePackSection input', client.strictInputValidation)
  const snapshotId = requireSnapshotId(input)
  const endpoint = `/api/regulatory/control-mapping/snapshots/${encodeURIComponent(snapshotId)}/evidence-pack`
  const { data } = await client.post<ExportControlMappingEvidencePackSectionResponse>(
    endpoint,
    { shareMode: input.shareMode },
    input,
    validateResponse<ExportControlMappingEvidencePackSectionResponse>(endpoint),
  )
  return data
}

export async function getControlMappingMaturity(
  client: AuthenChainHttpClient,
  input: GetControlMappingMaturityInput = {},
): Promise<GetControlMappingMaturityResponse> {
  assertNoUnknownKeys(input, SNAPSHOT_ID_KEYS, 'AuthenChain.getControlMappingMaturity input', client.strictInputValidation)
  const endpoint = '/api/regulatory/control-mapping/maturity'
  const { data } = await client.get<GetControlMappingMaturityResponse>(
    endpoint,
    { snapshotId: input.snapshotId ?? input.id },
    input,
    validateResponse<GetControlMappingMaturityResponse>(endpoint),
  )
  return data
}
