import type { RegulatoryMetadataV1 } from './types.js'

export const REGULATORY_METADATA_SCHEMA_VERSION = 'regulatory.v1' as const

export const REGULATORY_METADATA_JURISDICTIONS = ['EU', 'BR', 'US', 'GLOBAL'] as const
export const REGULATORY_METADATA_CONTENT_TYPES = ['text', 'image', 'audio', 'video', 'document', 'json'] as const
export const REGULATORY_METADATA_RISK_CONTEXTS = ['low', 'limited', 'high', 'unknown'] as const
export const REGULATORY_METADATA_LABEL_TYPES = ['machine_readable', 'human_visible', 'both', 'none'] as const
// R7B-HIGH-004 / R7B-HIGH-005 (Sprint 3B-3)
export const REGULATORY_SENSITIVE_DATA_CATEGORIES = [
  'none',
  'health',
  'racial_ethnic',
  'religious_belief',
  'political_opinion',
  'union_membership',
  'philosophical_belief',
  'genetic',
  'biometric',
  'sexual_life',
  'criminal_records',
  'other_customer_declared',
] as const
export const REGULATORY_MINORS_CONSENT_BASES = [
  'parental_consent',
  'legitimate_interest_with_safeguards',
  'legal_obligation',
] as const
export const REGULATORY_LEGAL_BASES = [
  'consent',
  'legal_obligation',
  'public_administration_execution',
  'research_study',
  'contract_execution',
  'judicial_administrative_arbitral',
  'protection_of_life',
  'health_protection',
  'legitimate_interest',
  'credit_protection',
  'gdpr_vital_interests',
  'public_interest_specific_law',
  'shared_database_public_entities',
  'other_customer_documented',
] as const

export type RegulatoryMetadataIssueSeverity = 'error' | 'warning'

export interface RegulatoryMetadataValidationIssue {
  severity: RegulatoryMetadataIssueSeverity
  code: string
  path: string
  message: string
}

export interface RegulatoryMetadataValidationResult {
  valid: boolean
  regulatory?: RegulatoryMetadataV1
  errors: RegulatoryMetadataValidationIssue[]
  warnings: RegulatoryMetadataValidationIssue[]
}

const REGULATORY_METADATA_KEYS = new Set([
  'schema_version',
  'ai_generated',
  'jurisdiction',
  'regulatory_context',
  'content_type',
  'model_provider',
  'model_name',
  'model_version',
  'system_purpose',
  'risk_context',
  'human_reviewed',
  'reviewer_role',
  'review_timestamp',
  'disclosure_required',
  'disclosure_applied',
  'label_type',
  'policy_version',
  'riskContext',
  'impactAssessmentId',
  'impactAssessmentHash',
  'impactAssessmentStatus',
  'impactAssessmentApprovedAt',
  'sensitive_data_category',
  'involves_minors',
  'minors_consent_basis',
  'sensitive_data_category_detail',
  'legal_basis',
  'legal_basis_reference',
  'data_subject_category',
])

