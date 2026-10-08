import { AuthenChainValidationError } from './errors.js'
import { verifyEvidencePack } from './evidence-pack.js'
import { assertNoUnknownKeys, ensureResponseObject } from './internal.js'
import { signProvenance } from './sign.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  AuthenChainDisclosureBinding,
  AuthenChainDisclosureBindingReference,
  CreateDisclosureNoticeSnapshotInput,
  CreateDisclosureNoticeSnapshotResponse,
  JsonObject,
  MetadataInput,
  ProvenanceMetadata,
  RecordContentMarkingInput,
  RecordContentMarkingResponse,
  RecordDisclosureApplicationInput,
  RecordDisclosureApplicationResponse,
  RecordSyntheticContentDeclarationInput,
  RecordSyntheticContentDeclarationResponse,
  ResolveDisclosureBindingInput,
  ResolveDisclosureBindingResponse,
  SignResponse,
  SignWithDisclosureEvidenceInput,
  VerifyDisclosureEvidencePackInput,
  VerifyDisclosureEvidencePackResponse,
} from './types.js'

const OPERATION_KEYS = ['idempotencyKey', 'requestId', 'correlationId'] as const

const CREATE_NOTICE_KEYS = [
  'id',
  'workspaceId',
  'policyId',
  'templateKey',
  'templateVersion',
  'status',
  'noticeText',
  'noticeTextHash',
  'noticeLocale',
  'noticeChannel',
  'noticePlacement',
  'noticeDisplayMode',
  'publicSafeText',
  'policyVersionRefs',
  'reason',
  ...OPERATION_KEYS,
] as const

const RECORD_APPLICATION_KEYS = [
  'id',
  'workspaceId',
  'policyId',
  'noticeTemplateId',
  'signedEventId',
  'userInformed',
  'userInformedAt',
  'notInformedReasonCode',
  'noticeSnapshotHash',
  'noticeTextHash',
  'noticeTemplateVersion',
  'noticeLocale',
  'noticeChannel',
  'noticePlacement',
  'noticeDisplayMode',
  'evidenceArtifactHashes',
  'createdAt',
  'reason',
  ...OPERATION_KEYS,
] as const

const RECORD_SYNTHETIC_CONTENT_KEYS = [
  'id',
  'workspaceId',
  'disclosureApplicationId',
  'signedEventId',
  'aiGeneratedOutput',
  'syntheticContentStatus',
  'syntheticContentTypes',
  'declarationBasis',
  'humanEdited',
  'sourceSystem',
  'customerPolicyReference',
  'contentEvidenceHash',
  'contentCredentialReferenceHash',
  'declaredAt',
  'reason',
  ...OPERATION_KEYS,
] as const

const RECORD_MARKING_KEYS = [
  'id',
  'workspaceId',
  'disclosureApplicationId',
  'signedEventId',
  'markingApplied',
  'markingTypes',
  'markingEvidenceTypes',
  'markingProvider',
  'markingToolName',
  'markingToolVersion',
  'visibleLabelText',
  'visibleLabelPublicSafe',
  'visibleLabelTextHash',
  'watermarkAlgorithmReference',
  'contentCredentialStandard',
  'contentCredentialReferenceHash',
  'contentCredentialManifestHash',
  'contentCredentialIssuerReference',
  'visualEvidenceArtifactHash',
  'technicalEvidenceHashes',
  'customerAssertionBasis',
  'markedAt',
  'reason',
  ...OPERATION_KEYS,
] as const

const RESOLVE_BINDING_KEYS = [
  'content',
  'contentHash',
  'content_hash',
  'contentEncoding',
  'content_encoding',
  'metadata',
  'disclosure',
  'requestLogId',
  'provenanceEventId',
  'signedEventId',
  'bindingIdSeed',
  ...OPERATION_KEYS,
] as const

