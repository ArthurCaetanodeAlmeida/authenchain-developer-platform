import { createHash } from 'node:crypto'
import { attachAiInventoryBindingToMetadata } from './ai-inventory.js'
import { AuthenChainValidationError } from './errors.js'
import { validateRegulatoryMetadata } from './regulatory-metadata.js'
import type {
  CaptureGenerationInput,
  CaptureGenerationResponse,
  CaptureRegulatedOutputInput,
  CaptureRegulatedOutputResponse,
  ExportEvidencePackInput,
  ExportEvidencePackResponse,
  MetadataInput,
  ProvenanceMetadata,
  SignInput,
  SignResponse,
  VerifyEvidencePackInput,
  VerifyEvidencePackResponse,
  VerifyInput,
  VerifyRegulatoryEvidenceInput,
  VerifyRegulatoryEvidenceResponse,
  VerifyResponse,
  WrapGenerationCallbackResult,
  WrapGenerationInput,
  WrapGenerationOutputFromResult,
  WrapGenerationResponse,
} from './types.js'

const MOCK_SIGNED_AT = '2026-01-01T00:00:00.000Z'
const MOCK_KEY_ID = 'mock_key_local'
const MOCK_ALGORITHM = 'MOCK-SHA256'
const MOCK_WARNING = 'Mock mode output is not externally trustworthy evidence.'

export async function mockSign(input: SignInput): Promise<SignResponse> {
  const contentHash = resolveContentHash(input)
  const metadataInput = input.aiInventory
    ? attachAiInventoryBindingToMetadata(input.metadata, input.aiInventory)
    : input.metadata
  const metadata = normalizeMockMetadata(metadataInput, contentHash)
  const signature = mockSignature(contentHash, metadata)
  const rawResponse = {
    trace_id: metadata.trace_id,
    content_hash: contentHash,
    metadata,
    signature,
    public_key_id: MOCK_KEY_ID,
    kid: MOCK_KEY_ID,
    algorithm: MOCK_ALGORITHM,
    signed_at: MOCK_SIGNED_AT,
    disclaimer: MOCK_WARNING,
    environment: 'mock',
    mock: true,
  }

  return {
    ...rawResponse,
    traceId: rawResponse.trace_id,
    contentHash: rawResponse.content_hash,
    publicKeyId: rawResponse.public_key_id,
    signedAt: rawResponse.signed_at,
    rawResponse,
  }
}

export async function mockVerify(input: VerifyInput): Promise<VerifyResponse> {
  const contentHash = resolveContentHash(input)
  const provenance = 'provenance' in input ? input.provenance : undefined
  const metadata = provenance?.metadata ?? ('metadata' in input ? normalizeMockMetadata(input.metadata, contentHash) : undefined)
  const signature = provenance?.signature ?? ('signature' in input ? input.signature : undefined)
  const publicKeyId = provenance?.publicKeyId ?? ('publicKeyId' in input ? input.publicKeyId : undefined)

  if (!metadata || !signature || !publicKeyId) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain mock verify requires provenance or metadata, signature, and publicKeyId',
      code: 'INVALID_MOCK_VERIFY_INPUT',
    })
  }

  const expected = mockSignature(contentHash, metadata)
  const verified = signature === expected && publicKeyId === MOCK_KEY_ID
  const reasonCodes = verified ? [] : ['mock_signature_mismatch']
  const rawResponse = {
    trace_id: metadata.trace_id,
    verified,
    reason: verified ? null : 'Mock signature verification failed.',
    content_hash: contentHash,
    origin_verified: verified,
    integrity: verified ? 'intact' as const : 'modified' as const,
    issuer_verified: verified,
    reason_codes: reasonCodes,
    verified_at: MOCK_SIGNED_AT,
    disclaimer: MOCK_WARNING,
    environment: 'mock',
    mock: true,
  }

  return {
    ...rawResponse,
    verificationScope: 'provenance',
    externalTrustAvailable: false,
    externalTrustWarning: MOCK_WARNING,
    traceId: rawResponse.trace_id,
    contentHash: rawResponse.content_hash,
    originVerified: rawResponse.origin_verified,
    issuerVerified: rawResponse.issuer_verified,
    reasonCodes,
    verifiedAt: rawResponse.verified_at,
    rawResponse,
  }
}

