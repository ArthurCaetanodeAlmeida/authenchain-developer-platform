import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { AuthenChainValidationError } from './errors.js'
import {
  assertNoUnknownKeys,
  ensureJsonObject,
  ensureResponseObject,
  extractResponseIdentifiers,
  requireMetadataField,
  requireStringField,
} from './internal.js'
import { prepareContentEvidenceForWire } from './content-evidence.js'
import { attachAiInventoryBindingToMetadata } from './ai-inventory.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  MetadataInput,
  ProvenanceMetadata,
  SignInput,
  SignResponse,
} from './types.js'

// Content vs hash-only guidance (R7T-015):
//   - sign({ content }):                 raw content is sent to the server over TLS.
//     Use only when the server legitimately needs the content (e.g. server-side
//     content hashing or evidence capture you have opted into).
//   - sign({ content, hashOnly: true }): the SDK hashes locally and sends ONLY the
//     hash. Recommended for sensitive content - the raw content never leaves your
//     process.
//   - signWithContentHash({ contentHash }): you already have a SHA-256 hex digest;
//     the SDK sends only the hash (no content at all).
export async function signProvenance(client: AuthenChainHttpClient, input: SignInput): Promise<SignResponse> {
  assertNoUnknownKeys(
    input,
    [
      'content',
      'contentHash',
      'hashOnly',
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
      'idempotencyKey',
      'requestId',
      'correlationId',
      'signal',
  'approvalRequestId',
  'mutationReason',
    ],
    'AuthenChain.sign input',
    client.strictInputValidation
  )
  if (!input.content && !input.contentHash) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.sign requires content or contentHash',
      code: 'INVALID_SIGN_INPUT',
      details: {
        hasContent: Boolean(input.content),
        hasContentHash: Boolean(input.contentHash),
      },
    })
  }

  // R7T-015: hash-only mode. When the caller opts in and supplies raw content, the
  // SDK computes the SHA-256 locally and sends only the hash - the raw content is
  // never placed on the wire.
  let wireContent = input.content
  let wireContentHash = input.contentHash
  if (input.hashOnly === true && input.content != null) {
    wireContentHash = createHash('sha256')
      .update(Buffer.from(input.content, input.contentEncoding ?? 'utf8'))
      .digest('hex')
    wireContent = undefined
  }

  const metadata = prepareMetadataForWire(input.metadata, {
    strictInputValidation: client.strictInputValidation,
    generateMetadataDefaults: input.generateMetadataDefaults === true,
  })
  const metadataWithAiInventory = input.aiInventory
    ? attachAiInventoryBindingToMetadata(metadata, input.aiInventory)
    : metadata
  const contentEvidence = prepareContentEvidenceForWire(input.contentEvidence, 'contentEvidence')
  const operationIdempotencyKey = input.idempotencyKey?.trim() || `sign:${randomUUID()}`
  const { data } = await client.post<SignResponse>(
    '/api/provenance/sign',
    {
      ...(wireContent != null ? { content: wireContent } : { content_hash: wireContentHash }),
      ...(input.contentEncoding && wireContent != null ? { content_encoding: input.contentEncoding } : {}),
      ...(contentEvidence ? { contentEvidence } : {}),
      ...(input.aiUseCaseId ? { aiUseCaseId: input.aiUseCaseId } : {}),
      ...(input.riskClassificationId ? { riskClassificationId: input.riskClassificationId } : {}),
      ...(input.impactAssessmentId ? { impactAssessmentId: input.impactAssessmentId } : {}),
      ...(input.impactAssessmentHash ? { impactAssessmentHash: input.impactAssessmentHash } : {}),
      ...(input.impactAssessmentGate ? { impactAssessmentGate: input.impactAssessmentGate } : {}),
      ...(input.riskContext ? { riskContext: input.riskContext } : {}),
      metadata: metadataWithAiInventory,
    },
    { ...input, idempotencyKey: operationIdempotencyKey },
    validateSignResponse
  )

  return data
}

const CONTENT_HASH_PATTERN = /^[0-9a-f]{64}$/i

export type SignWithContentHashInput = Omit<SignInput, 'content' | 'contentHash' | 'hashOnly' | 'contentEncoding'> & {
  contentHash: string
}

// R7T-015: sign a pre-computed SHA-256 content hash. The raw content never touches
// the SDK or the wire - the caller hashes in their own environment and passes the
// 64-char hex digest. This is the maximum-privacy signing path.
export async function signWithContentHash(
  client: AuthenChainHttpClient,
  input: SignWithContentHashInput
): Promise<SignResponse> {
  const contentHash = typeof input.contentHash === 'string' ? input.contentHash.trim() : ''
  if (!CONTENT_HASH_PATTERN.test(contentHash)) {
    throw new AuthenChainValidationError({
      message: 'signWithContentHash requires contentHash to be a 64-character hex SHA-256 digest',
      code: 'INVALID_CONTENT_HASH',
      details: { contentHash: contentHash ? 'invalid_format' : 'missing' },
    })
  }
  const { contentHash: _contentHash, ...rest } = input
  return signProvenance(client, { ...rest, contentHash } as SignInput)
}

