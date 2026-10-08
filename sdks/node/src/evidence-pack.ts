import { AuthenChainValidationError } from './errors.js'
import {
  assertNoUnknownKeys,
  ensureResponseObject,
  requireBooleanField,
  requireStringField,
} from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  AuthenChainRegulatoryEvidenceStatus,
  EvidencePackAuthenticityStatus,
  EvidencePackProofStatus,
  EvidencePackTrustedStatus,
  ExportEvidencePackInput,
  ExportEvidencePackResponse,
  RegulatoryEvidencePackSummary,
  VerifyEvidencePackInput,
  VerifyEvidencePackResponse,
} from './types.js'

export async function exportEvidencePack(
  client: AuthenChainHttpClient,
  input: ExportEvidencePackInput
): Promise<ExportEvidencePackResponse> {
  assertNoUnknownKeys(
    input,
    ['traceId', 'from', 'to', 'limit', 'idempotencyKey', 'requestId', 'correlationId', 'signal', 'approvalRequestId', 'mutationReason'],
    'AuthenChain.exportEvidencePack input',
    client.strictInputValidation
  )
  if (!input.traceId && !input.from && !input.to) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.exportEvidencePack requires traceId, from, or to',
      code: 'INVALID_EXPORT_EVIDENCE_PACK_INPUT',
    })
  }
  if (client.retryAttempts() > 1 && !input.idempotencyKey) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.exportEvidencePack requires idempotencyKey when retries are enabled',
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    })
  }

  const { data } = await client.get<ExportEvidencePackResponse>(
    '/api/provenance/evidence-pack',
    {
      traceId: normalizeOptionalString(input.traceId),
      from: normalizeOptionalDate(input.from),
      to: normalizeOptionalDate(input.to),
      limit: input.limit,
    },
    input,
    validateExportEvidencePackResponse
  )

  return data
}

export async function verifyEvidencePack(
  client: AuthenChainHttpClient,
  input: VerifyEvidencePackInput
): Promise<VerifyEvidencePackResponse> {
  assertNoUnknownKeys(
    input,
    ['evidencePack', 'contentEvidenceByProofIndex', 'idempotencyKey', 'requestId', 'correlationId', 'signal', 'approvalRequestId', 'mutationReason'],
    'AuthenChain.verifyEvidencePack input',
    client.strictInputValidation
  )
  if (input.evidencePack == null) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.verifyEvidencePack requires evidencePack',
      code: 'INVALID_VERIFY_EVIDENCE_PACK_INPUT',
    })
  }

  const { data } = await client.post<VerifyEvidencePackResponse>(
    '/api/public/evidence/verify',
    {
      evidencePack: input.evidencePack,
      ...(input.contentEvidenceByProofIndex == null ? {} : { contentEvidenceByProofIndex: input.contentEvidenceByProofIndex }),
    },
    input,
    validateVerifyEvidencePackResponse
  )

  return data
}

export function summarizeRegulatoryEvidencePack(evidencePack: unknown): RegulatoryEvidencePackSummary {
  const record = isRecord(evidencePack) ? evidencePack : null
  if (!record) {
    throw new AuthenChainValidationError({
      message: 'summarizeRegulatoryEvidencePack requires an Evidence Pack object or verification response',
      code: 'INVALID_EVIDENCE_PACK_SUMMARY_INPUT',
    })
  }

  return {
    trustedStatus: readTrustedStatus(record.trustedStatus, 'trustedStatus'),
    authenticityStatus: readAuthenticityStatus(record.authenticityStatus, 'authenticityStatus'),
    internalProofStatus: readProofStatus(record.internalProofStatus, 'internalProofStatus'),
    externallyTrustworthy: readBoolean(record.externallyTrustworthy, 'externallyTrustworthy'),
    regulatoryEvidenceStatus: readRegulatoryEvidenceStatus(record),
    legalCompliance: 'not_determined',
    warnings: uniqueStrings([
      ...readStringArray(record.warnings),
      ...readStringArray(asRecord(record.regulatoryEvidenceSummary)?.warnings),
      ...readStringArray(record.missing).map((item) => `missing:${item}`),
    ]),
    failures: uniqueStrings([
      ...readStringArray(record.failures),
      ...readStringArray(asRecord(record.regulatoryEvidenceSummary)?.failures),
    ]),
  }
}

function normalizeOptionalString(value: unknown) {
  if (value == null) return undefined
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthenChainValidationError({
      message: 'traceId must be a non-empty string when provided',
      code: 'INVALID_EXPORT_EVIDENCE_PACK_INPUT',
    })
  }
  return value.trim()
}

function normalizeOptionalDate(value: unknown) {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    throw new AuthenChainValidationError({
      message: 'from/to must be valid ISO timestamps or Date values',
      code: 'INVALID_EXPORT_EVIDENCE_PACK_INPUT',
    })
  }
  return date.toISOString()
}

function validateExportEvidencePackResponse(payload: unknown, response: Response): ExportEvidencePackResponse {
  const record = ensureResponseObject(payload, {
    endpoint: '/api/provenance/evidence-pack',
    status: response.status,
    headers: response.headers,
  })
  requireTrustFields(record, '/api/provenance/evidence-pack', response)

  return {
    ...record,
    rawResponse: record,
  } as ExportEvidencePackResponse
}