export async function mockCaptureGeneration<TOutput>(
  input: CaptureGenerationInput<TOutput>,
): Promise<CaptureGenerationResponse<TOutput>> {
  const content = serializeOutput(input.output, input.serializeOutput)
  const provenance = await mockSign({
    content,
    contentEncoding: input.contentEncoding,
    metadata: metadataFromCaptureGeneration(input),
    generateMetadataDefaults: true,
  })

  return {
    output: input.output,
    provenance,
  }
}

export async function mockCaptureRegulatedOutput<TOutput>(
  input: CaptureRegulatedOutputInput<TOutput>,
): Promise<CaptureRegulatedOutputResponse<TOutput>> {
  const validation = validateRegulatoryMetadata(input.regulatory)
  if (!validation.valid || !validation.regulatory) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.captureRegulatedOutput requires valid regulatory metadata',
      code: 'INVALID_REGULATORY_METADATA',
      details: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    })
  }

  const content = serializeOutput(input.output, input.serializeOutput)
  const provenance = await mockSign({
    content,
    contentEncoding: input.contentEncoding,
    metadata: {
      ...(input.schema_version == null ? {} : { schema_version: input.schema_version }),
      issuer: input.issuer,
      ...(input.content_type == null ? {} : { content_type: input.content_type }),
      ...(input.created_at == null ? {} : { created_at: input.created_at }),
      ...(input.nonce == null ? {} : { nonce: input.nonce }),
      ...(input.trace_id == null ? {} : { trace_id: input.trace_id }),
      ...(input.model == null ? {} : { model: input.model }),
      ...(input.user_ref == null ? {} : { user_ref: input.user_ref }),
      ...(input.extra == null ? {} : { extra: input.extra }),
      regulatory: validation.regulatory,
    },
    generateMetadataDefaults: true,
  })

  return {
    output: input.output,
    provenance,
    regulatory: {
      metadataValid: true,
      regulatoryEvidenceStatus: validation.warnings.length > 0 ? 'incomplete' : 'complete',
      legalCompliance: 'not_determined',
      warnings: validation.warnings,
    },
  }
}

export async function mockExportEvidencePack(input: ExportEvidencePackInput): Promise<ExportEvidencePackResponse> {
  if (!input.traceId && !input.from && !input.to) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.exportEvidencePack requires traceId, from, or to',
      code: 'INVALID_EXPORT_EVIDENCE_PACK_INPUT',
    })
  }

  const traceId = input.traceId ?? `mock_trace_${digest(`${input.from ?? ''}:${input.to ?? ''}`).slice(0, 16)}`
  const response = mockEvidencePackResponse({
    traceId,
    source: 'export',
    status: 'incomplete',
    authenticityStatus: 'not_authenchain_issued',
    trustedStatus: 'incomplete',
    reason: MOCK_WARNING,
  })

  return {
    ...response,
    rawResponse: response,
  } as ExportEvidencePackResponse
}

export async function mockVerifyEvidencePack(input: VerifyEvidencePackInput): Promise<VerifyEvidencePackResponse> {
  if (input.evidencePack == null) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.verifyEvidencePack requires evidencePack',
      code: 'INVALID_VERIFY_EVIDENCE_PACK_INPUT',
    })
  }

  const pack = asRecord(input.evidencePack)
  const tampered = pack?.mockTampered === true || asRecord(pack?.evidenceEnvelope)?.tampered === true
  const response = mockEvidencePackResponse({
    traceId: typeof pack?.traceId === 'string' ? pack.traceId : 'mock_trace_evidence_pack',
    source: 'verify',
    status: tampered ? 'failed' : 'incomplete',
    authenticityStatus: tampered ? 'invalid_envelope' : 'not_authenchain_issued',
    trustedStatus: tampered ? 'failed' : 'incomplete',
    reason: tampered ? 'Mock Evidence Pack envelope is invalid.' : MOCK_WARNING,
    failures: tampered ? ['invalid_mock_evidence_pack_envelope'] : [],
    warnings: tampered ? [] : [MOCK_WARNING],
  })

  return {
    ...response,
    rawResponse: response,
  } as VerifyEvidencePackResponse
}