const SIGN_WITH_DISCLOSURE_KEYS = [
  'content',
  'contentHash',
  'contentEncoding',
  'contentEvidence',
  'metadata',
  'generateMetadataDefaults',
  'aiUseCaseId',
  'riskClassificationId',
  'impactAssessmentId',
  'impactAssessmentHash',
  'impactAssessmentGate',
  'riskContext',
  'aiInventory',
  'disclosure',
  'requestLogId',
  'provenanceEventId',
  'signedEventId',
  'bindingIdSeed',
  ...OPERATION_KEYS,
] as const

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response) =>
    ensureResponseObject(payload, { endpoint, status: response.status, headers: response.headers }) as T
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeDisclosureMetadata(
  input:
    | AuthenChainDisclosureBindingReference
    | AuthenChainDisclosureBinding
    | ResolveDisclosureBindingResponse,
) {
  const binding = isRecord(input) && isRecord(input.binding) ? input.binding : input
  if (!isRecord(binding)) return binding
  return {
    schemaVersion: binding.schemaVersion ?? 'authenchain.disclosure-signing-binding.v1',
    enforcementMode: binding.enforcementMode,
    userInformed: binding.userInformed,
    userInformedAt: binding.userInformedAt ?? null,
    notInformedReasonCode: binding.notInformedReasonCode ?? null,
    noticeSnapshotHash: binding.noticeSnapshotHash ?? null,
    noticeTextHash: binding.noticeTextHash ?? null,
    noticeTemplateId: binding.noticeTemplateId ?? null,
    noticeTemplateVersion: binding.noticeTemplateVersion ?? null,
    noticeLocale: binding.noticeLocale ?? null,
    noticeChannel: binding.noticeChannel ?? null,
    noticePlacement: binding.noticePlacement ?? null,
    noticeDisplayMode: binding.noticeDisplayMode ?? null,
    syntheticContentStatus: binding.syntheticContentStatus ?? null,
    syntheticContentTypes: Array.isArray(binding.syntheticContentTypes) ? [...binding.syntheticContentTypes] : [],
    markingApplied: binding.markingApplied ?? null,
    markingTypes: Array.isArray(binding.markingTypes) ? [...binding.markingTypes] : [],
    contentCredentialStandard: binding.contentCredentialStandard ?? null,
    contentCredentialReferenceHash: binding.contentCredentialReferenceHash ?? null,
    visualEvidenceArtifactHash: binding.visualEvidenceArtifactHash ?? null,
    disclosurePolicyHash: binding.disclosurePolicyHash ?? null,
    policyDecisionHash: binding.policyDecisionHash ?? null,
    syntheticContentDeclarationHash: binding.syntheticContentDeclarationHash ?? null,
    contentMarkingHash: binding.contentMarkingHash ?? null,
    disclosureEvidenceHash: binding.disclosureEvidenceHash ??
      (Array.isArray(binding.evidenceArtifactHashes) ? binding.evidenceArtifactHashes[0] ?? null : null),
    evidenceArtifactHashes: Array.isArray(binding.evidenceArtifactHashes) ? [...binding.evidenceArtifactHashes] : [],
    riskClassificationReference: binding.riskClassificationReference ?? null,
    aiImpactAssessmentReference: binding.aiImpactAssessmentReference ?? null,
    aiInventoryBindingHash: binding.aiInventoryBindingHash ?? null,
    contentEvidenceHash: binding.contentEvidenceHash ?? null,
    disclosureBindingHash: binding.disclosureBindingHash ?? null,
    policyResult: binding.policyResult ?? null,
    warningReasonCodes: Array.isArray(binding.warningReasonCodes) ? [...binding.warningReasonCodes] : [],
    legalCompliance: 'not_determined',
  }
}

export function attachDisclosureBindingToMetadata<T extends MetadataInput | ProvenanceMetadata | JsonObject>(
  metadata: T,
  disclosure:
    | AuthenChainDisclosureBindingReference
    | AuthenChainDisclosureBinding
    | ResolveDisclosureBindingResponse,
): T {
  if (!isRecord(metadata)) {
    throw new AuthenChainValidationError({
      message: 'metadata must be a JSON object',
      code: 'INVALID_DISCLOSURE_INPUT',
      details: { field: 'metadata' },
    })
  }
  const regulatory: Record<string, unknown> = isRecord(metadata.regulatory)
    ? { ...metadata.regulatory }
    : {}
  regulatory.disclosure = normalizeDisclosureMetadata(disclosure)
  return {
    ...metadata,
    regulatory,
  } as T
}

export async function createDisclosureNoticeSnapshot(
  client: AuthenChainHttpClient,
  input: CreateDisclosureNoticeSnapshotInput,
): Promise<CreateDisclosureNoticeSnapshotResponse> {
  assertNoUnknownKeys(input, CREATE_NOTICE_KEYS, 'AuthenChain.createDisclosureNoticeSnapshot input', client.strictInputValidation)
  const endpoint = '/api/regulatory/disclosure/notices'
  const { data } = await client.post<CreateDisclosureNoticeSnapshotResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<CreateDisclosureNoticeSnapshotResponse>(endpoint),
  )
  return data
}

