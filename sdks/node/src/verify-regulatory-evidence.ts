import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys } from './internal.js'
import { verifyEvidencePack } from './evidence-pack.js'
import { validateRegulatoryMetadata } from './regulatory-metadata.js'
import { verifyProvenance } from './verify.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  AuthenChainRegulatoryEvidenceStatus,
  AuthenChainRegulatoryVerificationScope,
  VerifyEvidencePackResponse,
  VerifyRegulatoryEvidenceInput,
  VerifyRegulatoryEvidenceResponse,
  VerifyResponse,
} from './types.js'

const REGULATORY_VERIFICATION_SCHEMA_VERSION = 'authenchain.regulatory-verification.v1' as const

const CUSTOMER_RESPONSIBILITIES = [
  'Classify the AI workflow risk context through customer policy, backend workflow, or compliance review.',
  'Determine legal basis, disclosure requirements, and jurisdiction-specific obligations.',
  'Confirm whether human review, labeling, retention, and dispute handling are legally sufficient.',
  'Use legal or compliance counsel for final regulatory interpretation.',
]

export async function verifyRegulatoryEvidence(
  client: AuthenChainHttpClient,
  input: VerifyRegulatoryEvidenceInput
): Promise<VerifyRegulatoryEvidenceResponse> {
  assertNoUnknownKeys(
    input,
    [
      'content',
      'contentHash',
      'contentEncoding',
      'contentEvidence',
      'provenance',
      'evidencePack',
      'contentEvidenceByProofIndex',
      'verificationScope',
      'idempotencyKey',
      'requestId',
      'correlationId',
    ],
    'AuthenChain.verifyRegulatoryEvidence input',
    client.strictInputValidation
  )

  const verificationScope = resolveVerificationScope(input)
  validateRequestedInputs(input, verificationScope)

  const provenanceVerification = shouldVerifyProvenance(verificationScope)
    ? await verifyProvenance(client, {
        ...(input.content != null ? { content: input.content } : { contentHash: input.contentHash }),
        ...(input.contentEncoding == null ? {} : { contentEncoding: input.contentEncoding }),
        ...(input.contentEvidence == null ? {} : { contentEvidence: input.contentEvidence }),
        provenance: input.provenance!,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        correlationId: input.correlationId,
      })
    : undefined

  const evidencePackVerification = shouldVerifyEvidencePack(verificationScope)
    ? await verifyEvidencePack(client, {
        evidencePack: input.evidencePack,
        ...(input.contentEvidenceByProofIndex == null ? {} : { contentEvidenceByProofIndex: input.contentEvidenceByProofIndex }),
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        correlationId: input.correlationId,
      })
    : undefined

  const provenanceVerified = provenanceVerification == null ? null : provenanceVerification.verified
  const evidencePackVerified = evidencePackVerification == null
    ? null
    : evidencePackVerification.trustedStatus === 'trusted' && evidencePackVerification.externallyTrustworthy === true

  const regulatoryEvidenceStatus = resolveRegulatoryEvidenceStatus({
    verificationScope,
    provenanceMetadata: input.provenance?.metadata,
    provenanceVerification,
    evidencePackVerification,
    provenanceVerified,
    evidencePackVerified,
  })
  const warnings = uniqueStrings([
    ...extractStringArray(evidencePackVerification, 'warnings'),
    ...extractStringArray(evidencePackVerification, 'missing').map((item) => `missing:${item}`),
  ])
  const failures = uniqueStrings([
    ...(provenanceVerified === false ? ['provenance_verification_failed'] : []),
    ...(evidencePackVerified === false ? ['evidence_pack_verification_failed'] : []),
    ...extractStringArray(evidencePackVerification, 'failures'),
  ])
  const reasonCodes = uniqueStrings([
    ...(provenanceVerification?.reasonCodes ?? []),
    ...failures,
  ])
  const reason = resolveReason(provenanceVerification, evidencePackVerification, failures)

  return {
    schemaVersion: REGULATORY_VERIFICATION_SCHEMA_VERSION,
    verificationScope,
    environment: 'live',
    provenanceVerified,
    evidencePackVerified,
    regulatoryEvidenceStatus,
    legalCompliance: 'not_determined',
    ...(provenanceVerification?.traceId ? { traceId: provenanceVerification.traceId } : {}),
    reason,
    reasonCodes,
    warnings,
    failures,
    customerResponsibilities: CUSTOMER_RESPONSIBILITIES,
    ...(provenanceVerification == null ? {} : { provenanceVerification }),
    ...(evidencePackVerification == null ? {} : { evidencePackVerification }),
  }
}

