import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys, ensureResponseObject } from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  CreateImpactAssessmentDraftInput,
  CreateImpactAssessmentDraftResponse,
  ExportImpactAssessmentEvidencePackInput,
  ExportImpactAssessmentEvidencePackResponse,
  GetImpactAssessmentInput,
  GetImpactAssessmentResponse,
  ListImpactAssessmentsInput,
  ListImpactAssessmentsResponse,
  SubmitImpactAssessmentInput,
  SubmitImpactAssessmentResponse,
  UpdateImpactAssessmentAnswersInput,
  UpdateImpactAssessmentAnswersResponse,
  VerifyImpactAssessmentEvidencePackInput,
  VerifyImpactAssessmentEvidencePackResponse,
} from './types.js'

const LIST_INPUT_KEYS = [
  'useCaseId',
  'status',
  'jurisdiction',
  'includeArchived',
  'page',
  'pageSize',
  'idempotencyKey',
  'requestId',
  'correlationId',
] as const

const CREATE_INPUT_KEYS = [
  'useCaseId',
  'jurisdiction',
  'assessmentKey',
  'assessmentType',
  'sourceRiskClassification',
  'questionnaire',
  'fundamentalRightsAssessment',
  'dataAssessment',
  'affectedGroupAssessment',
  'periodicReview',
  'idempotencyKey',
  'requestId',
  'correlationId',
] as const

const UPDATE_INPUT_KEYS = [
  'id',
  'questionnaire',
  'fundamentalRightsAssessment',
  'dataAssessment',
  'affectedGroupAssessment',
  'periodicReview',
  'reason',
  'idempotencyKey',
  'requestId',
  'correlationId',
] as const

const SUBMIT_INPUT_KEYS = [
  'id',
  'reason',
  'idempotencyKey',
  'requestId',
  'correlationId',
] as const

const EXPORT_INPUT_KEYS = [
  'id',
  'exportType',
  'exportStatus',
  'exportHash',
  'bundleHash',
  'signedEnvelopeHash',
  'expiresAt',
  'reason',
  'idempotencyKey',
  'requestId',
  'correlationId',
] as const

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response) => ensureResponseObject(payload, { endpoint, status: response.status }) as T
}

function requireAssessmentId(value: string | undefined, field = 'id') {
  if (!value?.trim()) {
    throw new AuthenChainValidationError({
      message: `${field} must be a non-empty string`,
      code: 'INVALID_IMPACT_ASSESSMENT_INPUT',
      details: { field },
    })
  }
  return value.trim()
}

export async function listImpactAssessments(
  client: AuthenChainHttpClient,
  input: ListImpactAssessmentsInput = {}
): Promise<ListImpactAssessmentsResponse> {
  assertNoUnknownKeys(input, LIST_INPUT_KEYS, 'AuthenChain.listImpactAssessments input', client.strictInputValidation)
  const endpoint = '/api/regulatory/impact-assessments'
  const { data } = await client.get<ListImpactAssessmentsResponse>(
    endpoint,
    {
      useCaseId: input.useCaseId,
      status: input.status,
      jurisdiction: input.jurisdiction,
      includeArchived: input.includeArchived,
      page: input.page,
      pageSize: input.pageSize,
    },
    input,
    validateResponse<ListImpactAssessmentsResponse>(endpoint)
  )
  return data
}

export async function createImpactAssessmentDraft(
  client: AuthenChainHttpClient,
  input: CreateImpactAssessmentDraftInput
): Promise<CreateImpactAssessmentDraftResponse> {
  assertNoUnknownKeys(input, CREATE_INPUT_KEYS, 'AuthenChain.createImpactAssessmentDraft input', client.strictInputValidation)
  const {
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...body
  } = input
  const endpoint = '/api/regulatory/impact-assessments'
  const { data } = await client.post<CreateImpactAssessmentDraftResponse>(
    endpoint,
    body,
    input,
    validateResponse<CreateImpactAssessmentDraftResponse>(endpoint)
  )
  return data
}