function validateVerifyEvidencePackResponse(payload: unknown, response: Response): VerifyEvidencePackResponse {
  const record = ensureResponseObject(payload, {
    endpoint: '/api/public/evidence/verify',
    status: response.status,
    headers: response.headers,
  })
  requireTrustFields(record, '/api/public/evidence/verify', response)

  return {
    ...record,
    rawResponse: record,
  } as VerifyEvidencePackResponse
}

function requireTrustFields(record: Record<string, unknown>, endpoint: string, response: Response) {
  requireProofStatus(record.internalProofStatus, 'internalProofStatus', endpoint, response)
  requireAuthenticityStatus(record.authenticityStatus, 'authenticityStatus', endpoint, response)
  requireTrustedStatus(record.trustedStatus, 'trustedStatus', endpoint, response)
  requireBooleanField(record.externallyTrustworthy, 'externallyTrustworthy', {
    endpoint,
    status: response.status,
    payload: record,
    headers: response.headers,
  })

  const conclusion = ensureResponseObject(record.verificationConclusion, {
    endpoint,
    status: response.status,
    headers: response.headers,
  })
  requireProofStatus(conclusion.internalProofStatus, 'verificationConclusion.internalProofStatus', endpoint, response)
  requireAuthenticityStatus(conclusion.authenticityStatus, 'verificationConclusion.authenticityStatus', endpoint, response)
  requireTrustedStatus(conclusion.trustedStatus, 'verificationConclusion.trustedStatus', endpoint, response)
  requireBooleanField(conclusion.externallyTrustworthy, 'verificationConclusion.externallyTrustworthy', {
    endpoint,
    status: response.status,
    payload: record,
    headers: response.headers,
  })
  requireStringField(conclusion.reason, 'verificationConclusion.reason', {
    endpoint,
    status: response.status,
    payload: record,
    headers: response.headers,
  })
}

function requireProofStatus(value: unknown, field: string, endpoint: string, response: Response): EvidencePackProofStatus {
  if (value === 'complete' || value === 'incomplete' || value === 'failed' || value === 'no_records') return value
  throwMalformedTrustField(field, endpoint, response)
}

function requireAuthenticityStatus(value: unknown, field: string, endpoint: string, response: Response): EvidencePackAuthenticityStatus {
  if (
    value === 'authenchain_issued' ||
    value === 'missing_envelope' ||
    value === 'invalid_envelope' ||
    value === 'unknown_signing_key' ||
    value === 'not_authenchain_issued'
  ) return value
  throwMalformedTrustField(field, endpoint, response)
}

function requireTrustedStatus(value: unknown, field: string, endpoint: string, response: Response): EvidencePackTrustedStatus {
  if (value === 'trusted' || value === 'untrusted' || value === 'failed' || value === 'incomplete' || value === 'no_records') return value
  throwMalformedTrustField(field, endpoint, response)
}

function throwMalformedTrustField(field: string, endpoint: string, response: Response): never {
  throw new AuthenChainValidationError({
    message: `AuthenChain returned a malformed response for ${endpoint}: invalid ${field}`,
    status: response.status,
    code: 'MALFORMED_RESPONSE',
  })
}

function readProofStatus(value: unknown, field: string): EvidencePackProofStatus {
  if (value === 'complete' || value === 'incomplete' || value === 'failed' || value === 'no_records') return value
  throwInvalidSummaryField(field)
}

function readAuthenticityStatus(value: unknown, field: string): EvidencePackAuthenticityStatus {
  if (
    value === 'authenchain_issued' ||
    value === 'missing_envelope' ||
    value === 'invalid_envelope' ||
    value === 'unknown_signing_key' ||
    value === 'not_authenchain_issued'
  ) return value
  throwInvalidSummaryField(field)
}

function readTrustedStatus(value: unknown, field: string): EvidencePackTrustedStatus {
  if (value === 'trusted' || value === 'untrusted' || value === 'failed' || value === 'incomplete' || value === 'no_records') return value
  throwInvalidSummaryField(field)
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value
  throwInvalidSummaryField(field)
}

function readRegulatoryEvidenceStatus(record: Record<string, unknown>): AuthenChainRegulatoryEvidenceStatus {
  const conclusion = asRecord(record.verificationConclusion)
  const conclusionStatus = regulatoryEvidenceStatusValue(conclusion?.regulatoryEvidenceStatus)
  if (conclusionStatus) return conclusionStatus

  const summary = asRecord(record.regulatoryEvidenceSummary)
  const summaryStatus = regulatoryEvidenceStatusValue(summary?.status)
  if (summaryStatus) return summaryStatus

  const topLevelStatus = regulatoryEvidenceStatusValue(record.regulatoryEvidenceStatus)
  if (topLevelStatus) return topLevelStatus

  return 'not_applicable'
}

function regulatoryEvidenceStatusValue(value: unknown): AuthenChainRegulatoryEvidenceStatus | null {
  if (value === 'not_applicable' || value === 'complete' || value === 'incomplete' || value === 'invalid') return value
  return null
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function throwInvalidSummaryField(field: string): never {
  throw new AuthenChainValidationError({
    message: `summarizeRegulatoryEvidencePack received invalid ${field}`,
    code: 'INVALID_EVIDENCE_PACK_SUMMARY_INPUT',
  })
}