function resolveVerificationScope(input: VerifyRegulatoryEvidenceInput): AuthenChainRegulatoryVerificationScope {
  if (input.verificationScope) return input.verificationScope
  if (input.provenance != null && input.evidencePack != null) return 'combined'
  if (input.provenance != null) return 'provenance'
  if (input.evidencePack != null) return 'evidence_pack'
  throw new AuthenChainValidationError({
    message: 'AuthenChain.verifyRegulatoryEvidence requires provenance or evidencePack',
    code: 'INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT',
  })
}

function validateRequestedInputs(
  input: VerifyRegulatoryEvidenceInput,
  verificationScope: AuthenChainRegulatoryVerificationScope
) {
  if (shouldVerifyProvenance(verificationScope)) {
    if (input.provenance == null) {
      throw new AuthenChainValidationError({
        message: 'AuthenChain.verifyRegulatoryEvidence requires provenance for provenance verification',
        code: 'INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT',
      })
    }
    if (!input.content && !input.contentHash) {
      throw new AuthenChainValidationError({
        message: 'AuthenChain.verifyRegulatoryEvidence requires content or contentHash for provenance verification',
        code: 'INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT',
        details: {
          hasContent: Boolean(input.content),
          hasContentHash: Boolean(input.contentHash),
        },
      })
    }
  }

  if (shouldVerifyEvidencePack(verificationScope) && input.evidencePack == null) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.verifyRegulatoryEvidence requires evidencePack for Evidence Pack verification',
      code: 'INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT',
    })
  }
}

function shouldVerifyProvenance(scope: AuthenChainRegulatoryVerificationScope) {
  return scope === 'provenance' || scope === 'combined'
}

function shouldVerifyEvidencePack(scope: AuthenChainRegulatoryVerificationScope) {
  return scope === 'evidence_pack' || scope === 'combined'
}

function resolveRegulatoryEvidenceStatus(params: {
  verificationScope: AuthenChainRegulatoryVerificationScope
  provenanceMetadata?: unknown
  provenanceVerification?: VerifyResponse
  evidencePackVerification?: VerifyEvidencePackResponse
  provenanceVerified: boolean | null
  evidencePackVerified: boolean | null
}): AuthenChainRegulatoryEvidenceStatus {
  if (params.provenanceVerification && params.provenanceVerified === false) return 'invalid'

  if (params.evidencePackVerification) {
    const evidencePackStatus = extractEvidencePackRegulatoryStatus(params.evidencePackVerification)
    if (params.evidencePackVerified === false && evidencePackStatus === 'not_applicable') return 'invalid'
    if (evidencePackStatus) return evidencePackStatus
  }

  if (params.provenanceVerification) {
    return deriveProvenanceRegulatoryStatus(params.provenanceMetadata)
  }

  return 'not_applicable'
}

function deriveProvenanceRegulatoryStatus(provenanceMetadata: unknown): AuthenChainRegulatoryEvidenceStatus {
  const metadata = asRecord(provenanceMetadata)
  const regulatory = metadata?.regulatory
  if (regulatory == null) return 'not_applicable'
  const validation = validateRegulatoryMetadata(regulatory)
  if (!validation.valid) return 'invalid'
  return validation.warnings.length > 0 ? 'incomplete' : 'complete'
}

function extractEvidencePackRegulatoryStatus(
  evidencePackVerification: VerifyEvidencePackResponse
): AuthenChainRegulatoryEvidenceStatus | null {
  const conclusion = asRecord(evidencePackVerification.verificationConclusion)
  const conclusionStatus = statusValue(conclusion?.regulatoryEvidenceStatus)
  if (conclusionStatus) return conclusionStatus

  const summary = asRecord(evidencePackVerification.regulatoryEvidenceSummary)
  const summaryStatus = statusValue(summary?.status)
  if (summaryStatus) return summaryStatus

  return statusValue(evidencePackVerification.regulatoryEvidenceStatus)
}

function statusValue(value: unknown): AuthenChainRegulatoryEvidenceStatus | null {
  if (value === 'not_applicable' || value === 'complete' || value === 'incomplete' || value === 'invalid') {
    return value
  }
  return null
}

function resolveReason(
  provenanceVerification: VerifyResponse | undefined,
  evidencePackVerification: VerifyEvidencePackResponse | undefined,
  failures: string[]
) {
  if (failures.length > 0) return failures.join('; ')
  if (provenanceVerification?.reason) return provenanceVerification.reason
  const conclusion = asRecord(evidencePackVerification?.verificationConclusion)
  return typeof conclusion?.reason === 'string' ? conclusion.reason : null
}

function extractStringArray(value: unknown, key: string): string[] {
  const record = asRecord(value)
  const field = record?.[key]
  return Array.isArray(field) ? field.filter((item): item is string => typeof item === 'string') : []
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