export async function mockVerifyRegulatoryEvidence(
  input: VerifyRegulatoryEvidenceInput,
): Promise<VerifyRegulatoryEvidenceResponse> {
  const verificationScope = input.verificationScope
    ?? (input.provenance && input.evidencePack ? 'combined' : input.provenance ? 'provenance' : input.evidencePack ? 'evidence_pack' : null)

  if (!verificationScope) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.verifyRegulatoryEvidence requires provenance or evidencePack',
      code: 'INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT',
    })
  }

  const provenanceVerification = verificationScope === 'provenance' || verificationScope === 'combined'
    ? await mockVerify({
        ...(input.content != null ? { content: input.content } : { contentHash: input.contentHash }),
        ...(input.contentEncoding == null ? {} : { contentEncoding: input.contentEncoding }),
        provenance: input.provenance!,
      })
    : undefined
  const evidencePackVerification = verificationScope === 'evidence_pack' || verificationScope === 'combined'
    ? await mockVerifyEvidencePack({
        evidencePack: input.evidencePack,
        ...(input.contentEvidenceByProofIndex == null ? {} : { contentEvidenceByProofIndex: input.contentEvidenceByProofIndex }),
      })
    : undefined
  const provenanceVerified = provenanceVerification == null ? null : provenanceVerification.verified
  const evidencePackVerified = evidencePackVerification == null
    ? null
    : evidencePackVerification.trustedStatus === 'trusted' && evidencePackVerification.externallyTrustworthy === true
  const failures = [
    ...(provenanceVerified === false ? ['provenance_verification_failed'] : []),
    ...(evidencePackVerified === false ? ['evidence_pack_verification_failed'] : []),
  ]

  return {
    schemaVersion: 'authenchain.regulatory-verification.v1',
    verificationScope,
    environment: 'mock',
    provenanceVerified,
    evidencePackVerified,
    regulatoryEvidenceStatus: failures.length > 0 ? 'invalid' : 'incomplete',
    legalCompliance: 'not_determined',
    ...(provenanceVerification?.traceId ? { traceId: provenanceVerification.traceId } : {}),
    reason: failures.length > 0 ? failures.join('; ') : MOCK_WARNING,
    reasonCodes: failures,
    warnings: [MOCK_WARNING],
    failures,
    customerResponsibilities: [
      'Mock mode is for tests, demos, local CI, examples, and harness simulations only.',
      'Do not treat mock mode output as externally trusted regulatory evidence.',
    ],
    ...(provenanceVerification == null ? {} : { provenanceVerification }),
    ...(evidencePackVerification == null ? {} : { evidencePackVerification }),
    mock: true,
  }
}

export async function mockWrapGeneration<
  TResult = WrapGenerationCallbackResult,
  TOutput = WrapGenerationOutputFromResult<TResult>,
>(
  input: WrapGenerationInput<TResult, TOutput>,
): Promise<WrapGenerationResponse<TResult, TOutput>> {
  const run = input.run ?? input.generate
  if (!run) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.wrapGeneration requires run or generate',
      code: 'INVALID_WRAP_INPUT',
    })
  }
  const result = await run()
  const output = input.mapOutput ? await input.mapOutput(result) : defaultWrapOutput(result) as TOutput
  const content = serializeOutput(output, input.serializeOutput)
  const provenance = await mockSign({
    content,
    contentEncoding: input.contentEncoding,
    metadata: metadataFromWrapGeneration(input),
    generateMetadataDefaults: true,
  })

  return {
    result,
    output,
    provenance,
  }
}

function metadataFromCaptureGeneration<TOutput>(input: CaptureGenerationInput<TOutput>): MetadataInput {
  const {
    output: _output,
    serializeOutput: _serializeOutput,
    contentEncoding: _contentEncoding,
    generateMetadataDefaults: _generateMetadataDefaults,
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...metadata
  } = input
  return metadata
}

function metadataFromWrapGeneration<TResult, TOutput>(input: WrapGenerationInput<TResult, TOutput>): MetadataInput {
  const {
    run: _run,
    generate: _generate,
    mapOutput: _mapOutput,
    serializeOutput: _serializeOutput,
    contentEncoding: _contentEncoding,
    generateMetadataDefaults: _generateMetadataDefaults,
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...metadata
  } = input
  return metadata
}