export function prepareMetadataForWire(
  input: MetadataInput | ProvenanceMetadata,
  options: { strictInputValidation?: boolean; generateMetadataDefaults?: boolean } = {}
): ProvenanceMetadata {
  const metadata = ensureJsonObject(input, 'metadata') as unknown as Record<string, unknown>
  assertNoUnknownMetadataKeys(metadata, options.strictInputValidation !== false)
  if (typeof metadata.issuer !== 'string' || metadata.issuer.length === 0) {
    throw new AuthenChainValidationError({
      message: 'metadata.issuer must be a non-empty string',
      code: 'INVALID_METADATA',
      details: { field: 'metadata.issuer' },
    })
  }
  if (metadata.extra != null && !isRecord(metadata.extra)) {
    throw new AuthenChainValidationError({
      message: 'metadata.extra must be a JSON object when provided',
      code: 'INVALID_METADATA',
      details: { field: 'metadata.extra' },
    })
  }
  if (!options.generateMetadataDefaults) return metadata as unknown as ProvenanceMetadata

  const generatedFields: string[] = []
  const withDefaults: Record<string, unknown> = { ...metadata }
  if (withDefaults.schema_version == null) {
    withDefaults.schema_version = '1.0'
    generatedFields.push('schema_version')
  }
  if (withDefaults.content_type == null) {
    withDefaults.content_type = 'text'
    generatedFields.push('content_type')
  }
  if (withDefaults.created_at == null) {
    withDefaults.created_at = new Date().toISOString()
    generatedFields.push('created_at')
  }
  if (withDefaults.nonce == null) {
    withDefaults.nonce = randomBytes(16).toString('hex')
    generatedFields.push('nonce')
  }
  if (withDefaults.trace_id == null) {
    withDefaults.trace_id = randomUUID()
    generatedFields.push('trace_id')
  }
  if (generatedFields.length > 0) {
    const extra = isRecord(withDefaults.extra) ? { ...withDefaults.extra } : {}
    if (extra.source == null) extra.source = 'authenchain-node-sdk'
    if (extra.notes == null) {
      extra.notes = `AuthenChain Node SDK generated metadata fields: ${generatedFields.join(', ')}`
    }
    withDefaults.extra = extra
  }
  return withDefaults as unknown as ProvenanceMetadata
}

function validateSignResponse(payload: unknown, response: Response): SignResponse {
  const identifiers = extractResponseIdentifiers(response.headers, payload)
  const record = ensureResponseObject(payload, {
    endpoint: '/api/provenance/sign',
    status: response.status,
    requestId: identifiers.requestId,
    traceId: identifiers.traceId,
    headers: response.headers,
  })

  const rawResponse = record as unknown as SignResponse['rawResponse']
  return {
    ...rawResponse,
    traceId: requireStringField(record.trace_id, 'trace_id', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    contentHash: requireStringField(record.content_hash, 'content_hash', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    metadata: requireMetadataField(record.metadata, 'metadata', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    signature: requireStringField(record.signature, 'signature', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    publicKeyId: requireStringField(record.public_key_id, 'public_key_id', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    kid: requireStringField(record.kid, 'kid', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    algorithm: requireStringField(record.algorithm, 'algorithm', {
      endpoint: '/api/provenance/sign',
      status: response.status,
      requestId: identifiers.requestId,
      traceId: identifiers.traceId,
      payload,
      headers: response.headers,
    }),
    signedAt: requireStringField(record.signed_at, 'signed_at', {
      endpoint: '/api/provenance/sign',
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
            endpoint: '/api/provenance/sign',
            status: response.status,
            requestId: identifiers.requestId,
            traceId: identifiers.traceId,
            payload,
            headers: response.headers,
          }),
    rawResponse,
  }
}

function assertNoUnknownMetadataKeys(value: Record<string, unknown>, enabled: boolean) {
  if (!enabled) return
  const allowed = new Set(['schema_version', 'assurance', 'issuer', 'content_type', 'created_at', 'nonce', 'trace_id', 'model', 'user_ref', 'extra', 'regulatory'])
  const unknown = Object.keys(value).filter((key) => !allowed.has(key))
  if (unknown.length > 0) {
    throw new AuthenChainValidationError({
      message: `metadata contains unsupported field(s): ${unknown.join(', ')}. Use backend wire keys (content_type, created_at, trace_id, user_ref) and put custom metadata under metadata.extra.`,
      code: 'UNKNOWN_FIELD',
      details: { context: 'metadata', unknownFields: unknown },
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