export async function recordDisclosureApplication(
  client: AuthenChainHttpClient,
  input: RecordDisclosureApplicationInput,
): Promise<RecordDisclosureApplicationResponse> {
  assertNoUnknownKeys(input, RECORD_APPLICATION_KEYS, 'AuthenChain.recordDisclosureApplication input', client.strictInputValidation)
  const endpoint = '/api/regulatory/disclosure/applications'
  const { data } = await client.post<RecordDisclosureApplicationResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<RecordDisclosureApplicationResponse>(endpoint),
  )
  return data
}

export async function recordSyntheticContentDeclaration(
  client: AuthenChainHttpClient,
  input: RecordSyntheticContentDeclarationInput,
): Promise<RecordSyntheticContentDeclarationResponse> {
  assertNoUnknownKeys(input, RECORD_SYNTHETIC_CONTENT_KEYS, 'AuthenChain.recordSyntheticContentDeclaration input', client.strictInputValidation)
  const endpoint = '/api/regulatory/disclosure/synthetic-content'
  const { data } = await client.post<RecordSyntheticContentDeclarationResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<RecordSyntheticContentDeclarationResponse>(endpoint),
  )
  return data
}

export async function recordContentMarking(
  client: AuthenChainHttpClient,
  input: RecordContentMarkingInput,
): Promise<RecordContentMarkingResponse> {
  assertNoUnknownKeys(input, RECORD_MARKING_KEYS, 'AuthenChain.recordContentMarking input', client.strictInputValidation)
  const endpoint = '/api/regulatory/disclosure/markings'
  const { data } = await client.post<RecordContentMarkingResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<RecordContentMarkingResponse>(endpoint),
  )
  return data
}

export async function resolveDisclosureBinding(
  client: AuthenChainHttpClient,
  input: ResolveDisclosureBindingInput,
): Promise<ResolveDisclosureBindingResponse> {
  assertNoUnknownKeys(input, RESOLVE_BINDING_KEYS, 'AuthenChain.resolveDisclosureBinding input', client.strictInputValidation)
  const endpoint = '/api/regulatory/disclosure/binding/resolve'
  const body: Record<string, unknown> = {
    ...omitOperationKeys(input as unknown as Record<string, unknown>),
    ...(input.contentHash ? { content_hash: input.contentHash } : {}),
    ...(input.contentEncoding ? { content_encoding: input.contentEncoding } : {}),
  }
  delete body.contentHash
  delete body.contentEncoding
  const { data } = await client.post<ResolveDisclosureBindingResponse>(
    endpoint,
    body,
    input,
    validateResponse<ResolveDisclosureBindingResponse>(endpoint),
  )
  return data
}

export async function signWithDisclosureEvidence(
  client: AuthenChainHttpClient,
  input: SignWithDisclosureEvidenceInput,
): Promise<SignResponse> {
  assertNoUnknownKeys(input, SIGN_WITH_DISCLOSURE_KEYS, 'AuthenChain.signWithDisclosureEvidence input', client.strictInputValidation)
  const resolved = await resolveDisclosureBinding(client, {
    content: input.content,
    contentHash: input.contentHash,
    contentEncoding: input.contentEncoding,
    metadata: input.metadata as unknown as JsonObject,
    disclosure: input.disclosure,
    requestLogId: input.requestLogId,
    provenanceEventId: input.provenanceEventId,
    signedEventId: input.signedEventId,
    bindingIdSeed: input.bindingIdSeed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    correlationId: input.correlationId,
  })
  const metadata = attachDisclosureBindingToMetadata(input.metadata, resolved)
  const {
    disclosure: _disclosure,
    requestLogId: _requestLogId,
    provenanceEventId: _provenanceEventId,
    signedEventId: _signedEventId,
    bindingIdSeed: _bindingIdSeed,
    ...signInput
  } = input
  return signProvenance(client, {
    ...signInput,
    metadata,
  })
}

export async function verifyDisclosureEvidencePack(
  client: AuthenChainHttpClient,
  input: VerifyDisclosureEvidencePackInput,
): Promise<VerifyDisclosureEvidencePackResponse> {
  return verifyEvidencePack(client, input)
}