export function validateRegulatoryMetadata(input: unknown): RegulatoryMetadataValidationResult {
  const errors: RegulatoryMetadataValidationIssue[] = []
  const warnings: RegulatoryMetadataValidationIssue[] = []
  const regulatoryInput = unwrapRegulatoryMetadataInput(input, errors)

  if (!regulatoryInput) {
    return { valid: false, errors, warnings }
  }

  for (const key of Object.keys(regulatoryInput)) {
    if (!REGULATORY_METADATA_KEYS.has(key)) {
      errors.push(issue('error', 'unknown_field', `regulatory.${key}`, `regulatory.${key} is not allowed`))
    }
  }

  const normalized: Record<string, unknown> = {}

  if (regulatoryInput.schema_version !== REGULATORY_METADATA_SCHEMA_VERSION) {
    errors.push(issue(
      'error',
      'invalid_schema_version',
      'regulatory.schema_version',
      `regulatory.schema_version must be "${REGULATORY_METADATA_SCHEMA_VERSION}"`
    ))
  } else {
    normalized.schema_version = REGULATORY_METADATA_SCHEMA_VERSION
  }

  requiredBoolean(regulatoryInput, normalized, errors, 'ai_generated')
  normalizeEnum(regulatoryInput, normalized, errors, 'jurisdiction', REGULATORY_METADATA_JURISDICTIONS, 'invalid_enum')
  normalizeRegulatoryContext(regulatoryInput, normalized, errors)
  normalizeEnum(regulatoryInput, normalized, errors, 'content_type', REGULATORY_METADATA_CONTENT_TYPES, 'invalid_enum')
  requiredString(regulatoryInput, normalized, errors, 'model_provider')
  requiredString(regulatoryInput, normalized, errors, 'model_name')
  optionalString(regulatoryInput, normalized, errors, 'model_version')
  requiredString(regulatoryInput, normalized, errors, 'system_purpose')
  const riskContext = normalizeEnum(regulatoryInput, normalized, errors, 'risk_context', REGULATORY_METADATA_RISK_CONTEXTS, 'invalid_enum')
  const humanReviewed = requiredBoolean(regulatoryInput, normalized, errors, 'human_reviewed')
  optionalString(regulatoryInput, normalized, errors, 'reviewer_role')
  normalizeIsoTimestamp(regulatoryInput, normalized, errors, 'review_timestamp')
  const disclosureRequired = requiredBoolean(regulatoryInput, normalized, errors, 'disclosure_required')
  const disclosureApplied = requiredBoolean(regulatoryInput, normalized, errors, 'disclosure_applied')
  normalizeOptionalEnum(regulatoryInput, normalized, errors, 'label_type', REGULATORY_METADATA_LABEL_TYPES, 'invalid_enum')
  requiredString(regulatoryInput, normalized, errors, 'policy_version')
  optionalString(regulatoryInput, normalized, errors, 'impactAssessmentId')
  optionalString(regulatoryInput, normalized, errors, 'impactAssessmentHash')
  optionalString(regulatoryInput, normalized, errors, 'impactAssessmentStatus')
  normalizeIsoTimestamp(regulatoryInput, normalized, errors, 'impactAssessmentApprovedAt')

  // R7B-HIGH-004 / R7B-HIGH-005: sensitive-data category, minor flags, lawful basis.
  // New fields are optional and only normalized when present, so legacy payloads are
  // unchanged. Recommendations are warnings, not errors.
  const sensitiveCategory =
    normalizeOptionalEnum(
      regulatoryInput,
      normalized,
      errors,
      'sensitive_data_category',
      REGULATORY_SENSITIVE_DATA_CATEGORIES,
      'invalid_enum'
    ) ?? 'none'
  const sensitiveDetail = optionalString(
    regulatoryInput,
    normalized,
    errors,
    'sensitive_data_category_detail'
  )
  if (sensitiveCategory === 'other_customer_declared' && !sensitiveDetail) {
    errors.push(issue(
      'error',
      'required_sensitive_detail',
      'regulatory.sensitive_data_category_detail',
      'regulatory.sensitive_data_category_detail is required when regulatory.sensitive_data_category is "other_customer_declared"'
    ))
  }
  if (sensitiveCategory !== 'none') {
    const context = Array.isArray(normalized.regulatory_context)
      ? (normalized.regulatory_context as string[])
      : []
    const hasArt11 = context.some((entry) => {
      const lower = entry.toLowerCase()
      return (
        lower.includes('lgpd_art_11') ||
        lower.includes('art_11') ||
        lower.includes('sensitive_data_lgpd')
      )
    })
    if (!hasArt11) {
      warnings.push(issue(
        'warning',
        'metadata_sensitive_category_lgpd_art_11_reference_recommended',
        'regulatory.regulatory_context',
        'regulatory.sensitive_data_category is set but regulatory_context has no LGPD Art. 11 reference'
      ))
    }
  }
  let involvesMinors = false
  if (regulatoryInput.involves_minors != null) {
    if (requiredBoolean(regulatoryInput, normalized, errors, 'involves_minors') === true) {
      involvesMinors = true
    }
  }
  const consentBasis = normalizeOptionalEnum(
    regulatoryInput,
    normalized,
    errors,
    'minors_consent_basis',
    REGULATORY_MINORS_CONSENT_BASES,
    'invalid_enum'
  )
  if (involvesMinors === true && !consentBasis) {
    errors.push(issue(
      'error',
      'required_minors_consent_basis',
      'regulatory.minors_consent_basis',
      'regulatory.minors_consent_basis is required when regulatory.involves_minors is true'
    ))
  }
  const legalBasis = normalizeOptionalEnum(
    regulatoryInput,
    normalized,
    errors,
    'legal_basis',
    REGULATORY_LEGAL_BASES,
    'invalid_enum'
  )
  const legalBasisReference = optionalString(
    regulatoryInput,
    normalized,
    errors,
    'legal_basis_reference'
  )
  if (legalBasis != null && !legalBasisReference) {
    errors.push(issue(
      'error',
      'required_legal_basis_reference',
      'regulatory.legal_basis_reference',
      'regulatory.legal_basis_reference is required when regulatory.legal_basis is set'
    ))
  }
  if (legalBasis == null && regulatoryInput.legal_basis == null) {
    warnings.push(issue(
      'warning',
      'metadata_legal_basis_recommended',
      'regulatory.legal_basis',
      'regulatory.legal_basis is recommended so the lawful basis for processing is recorded'
    ))
  }
  optionalString(regulatoryInput, normalized, errors, 'data_subject_category')

  if (humanReviewed === true) {
    if (typeof regulatoryInput.reviewer_role !== 'string' || !regulatoryInput.reviewer_role.trim()) {
      errors.push(issue(
        'error',
        'required_when_human_reviewed',
        'regulatory.reviewer_role',
        'regulatory.reviewer_role is required when regulatory.human_reviewed is true'
      ))
    }
    if (typeof regulatoryInput.review_timestamp !== 'string' || !regulatoryInput.review_timestamp.trim()) {
      errors.push(issue(
        'error',
        'required_when_human_reviewed',
        'regulatory.review_timestamp',
        'regulatory.review_timestamp is required when regulatory.human_reviewed is true'
      ))
    }
  }

  if ((disclosureRequired === true || disclosureApplied === true) && regulatoryInput.label_type == null) {
    errors.push(issue(
      'error',
      'required_when_disclosure_recorded',
      'regulatory.label_type',
      'regulatory.label_type is required when regulatory.disclosure_required or regulatory.disclosure_applied is true'
    ))
  }

  if (riskContext === 'unknown') {
    warnings.push(issue(
      'warning',
      'unknown_risk_context',
      'regulatory.risk_context',
      'regulatory.risk_context is unknown; customers should classify risk through policy, backend workflow, or compliance review'
    ))
  }

  if (disclosureRequired === true && disclosureApplied === false) {
    warnings.push(issue(
      'warning',
      'required_disclosure_not_applied',
      'regulatory.disclosure_applied',
      'regulatory.disclosure_required is true but regulatory.disclosure_applied is false'
    ))
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings }
  }

  return {
    valid: true,
    regulatory: normalized as unknown as RegulatoryMetadataV1,
    errors,
    warnings,
  }
}