function normalizeMockMetadata(input: MetadataInput | ProvenanceMetadata, contentHash: string): ProvenanceMetadata {
  if (!isRecord(input) || typeof input.issuer !== 'string' || !input.issuer.trim()) {
    throw new AuthenChainValidationError({
      message: 'metadata.issuer must be a non-empty string',
      code: 'INVALID_METADATA',
    })
  }
  const traceId = typeof input.trace_id === 'string' && input.trace_id.trim()
    ? input.trace_id.trim()
    : `mock_trace_${digest(`${input.issuer}:${contentHash}`).slice(0, 16)}`
  return {
    schema_version: input.schema_version ?? '1.0',
    issuer: input.issuer.trim(),
    content_type: input.content_type ?? 'text',
    created_at: input.created_at ?? MOCK_SIGNED_AT,
    nonce: input.nonce ?? digest(`nonce:${traceId}`).slice(0, 32),
    trace_id: traceId,
    ...(input.model == null ? {} : { model: input.model }),
    ...(input.user_ref == null ? {} : { user_ref: input.user_ref }),
    ...(input.extra == null ? {} : { extra: input.extra }),
    ...(input.regulatory == null ? {} : { regulatory: input.regulatory }),
  }
}

function resolveContentHash(input: { content?: string; contentHash?: string; contentEncoding?: string }) {
  if (input.contentHash) return input.contentHash
  if (input.content == null) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain mock mode requires content or contentHash',
      code: 'INVALID_MOCK_INPUT',
    })
  }
  const content = input.contentEncoding === 'base64'
    ? Buffer.from(input.content, 'base64')
    : Buffer.from(input.content, 'utf8')
  return createHash('sha256').update(content).digest('hex')
}

function mockSignature(contentHash: string, metadata: ProvenanceMetadata) {
  return `mock_sig_${digest(`${contentHash}:${stableStringify(metadata)}`).slice(0, 48)}`
}

function mockEvidencePackResponse({
  traceId,
  source,
  status,
  authenticityStatus,
  trustedStatus,
  reason,
  warnings = [MOCK_WARNING],
  failures = [],
}: {
  traceId: string
  source: 'export' | 'verify'
  status: 'incomplete' | 'failed'
  authenticityStatus: 'not_authenchain_issued' | 'invalid_envelope'
  trustedStatus: 'incomplete' | 'failed'
  reason: string
  warnings?: string[]
  failures?: string[]
}) {
  return {
    status: trustedStatus,
    internalProofStatus: status,
    authenticityStatus,
    trustedStatus,
    externallyTrustworthy: false,
    verificationConclusion: {
      internalProofStatus: status,
      authenticityStatus,
      trustedStatus,
      externallyTrustworthy: false,
      regulatoryEvidenceStatus: failures.length > 0 ? 'invalid' : 'not_applicable',
      reason,
    },
    regulatoryEvidenceSummary: {
      status: failures.length > 0 ? 'invalid' : 'not_applicable',
      warnings,
      failures,
    },
    proofs: [
      {
        proofId: `mock_proof_${digest(traceId).slice(0, 12)}`,
        traceId,
        environment: 'mock',
        mock: true,
      },
    ],
    evidenceEnvelope: {
      signingKeyId: MOCK_KEY_ID,
      environment: 'mock',
      mock: true,
    },
    environment: 'mock',
    mock: true,
    mockSource: source,
    warnings,
    failures,
  }
}

function serializeOutput<TOutput>(output: TOutput, serializeOutput?: (output: TOutput) => string) {
  if (serializeOutput) {
    const serialized = serializeOutput(output)
    if (typeof serialized !== 'string') {
      throw new AuthenChainValidationError({
        message: 'Mock serializeOutput must return a string',
        code: 'INVALID_SERIALIZER_OUTPUT',
      })
    }
    return serialized
  }
  return typeof output === 'string' ? output : JSON.stringify(output)
}

function defaultWrapOutput<TResult>(result: TResult) {
  if (typeof result === 'string') return result
  if (isRecord(result) && typeof result.output === 'string') return result.output
  return result
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}
