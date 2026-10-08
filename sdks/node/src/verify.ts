import { AuthenChainValidationError } from './errors.js'
import {
  assertNoUnknownKeys,
  ensureResponseObject,
  extractResponseIdentifiers,
  requireBooleanField,
  requireNullableStringField,
  requireStringArrayField,
  requireStringField,
  sanitizeForDiagnostics,
} from './internal.js'
import { prepareMetadataForWire } from './sign.js'
import { prepareContentEvidenceForWire } from './content-evidence.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  VerifyInput,
  VerifyInputWithFields,
  VerifyInputWithProvenance,
  VerifyResponse,
} from './types.js'

export async function verifyProvenance(client: AuthenChainHttpClient, input: VerifyInput): Promise<VerifyResponse> {
  assertNoUnknownKeys(
    input,
    ['content', 'contentHash', 'contentEncoding', 'contentEvidence', 'metadata', 'signature', 'publicKeyId', 'provenance', 'generateMetadataDefaults', 'idempotencyKey', 'requestId', 'correlationId', 'signal'],
    'AuthenChain.verify input',
    client.strictInputValidation
  )
  const body = 'provenance' in input ? fromProvenanceInput(input) : fromFieldsInput(input, client.strictInputValidation)
  const { data } = await client.post<VerifyResponse>(
    '/api/provenance/verify',
    body,
    input,
    validateVerifyResponse
  )
  return data
}

function fromFieldsInput(input: VerifyInputWithFields, strictInputValidation: boolean) {
  if (!input.content && !input.contentHash) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.verify requires content or contentHash',
      code: 'INVALID_VERIFY_INPUT',
      details: {
        hasContent: Boolean(input.content),
        hasContentHash: Boolean(input.contentHash),
      },
    })
  }

  const contentEvidence = prepareContentEvidenceForWire(input.contentEvidence, 'contentEvidence')
  return {
    ...(input.content != null ? { content: input.content } : { content_hash: input.contentHash }),
    ...(input.contentEncoding ? { content_encoding: input.contentEncoding } : {}),
    ...(contentEvidence ? { contentEvidence } : {}),
    metadata: prepareMetadataForWire(input.metadata, {
      strictInputValidation,
      generateMetadataDefaults: input.generateMetadataDefaults === true,
    }),
    signature: input.signature,
    public_key_id: input.publicKeyId,
  }
}

function fromProvenanceInput(input: VerifyInputWithProvenance) {
  if (!input.content && !input.contentHash) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.verify requires content or contentHash',
      code: 'INVALID_VERIFY_INPUT',
      details: {
        hasContent: Boolean(input.content),
        hasContentHash: Boolean(input.contentHash),
      },
    })
  }

  const contentEvidence = prepareContentEvidenceForWire(input.contentEvidence, 'contentEvidence')
  return {
    ...(input.content != null ? { content: input.content } : { content_hash: input.contentHash }),
    ...(input.contentEncoding ? { content_encoding: input.contentEncoding } : {}),
    ...(contentEvidence ? { contentEvidence } : {}),
    metadata: input.provenance.metadata,
    signature: input.provenance.signature,
    public_key_id: input.provenance.publicKeyId,
  }
}

function validateVerifyResponse(payload: unknown, response: Response): VerifyResponse {
  const identifiers = extractResponseIdentifiers(response.headers, payload)
  const record = ensureResponseObject(payload, {
    endpoint: '/api/provenance/verify',
    status: response.status,
    requestId: identifiers.requestId,
    traceId: identifiers.traceId,
    headers: response.headers,
  })

  const rawResponse = record as unknown as VerifyResponse['rawResponse']
  return {
    ...rawResponse,
    verificationScope: 'provenance',
    externalTrustAvailable: false,
    externalTrustWarning: 'This verifies provenance integrity only. Use verifyEvidencePack(...) for external AuthenChain trust.',
    traceId: requireStringField(record.trace_id, 'trace_id', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    verified: requireBooleanField(record.verified, 'verified', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    reason: requireNullableStringField(record.reason, 'reason', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    contentHash: record.content_hash == null
      ? null
      : requireStringField(record.content_hash, 'content_hash', {
          endpoint: '/api/provenance/verify',
          status: response.status,
          requestId: identifiers.requestId,
          traceId: identifiers.traceId,
          payload,
          headers: response.headers,
        }),
    originVerified: requireBooleanField(record.origin_verified, 'origin_verified', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    integrity: requireIntegrityField(record.integrity, {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    issuerVerified: requireBooleanField(record.issuer_verified, 'issuer_verified', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    reasonCodes: requireStringArrayField(record.reason_codes, 'reason_codes', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    verifiedAt: requireStringField(record.verified_at, 'verified_at', {
      endpoint: '/api/provenance/verify',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    disclaimer:
      record.disclaimer == null
        ? undefined
        : requireStringField(record.disclaimer, 'disclaimer', {
            endpoint: '/api/provenance/verify',
            status: response.status,
            requestId: identifiers.requestId,
            traceId: identifiers.traceId,
            payload,
            headers: response.headers,
          }),
    contentEvidenceVerification: record.contentEvidenceVerification,
    rawResponse,
  }
}

function requireIntegrityField(
  value: unknown,
  context: {
    endpoint: string
    status?: number
    requestId?: string
    traceId?: string
    payload?: unknown
    headers?: Headers
  }
): VerifyResponse['integrity'] {
  if (value === 'intact' || value === 'modified' || value === 'unknown') {
    return value
  }

  // PHASE3-SDK-001: route the raw server payload + headers through the
  // SDK's default-deny sanitizer so a malformed response from a broken
  // backend, a compromised proxy, or a test env cannot dump the
  // contentEvidence / encryptedDek / signature / cookie / authorization
  // fields into the thrown error. Other malformed-response throw sites
  // in `internal.ts` already use sanitizeForDiagnostics; this was the
  // only remaining raw-payload echo.
  throw new AuthenChainValidationError({
    message: `AuthenChain returned a malformed response for ${context.endpoint}: invalid integrity`,
    status: context.status,
    code: 'MALFORMED_RESPONSE',
    requestId: context.requestId,
    traceId: context.traceId,
    details: sanitizeForDiagnostics(context.payload),
    headers: context.headers
      ? (sanitizeForDiagnostics(headersToObject(context.headers)) as Record<string, string>)
      : undefined,
  })
}

function headersToObject(headers: Headers) {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}