function unwrapRegulatoryMetadataInput(
  input: unknown,
  errors: RegulatoryMetadataValidationIssue[]
): Record<string, unknown> | null {
  if (!isPlainObject(input)) {
    errors.push(issue('error', 'invalid_type', 'regulatory', 'regulatory must be an object'))
    return null
  }

  if ('regulatory' in input) {
    if (!isPlainObject(input.regulatory)) {
      errors.push(issue('error', 'invalid_type', 'regulatory', 'regulatory must be an object'))
      return null
    }
    return input.regulatory
  }

  return input
}

function requiredString(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[],
  key: keyof RegulatoryMetadataV1
) {
  const value = input[key]
  if (typeof value !== 'string') {
    errors.push(issue('error', 'invalid_string', `regulatory.${key}`, `regulatory.${key} must be a non-empty string`))
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    errors.push(issue('error', 'invalid_string', `regulatory.${key}`, `regulatory.${key} must be a non-empty string`))
    return null
  }
  normalized[key] = trimmed
  return trimmed
}

function optionalString(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[],
  key: keyof RegulatoryMetadataV1
) {
  const value = input[key]
  if (value == null) return null
  if (typeof value !== 'string') {
    errors.push(issue('error', 'invalid_string', `regulatory.${key}`, `regulatory.${key} must be a non-empty string`))
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    errors.push(issue('error', 'invalid_string', `regulatory.${key}`, `regulatory.${key} must be a non-empty string`))
    return null
  }
  normalized[key] = trimmed
  return trimmed
}