export async function updateImpactAssessmentAnswers(
  client: AuthenChainHttpClient,
  input: UpdateImpactAssessmentAnswersInput
): Promise<UpdateImpactAssessmentAnswersResponse> {
  assertNoUnknownKeys(input, UPDATE_INPUT_KEYS, 'AuthenChain.updateImpactAssessmentAnswers input', client.strictInputValidation)
  const id = requireAssessmentId(input.id)
  const {
    id: _id,
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...body
  } = input
  const endpoint = `/api/regulatory/impact-assessments/${encodeURIComponent(id)}`
  const { data } = await client.patch<UpdateImpactAssessmentAnswersResponse>(
    endpoint,
    body,
    input,
    validateResponse<UpdateImpactAssessmentAnswersResponse>(endpoint)
  )
  return data
}

export async function submitImpactAssessment(
  client: AuthenChainHttpClient,
  input: SubmitImpactAssessmentInput
): Promise<SubmitImpactAssessmentResponse> {
  assertNoUnknownKeys(input, SUBMIT_INPUT_KEYS, 'AuthenChain.submitImpactAssessment input', client.strictInputValidation)
  const id = requireAssessmentId(input.id)
  const endpoint = `/api/regulatory/impact-assessments/${encodeURIComponent(id)}/submit`
  const { data } = await client.post<SubmitImpactAssessmentResponse>(
    endpoint,
    { reason: input.reason },
    input,
    validateResponse<SubmitImpactAssessmentResponse>(endpoint)
  )
  return data
}

export async function getImpactAssessment(
  client: AuthenChainHttpClient,
  input: GetImpactAssessmentInput
): Promise<GetImpactAssessmentResponse> {
  assertNoUnknownKeys(input, ['id', 'requestId', 'correlationId', 'idempotencyKey'], 'AuthenChain.getImpactAssessment input', client.strictInputValidation)
  const id = requireAssessmentId(input.id)
  const endpoint = `/api/regulatory/impact-assessments/${encodeURIComponent(id)}`
  const { data } = await client.get<GetImpactAssessmentResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<GetImpactAssessmentResponse>(endpoint)
  )
  return data
}

export async function exportImpactAssessmentEvidencePack(
  client: AuthenChainHttpClient,
  input: ExportImpactAssessmentEvidencePackInput
): Promise<ExportImpactAssessmentEvidencePackResponse> {
  assertNoUnknownKeys(input, EXPORT_INPUT_KEYS, 'AuthenChain.exportImpactAssessmentEvidencePack input', client.strictInputValidation)
  const id = requireAssessmentId(input.id)
  const {
    id: _id,
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...body
  } = input
  const endpoint = `/api/regulatory/impact-assessments/${encodeURIComponent(id)}/evidence-pack`
  const { data } = await client.post<ExportImpactAssessmentEvidencePackResponse>(
    endpoint,
    body,
    input,
    validateResponse<ExportImpactAssessmentEvidencePackResponse>(endpoint)
  )
  return data
}

export async function verifyImpactAssessmentEvidencePack(
  client: AuthenChainHttpClient,
  input: VerifyImpactAssessmentEvidencePackInput
): Promise<VerifyImpactAssessmentEvidencePackResponse> {
  assertNoUnknownKeys(
    input,
    ['evidencePack', 'requestId', 'correlationId', 'idempotencyKey'],
    'AuthenChain.verifyImpactAssessmentEvidencePack input',
    client.strictInputValidation
  )
  if (input.evidencePack == null) {
    throw new AuthenChainValidationError({
      message: 'evidencePack must be provided',
      code: 'INVALID_IMPACT_ASSESSMENT_INPUT',
      details: { field: 'evidencePack' },
    })
  }
  const endpoint = '/api/public/regulatory-impact-assessments/verify'
  const { data } = await client.post<VerifyImpactAssessmentEvidencePackResponse>(
    endpoint,
    input.evidencePack,
    input,
    validateResponse<VerifyImpactAssessmentEvidencePackResponse>(endpoint)
  )
  return data
}