function requiredBoolean(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[],
  key: keyof RegulatoryMetadataV1
) {
  const value = input[key]
  if (typeof value !== 'boolean') {
    errors.push(issue('error', 'invalid_boolean', `regulatory.${key}`, `regulatory.${key} must be a boolean`))
    return null
  }
  normalized[key] = value
  return value
}

function normalizeIsoTimestamp(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[],
  key: keyof RegulatoryMetadataV1
) {
  const value = input[key]
  if (value == null) return null
  if (typeof value !== 'string') {
    errors.push(issue('error', 'invalid_timestamp', `regulatory.${key}`, `regulatory.${key} must be a valid ISO timestamp`))
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    errors.push(issue('error', 'invalid_timestamp', `regulatory.${key}`, `regulatory.${key} must be a valid ISO timestamp`))
    return null
  }
  const normalizedTimestamp = parsed.toISOString()
  normalized[key] = normalizedTimestamp
  return normalizedTimestamp
}

function normalizeRegulatoryContext(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[]
) {
  const value = input.regulatory_context
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(issue(
      'error',
      'invalid_string_array',
      'regulatory.regulatory_context',
      'regulatory.regulatory_context must be a non-empty string array'
    ))
    return
  }

  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      errors.push(issue(
        'error',
        'invalid_string_array',
        'regulatory.regulatory_context',
        'regulatory.regulatory_context must be a non-empty string array'
      ))
      return
    }
    items.push(item.trim())
  }
  normalized.regulatory_context = items
}

function normalizeEnum<T extends string>(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[],
  key: keyof RegulatoryMetadataV1,
  values: readonly T[],
  code: string
) {
  const value = input[key]
  const label = stringEnumList(values)
  if (typeof value !== 'string') {
    errors.push(issue('error', code, `regulatory.${key}`, `regulatory.${key} must be ${label}`))
    return null
  }
  const trimmed = value.trim()
  if (!(values as readonly string[]).includes(trimmed)) {
    errors.push(issue('error', code, `regulatory.${key}`, `regulatory.${key} must be ${label}`))
    return null
  }
  normalized[key] = trimmed
  return trimmed as T
}

function normalizeOptionalEnum<T extends string>(
  input: Record<string, unknown>,
  normalized: Record<string, unknown>,
  errors: RegulatoryMetadataValidationIssue[],
  key: keyof RegulatoryMetadataV1,
  values: readonly T[],
  code: string
) {
  const value = input[key]
  if (value == null) return null
  const label = stringEnumList(values)
  if (typeof value !== 'string') {
    errors.push(issue('error', code, `regulatory.${key}`, `regulatory.${key} must be ${label}`))
    return null
  }
  const trimmed = value.trim()
  if (!(values as readonly string[]).includes(trimmed)) {
    errors.push(issue('error', code, `regulatory.${key}`, `regulatory.${key} must be ${label}`))
    return null
  }
  normalized[key] = trimmed
  return trimmed as T
}

function issue(
  severity: RegulatoryMetadataIssueSeverity,
  code: string,
  path: string,
  message: string
): RegulatoryMetadataValidationIssue {
  return { severity, code, path, message }
}

function stringEnumList(values: readonly string[]) {
  return values.join('|')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
