export type AuthenChainContentEncoding = 'utf8' | 'base64'

export type AuthenChainContentType = 'text' | 'image' | 'video'
export type AuthenChainRegulatoryJurisdiction = 'EU' | 'BR' | 'US' | 'GLOBAL'
export type AuthenChainRegulatoryContentType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'json'
export type AuthenChainRegulatoryRiskContext = 'low' | 'limited' | 'high' | 'unknown'
export type AuthenChainRegulatoryLabelType = 'machine_readable' | 'human_visible' | 'both' | 'none'
export type AuthenChainRegulatorySensitiveDataCategory =
  | 'none'
  | 'health'
  | 'racial_ethnic'
  | 'religious_belief'
  | 'political_opinion'
  | 'union_membership'
  | 'philosophical_belief'
  | 'genetic'
  | 'biometric'
  | 'sexual_life'
  | 'criminal_records'
  | 'other_customer_declared'
export type AuthenChainRegulatoryMinorsConsentBasis =
  | 'parental_consent'
  | 'legitimate_interest_with_safeguards'
  | 'legal_obligation'
export type AuthenChainRegulatoryLegalBasis =
  | 'consent'
  | 'legal_obligation'
  | 'public_administration_execution'
  | 'research_study'
  | 'contract_execution'
  | 'judicial_administrative_arbitral'
  | 'protection_of_life'
  | 'health_protection'
  | 'legitimate_interest'
  | 'credit_protection'
  | 'gdpr_vital_interests'
  | 'public_interest_specific_law'
  | 'shared_database_public_entities'
  | 'other_customer_documented'
export type AuthenChainRegulatoryEvidenceStatus = 'not_applicable' | 'complete' | 'incomplete' | 'invalid'
export type AuthenChainRegulatoryVerificationScope = 'provenance' | 'evidence_pack' | 'combined'
export type AuthenChainLegalComplianceStatus = 'not_determined'
export type AuthenChainRiskJurisdiction = 'EU' | 'BR' | 'US' | 'GLOBAL'
export type AuthenChainRiskSector =
  | 'health'
  | 'financial_services'
  | 'legal'
  | 'education'
  | 'human_resources'
  | 'government'
  | 'insurance'
  | 'public_safety'
  | 'law_enforcement'
  | 'critical_infrastructure'
  | 'housing'
  | 'marketing'
  | 'customer_support'
  | 'internal_productivity'
  | 'general_business'
  | 'other'
export type AuthenChainRiskDecisionType = 'informative' | 'recommendation' | 'automated_decision' | 'consequential_decision'
export type AuthenChainRiskTier = 'low_risk' | 'limited_risk' | 'high_risk' | 'prohibited'
export type AuthenChainRiskReviewStatus =
  | 'suggested'
  | 'approved'
  | 'overridden'
  | 'needs_legal_review'
  | 'blocked'
  | 'superseded'
export type AuthenChainDataSensitivityLevel = 'low' | 'medium' | 'high' | 'restricted'
export type AuthenChainImpactAssessmentStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved_for_production'
  | 'approved_with_conditions'
  | 'blocked_pending_mitigation'
  | 'rejected'
  | 'expired'
  | 'superseded'
  | 'archived'
export type AuthenChainAiModelProvider =
  | 'openai'
  | 'azure_openai'
  | 'google_gemini'
  | 'anthropic_claude'
  | 'meta_llama'
  | 'mistral'
  | 'cohere'
  | 'aws_bedrock'
  | 'vertex_ai'
  | 'hugging_face'
  | 'customer_hosted'
  | 'custom'
  | 'other'
export type AuthenChainAiModelHostingMode =
  | 'provider_api'
  | 'customer_cloud'
  | 'customer_on_prem'
  | 'edge'
  | 'embedded'
  | 'hybrid'
export type AuthenChainAiDeploymentEnvironment = 'dev' | 'staging' | 'production'
export type AuthenChainAiInventoryEnforcementMode = 'off' | 'warn' | 'enforce'
export type AuthenChainAiSystemLifecycleStatus =
  | 'draft'
  | 'active'
  | 'suspended'
  | 'deprecated'
  | 'retired'
export type AuthenChainAiModelVersionLifecycleStatus =
  | 'draft'
  | 'active'
  | 'deprecated'
  | 'retired'
export type AuthenChainAiModelDeploymentLifecycleStatus =
  | 'draft'
  | 'active'
  | 'suspended'
  | 'superseded'
  | 'retired'
export type AuthenChainAiModelChangeType =
  | 'system_created'
  | 'system_updated'
  | 'provider_changed'
  | 'model_name_changed'
  | 'model_version_changed'
  | 'fine_tune_changed'
  | 'hosting_mode_changed'
  | 'model_version_created'
  | 'model_version_activated'
  | 'model_version_deprecated'
  | 'deployment_created'
  | 'deployment_activated'
  | 'deployment_suspended'
  | 'environment_changed'
  | 'owner_changed'
  | 'allowed_purpose_changed'
  | 'purpose_changed'
  | 'policy_binding_changed'
  | 'risk_classification_binding_changed'
  | 'impact_assessment_binding_changed'
  | 'system_retired'
export type AuthenChainAiModelChangeStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'cancelled'
export type AuthenChainDisclosureLifecycleStatus =
  | 'draft'
  | 'published'
  | 'active'
  | 'suspended'
  | 'archived'
export type AuthenChainDisclosureNoticeChannel =
  | 'web'
  | 'mobile'
  | 'api'
  | 'email'
  | 'chat'
  | 'voice'
  | 'document'
  | 'batch'
  | 'other'
export type AuthenChainDisclosureNoticePlacement =
  | 'pre_interaction'
  | 'during_interaction'
  | 'pre_publication'
  | 'post_generation'
  | 'download_flow'
  | 'api_response'
  | 'document_footer'
  | 'other'
export type AuthenChainDisclosureNoticeDisplayMode =
  | 'inline_text'
  | 'modal'
  | 'banner'
  | 'tooltip'
  | 'audio_notice'
  | 'metadata_header'
  | 'contractual_notice'
  | 'other'
export type AuthenChainDisclosureNotInformedReasonCode =
  | 'not_required'
  | 'prior_notice'
  | 'contractual_notice'
  | 'operational_exception'
  | 'unknown'
  | 'other'
export type AuthenChainDisclosureSyntheticContentStatus =
  | 'synthetic'
  | 'mixed'
  | 'not_synthetic'
  | 'unknown'
export type AuthenChainDisclosureSyntheticContentType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'code'
  | 'json'
  | 'multimodal'
  | 'other'
export type AuthenChainDisclosureMarkingType =
  | 'visible_label'
  | 'watermark'
  | 'content_credential'
  | 'metadata_tag'
  | 'manifest_reference'
  | 'none'
  | 'not_applicable'
  | 'other'
export type AuthenChainDisclosureMarkingEvidenceType =
  | 'screenshot_hash'
  | 'response_header'
  | 'dom_selector_hash'
  | 'ui_component_version'
  | 'watermark_reference'
  | 'content_credential_manifest'
  | 'policy_decision_hash'
  | 'customer_assertion'
  | 'other'
export type AuthenChainDisclosureContentCredentialStandard = 'c2pa' | 'other' | 'none' | 'planned'
export type AuthenChainDisclosureEnforcementMode = 'disabled' | 'record_only' | 'warn' | 'enforce'
export type AuthenChainIncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'unknown'
export type AuthenChainIncidentPriority = 'urgent' | 'high' | 'normal' | 'low'
export type AuthenChainIncidentStatus =
  | 'open'
  | 'investigating'
  | 'mitigated'
  | 'reported'
  | 'closed'
  | 'reopened'
export type AuthenChainIncidentSource =
  | 'manual_dashboard_submission'
  | 'api_submission'
  | 'evidence_failure_alert'
  | 'failed_evidence_pack_verification'
  | 'failed_public_verification'
  | 'monthly_report_issue'
  | 'model_inventory_mismatch'
  | 'stale_or_missing_impact_assessment'
  | 'missing_disclosure_evidence'
  | 'reviewer_statement_dispute'
  | 'customer_support_reference'
  | 'external_customer_case_reference'
export type AuthenChainIncidentAffectedGroup =
  | 'consumers'
  | 'patients'
  | 'workers'
  | 'citizens'
  | 'children'
  | 'vulnerable_groups'
  | 'internal_users'
  | 'customers'
  | 'unknown'
  | 'other'
export type AuthenChainIncidentEvidenceLinkType =
  | 'signed_output'
  | 'request_log'
  | 'provenance_event'
  | 'evidence_pack'
  | 'ai_system'
  | 'ai_model_version'
  | 'ai_model_deployment'
  | 'risk_classification'
  | 'impact_assessment'
  | 'disclosure_record'
  | 'reviewer_statement'
  | 'monthly_report'
  | 'delivery_package'
  | 'external_customer_record'
export type AuthenChainIncidentEvidenceVerificationStatus = 'verified' | 'missing' | 'failed' | 'not_checked'
export type AuthenChainEvidenceFailureStatus = 'new' | 'acknowledged' | 'resolved' | 'suppressed' | 'false_positive'
export type AuthenChainCorrectiveActionType =
  | 'model_change'
  | 'prompt_change'
  | 'policy_change'
  | 'human_review_change'
  | 'monitoring_change'
  | 'disclosure_change'
  | 'access_control_change'
  | 'data_change'
  | 'vendor_escalation'
  | 'training'
  | 'other'
export type AuthenChainCorrectiveActionStatus =
  | 'proposed'
  | 'approved'
  | 'in_progress'
  | 'implemented'
  | 'verified'
  | 'rejected'
  | 'cancelled'
  | 'overdue'
export type AuthenChainIncidentWebhookEventType =
  | 'incident.created'
  | 'incident.severity_changed'
  | 'deadline.approaching'
  | 'deadline.overdue'
  | 'evidence_failure.created'
  | 'corrective_action.overdue'

export type JsonPrimitive = string | number | boolean | null

export interface JsonObject {
  [key: string]: JsonValue
}

export interface JsonArray extends Array<JsonValue> {}

export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export interface RetryConfig {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

export interface OperationRequestOptions {
  approvalRequestId?: string
  mutationReason?: string
  idempotencyKey?: string
  requestId?: string
  correlationId?: string
  signal?: AbortSignal
}

export interface RequestHookContext {
  method: 'GET' | 'POST' | 'PATCH'
  url: string
  path: string
  headers: Record<string, string>
  body?: unknown
  attempt: number
  maxAttempts: number
  requestId?: string
  correlationId?: string
  idempotencyKey?: string
}

export interface ResponseHookContext {
  method: 'GET' | 'POST' | 'PATCH'
  url: string
  path: string
  status: number
  headers: Record<string, string>
  payload?: unknown
  durationMs: number
  attempt: number
  maxAttempts: number
  requestId?: string
  traceId?: string
}

export interface ErrorHookContext {
  method: 'GET' | 'POST' | 'PATCH'
  url: string
  path: string
  durationMs: number
  attempt: number
  maxAttempts: number
  willRetry: boolean
  error: Error
}

export interface AuthenChainConfig {
  apiKey?: string
  baseUrl?: string
  mock?: boolean
  timeoutMs?: number
  defaultHeaders?: Record<string, string>
  retry?: RetryConfig | false
  allowPayloadDiagnostics?: boolean
  /** @deprecated Use allowPayloadDiagnostics. Credentials are always redacted. */
  allowSensitiveDiagnostics?: boolean
  strictHooks?: boolean
  strictInputValidation?: boolean
  /**
   * PHASE3-SDK-002: max time the SDK will await each user-provided
   * hook (onRequest/onResponse/onError) before timing out. Hooks that
   * exceed this budget are rejected with `AuthenChainHookError`
   * (code: `HOOK_TIMEOUT`) so they cannot indefinitely block the main
   * request. Defaults to 5_000 ms.
   */
  hookTimeoutMs?: number
  onRequest?: (context: RequestHookContext) => void | Promise<void>
  onResponse?: (context: ResponseHookContext) => void | Promise<void>
  onError?: (context: ErrorHookContext) => void | Promise<void>
}

export interface RegulatoryMetadataV1 {
  schema_version: 'regulatory.v1'
  ai_generated: boolean
  jurisdiction: AuthenChainRegulatoryJurisdiction
  regulatory_context: string[]
  content_type: AuthenChainRegulatoryContentType
  model_provider: string
  model_name: string
  model_version?: string
  system_purpose: string
  risk_context: AuthenChainRegulatoryRiskContext
  human_reviewed: boolean
  reviewer_role?: string
  review_timestamp?: string
  disclosure_required: boolean
  disclosure_applied: boolean
  label_type?: AuthenChainRegulatoryLabelType
  policy_version: string
  riskContext?: AuthenChainSignedRiskContext
  impactAssessmentId?: string
  impactAssessmentHash?: string
  impactAssessmentStatus?: AuthenChainImpactAssessmentStatus | string
  impactAssessmentApprovedAt?: string
  impactAssessmentExpiresAt?: string
  ai_inventory?: AuthenChainAiInventoryBinding | AuthenChainAiInventoryBindingReference | Record<string, unknown>
  disclosure?: AuthenChainDisclosureBinding | AuthenChainDisclosureBindingReference | Record<string, unknown>
  // R7B-HIGH-004: customer-declared sensitive data category and minor processing flags.
  sensitive_data_category?: AuthenChainRegulatorySensitiveDataCategory
  involves_minors?: boolean
  minors_consent_basis?: AuthenChainRegulatoryMinorsConsentBasis | null
  sensitive_data_category_detail?: string | null
  // legal_basis describes the lawful basis for the data PROCESSING that produced
  // this AI output (LGPD Art. 7 / 23 / GDPR Art. 6 / 9). It is distinct from the
  // forensic-access legal basis defined in src/lib/forensic-access.ts which
  // applies to later decrypt operations under a Forensic Access Grant.
  legal_basis?: AuthenChainRegulatoryLegalBasis | null
  legal_basis_reference?: string | null
  // R7B-MED-001: free-form RoPA data-subject category (LGPD Art. 37).
  data_subject_category?: string | null
}

export interface AuthenChainSignedRiskContext {
  schemaVersion: 'authenchain.regulatory.v2'
  jurisdiction: AuthenChainRiskJurisdiction
  sector: AuthenChainRiskSector
  decisionType: AuthenChainRiskDecisionType
  useCaseId: string
  riskClassificationId: string
  riskTier: AuthenChainRiskTier
  riskPolicyVersion: string
  riskRulesetHash: string
  riskContextHash: string
  reviewStatus: AuthenChainRiskReviewStatus
  humanReviewRequired: boolean
  disclosureRequired: boolean
}

export interface AuthenChainAiUseCaseInput extends OperationRequestOptions {
  name: string
  description?: string | null
  ownerUserId?: string | null
  businessOwner?: string | null
  technicalOwner?: string | null
  jurisdiction: AuthenChainRiskJurisdiction
  sector: AuthenChainRiskSector
  decisionType: AuthenChainRiskDecisionType
  contextFlags?: Record<string, boolean>
  dataSensitivity?: AuthenChainDataSensitivityLevel | null
  modelProvider?: string | null
  modelName?: string | null
  modelVersion?: string | null
  workflowName?: string | null
  reason?: string | null
}

export interface AuthenChainAiUseCase {
  id: string
  tenantId?: string
  name: string
  description?: string | null
  status?: string
  jurisdiction: AuthenChainRiskJurisdiction
  sector: AuthenChainRiskSector
  decisionType: AuthenChainRiskDecisionType
  contextFlags?: Record<string, boolean>
  dataSensitivity?: AuthenChainDataSensitivityLevel | null
  modelProvider?: string | null
  modelName?: string | null
  modelVersion?: string | null
  workflowName?: string | null
  businessOwner?: string | null
  technicalOwner?: string | null
  currentClassification?: AuthenChainRiskClassificationSummary | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface AuthenChainRiskClassificationSummary {
  id: string
  aiUseCaseId: string
  policyId?: string
  policyVersion?: string
  rulesetHash?: string
  suggestedRiskTier?: AuthenChainRiskTier
  approvedRiskTier?: AuthenChainRiskTier | null
  effectiveRiskTier?: AuthenChainRiskTier
  reviewStatus?: AuthenChainRiskReviewStatus
  confidenceLevel?: string
  createdAt?: string | null
  updatedAt?: string | null
}

export interface AuthenChainRiskClassification extends AuthenChainRiskClassificationSummary {
  justification?: JsonObject | null
  matchedRules?: JsonValue[]
  requiredControls?: string[]
  customerNotes?: string | null
  reviewedByUserId?: string | null
  reviewedAt?: string | null
}

export interface CreateAiUseCaseResponse {
  ok?: boolean
  useCase: AuthenChainAiUseCase
  [key: string]: unknown
}

export interface GetAiUseCaseInput extends OperationRequestOptions {
  id: string
}

export interface GetAiUseCaseResponse {
  ok?: boolean
  useCase: AuthenChainAiUseCase
  [key: string]: unknown
}

export interface ListAiUseCasesInput extends OperationRequestOptions {
  status?: 'active' | 'archived'
  page?: number
  pageSize?: number
}

export interface ListAiUseCasesResponse {
  ok?: boolean
  useCases: AuthenChainAiUseCase[]
  pagination?: JsonObject
  [key: string]: unknown
}

export interface ClassifyAiUseCaseInput extends OperationRequestOptions {
  id: string
  reason?: string | null
}

export interface ClassifyAiUseCaseResponse {
  ok?: boolean
  classification: AuthenChainRiskClassification
  [key: string]: unknown
}

export interface GetRiskClassificationHistoryInput extends OperationRequestOptions {
  aiUseCaseId: string
  page?: number
  pageSize?: number
}

export interface GetRiskClassificationHistoryResponse {
  ok?: boolean
  history: JsonValue[]
  pagination?: JsonObject
  [key: string]: unknown
}

export interface SignWithRiskContextInput extends SignInput {
  aiUseCaseId: string
  riskClassificationId: string
  riskContext?: JsonObject
}

export interface AuthenChainImpactAssessment {
  id: string
  tenantId?: string
  useCaseId: string
  assessmentKey?: string | null
  version?: number
  schemaVersion?: string
  status: AuthenChainImpactAssessmentStatus | string
  jurisdiction: AuthenChainRegulatoryJurisdiction
  assessmentType?: string | null
  sourceRiskClassificationId?: string | null
  sourceRiskTier?: AuthenChainRiskTier | string | null
  sourceRiskPolicyVersion?: string | null
  sourceRiskRulesetHash?: string | null
  mitigationSummary?: JsonValue | null
  approvalSummary?: JsonValue | null
  periodicReview?: JsonValue | null
  limitations?: JsonValue[]
  customerResponsibilities?: JsonValue[]
  assessmentHash?: string | null
  createdByUserId?: string | null
  updatedByUserId?: string | null
  approvedByUserId?: string | null
  approvedAt?: string | null
  expiresAt?: string | null
  supersededByAssessmentId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  archivedAt?: string | null
  questionnaire?: JsonValue | null
  fundamentalRightsAssessment?: JsonValue | null
  dataAssessment?: JsonValue | null
  affectedGroupAssessment?: JsonValue | null
  mitigations?: JsonValue[]
  approvals?: JsonValue[]
  reviews?: JsonValue[]
  evidenceExports?: JsonValue[]
  [key: string]: unknown
}

export interface ListImpactAssessmentsInput extends OperationRequestOptions {
  useCaseId?: string
  status?: AuthenChainImpactAssessmentStatus | string
  jurisdiction?: AuthenChainRegulatoryJurisdiction
  includeArchived?: boolean
  page?: number
  pageSize?: number
}

export interface ListImpactAssessmentsResponse {
  ok?: boolean
  assessments: AuthenChainImpactAssessment[]
  pagination?: JsonObject
  [key: string]: unknown
}

export interface CreateImpactAssessmentDraftInput extends OperationRequestOptions {
  useCaseId: string
  jurisdiction: AuthenChainRegulatoryJurisdiction
  assessmentKey?: string | null
  assessmentType?: string | null
  sourceRiskClassification?: JsonObject | null
  questionnaire?: JsonObject | null
  fundamentalRightsAssessment?: JsonObject | null
  dataAssessment?: JsonObject | null
  affectedGroupAssessment?: JsonObject | null
  periodicReview?: JsonObject | null
}

export interface CreateImpactAssessmentDraftResponse {
  ok?: boolean
  assessment: AuthenChainImpactAssessment
  [key: string]: unknown
}

export interface UpdateImpactAssessmentAnswersInput extends OperationRequestOptions {
  id: string
  questionnaire?: JsonObject
  fundamentalRightsAssessment?: JsonObject
  dataAssessment?: JsonObject
  affectedGroupAssessment?: JsonObject
  periodicReview?: JsonObject
  reason?: string | null
}

export interface UpdateImpactAssessmentAnswersResponse {
  ok?: boolean
  assessment: AuthenChainImpactAssessment
  [key: string]: unknown
}

export interface SubmitImpactAssessmentInput extends OperationRequestOptions {
  id: string
  reason?: string | null
}

export interface SubmitImpactAssessmentResponse {
  ok?: boolean
  assessment: AuthenChainImpactAssessment
  [key: string]: unknown
}

export interface GetImpactAssessmentInput extends OperationRequestOptions {
  id: string
}

export interface GetImpactAssessmentResponse {
  ok?: boolean
  assessment: AuthenChainImpactAssessment
  [key: string]: unknown
}

export interface ExportImpactAssessmentEvidencePackInput extends OperationRequestOptions {
  id: string
  exportType?: string
  exportStatus?: string
  exportHash?: string | null
  bundleHash?: string | null
  signedEnvelopeHash?: string | null
  expiresAt?: string | null
  reason?: string | null
}

export interface ExportImpactAssessmentEvidencePackResponse {
  ok?: boolean
  evidenceExport?: JsonObject
  evidencePack: unknown
  verification?: JsonObject
  [key: string]: unknown
}

export interface VerifyImpactAssessmentEvidencePackInput extends OperationRequestOptions {
  evidencePack: unknown
}

export interface VerifyImpactAssessmentEvidencePackResponse {
  ok?: boolean
  verification?: JsonObject
  [key: string]: unknown
}

export type AuthenChainControlFrameworkId =
  | 'eu_ai_act'
  | 'nist_ai_rmf'
  | 'iso_iec_42001'
  | 'iso_iec_23894'
  | 'brazil_pl_2338_2023'
export type AuthenChainControlMappingJurisdiction =
  | 'EU'
  | 'BR'
  | 'US'
  | 'GLOBAL'
  | 'CROSS_FRAMEWORK'
export type AuthenChainControlMappingStatus =
  | 'covered'
  | 'partially_covered'
  | 'not_covered'
  | 'customer_responsibility'
export type AuthenChainControlMappingIdempotency = 'reuse' | 'force'
export type AuthenChainControlMappingShareMode =
  | 'internal_dashboard'
  | 'evidence_pack'
  | 'auditor_package'
  | 'procurement_package'
  | 'customer_support_export'
  | 'public_verifier'
  | 'regulator_package_reference'

export interface AuthenChainControlFramework {
  id: AuthenChainControlFrameworkId | string
  label: string
  jurisdiction: AuthenChainControlMappingJurisdiction | string
  versionDate: string
  status: string
  sourceLabel?: string | null
  sourceUrl?: string | null
  catalogVersion?: string
  legalCompliance: AuthenChainLegalComplianceStatus
  [key: string]: unknown
}

export interface AuthenChainControlRequirement {
  id: string
  frameworkId: AuthenChainControlFrameworkId | string
  controlId: string
  articleOrClauseLabel?: string | null
  title: string
  objective?: string | null
  references?: JsonValue[]
  requiredEvidenceTypes?: string[]
  optionalEvidenceTypes?: string[]
  customerResponsibilityCategories?: string[]
  customerResponsibilityNotes?: string[]
  legalCompliance: AuthenChainLegalComplianceStatus
  [key: string]: unknown
}

export interface AuthenChainControlMappingEvidenceInput {
  evidenceType: string
  internalDashboardUrl?: string
  record: JsonObject
}

export interface AuthenChainControlMappingExternalEvidenceInput {
  evidenceType: string
  reference: JsonObject
}

export interface AuthenChainControlMappingScopeInput extends OperationRequestOptions {
  workspaceId?: string
  frameworkIds: Array<AuthenChainControlFrameworkId | string>
  jurisdiction: AuthenChainControlMappingJurisdiction | string
  aiSystemId?: string
  modelVersionId?: string
  deploymentId?: string
  environment?: string
  periodStart: string
  periodEnd: string
  sourceRecords?: AuthenChainControlMappingEvidenceInput[]
  externalEvidence?: AuthenChainControlMappingExternalEvidenceInput[]
  idempotency?: AuthenChainControlMappingIdempotency
}

export interface AuthenChainControlMappingSnapshot {
  id: string
  orgId?: string
  workspaceId?: string | null
  frameworkIds: string[]
  jurisdiction: string
  aiSystemId?: string | null
  modelVersionId?: string | null
  deploymentId?: string | null
  environment?: string | null
  scopeHash: string
  snapshotHash: string
  status?: string
  generatedAt?: string | null
  legalCompliance: AuthenChainLegalComplianceStatus
  evidenceLinks?: JsonValue[]
  gaps?: JsonValue[]
  maturityScores?: JsonValue[]
  [key: string]: unknown
}

export interface AuthenChainControlMappingPreview {
  scopeHash: string
  snapshotHash?: string
  scope?: JsonObject
  statusCounts?: JsonObject
  statusesByRequirement?: JsonObject
  evidenceLinks?: JsonValue[]
  gaps?: JsonValue[]
  maturityScores?: JsonValue[]
  generatedAt?: string
  legalCompliance: AuthenChainLegalComplianceStatus
  [key: string]: unknown
}

export interface AuthenChainControlMappingMaturity {
  snapshotId?: string
  snapshotHash?: string
  scopeHash?: string
  maturityScores: JsonValue[]
  legalCompliance: AuthenChainLegalComplianceStatus
  [key: string]: unknown
}

export interface ListControlFrameworksInput extends OperationRequestOptions {}

export interface ListControlFrameworksResponse {
  ok?: boolean
  frameworks: AuthenChainControlFramework[]
  [key: string]: unknown
}

export interface ListControlRequirementsInput extends OperationRequestOptions {
  frameworkId?: AuthenChainControlFrameworkId | string
  q?: string
}

export interface ListControlRequirementsResponse {
  ok?: boolean
  controls: AuthenChainControlRequirement[]
  [key: string]: unknown
}

export interface PreviewControlMappingInput extends AuthenChainControlMappingScopeInput {}

export interface PreviewControlMappingResponse {
  ok?: boolean
  preview: AuthenChainControlMappingPreview
  [key: string]: unknown
}

export interface GenerateControlMappingSnapshotInput extends AuthenChainControlMappingScopeInput {}

export interface GenerateControlMappingSnapshotResponse {
  ok?: boolean
  snapshot: AuthenChainControlMappingSnapshot
  preview?: AuthenChainControlMappingPreview
  idempotent?: boolean
  [key: string]: unknown
}

export interface GetControlMappingSnapshotInput extends OperationRequestOptions {
  snapshotId?: string
  id?: string
}

export interface GetControlMappingSnapshotResponse {
  ok?: boolean
  snapshot: AuthenChainControlMappingSnapshot
  [key: string]: unknown
}

export interface ExportControlMappingEvidencePackSectionInput extends OperationRequestOptions {
  snapshotId?: string
  id?: string
  shareMode?: AuthenChainControlMappingShareMode
}

export interface ExportControlMappingEvidencePackSectionResponse {
  ok?: boolean
  section: JsonObject
  validation?: JsonObject
  export?: JsonObject
  [key: string]: unknown
}

export interface GetControlMappingMaturityInput extends OperationRequestOptions {
  snapshotId?: string
  id?: string
}

export interface GetControlMappingMaturityResponse {
  ok?: boolean
  maturity: AuthenChainControlMappingMaturity
  [key: string]: unknown
}

export interface AuthenChainAiInventorySystem {
  id: string
  tenantId?: string
  workspaceId?: string | null
  aiUseCaseId?: string | null
  systemKey: string
  displayName: string
  description?: string | null
  status: AuthenChainAiSystemLifecycleStatus | string
  internalOwnerTeam?: string | null
  businessUnit?: string | null
  allowedPurposeSummary?: string | null
  jurisdictionMarkers?: string[]
  productionUse?: boolean
  ownerUserId?: string | null
  ownerName?: string | null
  backupOwnerUserId?: string | null
  backupOwnerName?: string | null
  allowedPurposeIds?: string[]
  policyVersionRefs?: string[]
  currentSystemVersionHash?: string | null
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  retiredAt?: string | null
  archivedAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainAiModelVersion {
  id: string
  tenantId?: string
  aiSystemId: string
  provider: AuthenChainAiModelProvider | string
  providerDisplayName?: string | null
  modelName: string
  modelVersion?: string | null
  displayName?: string | null
  hostingMode: AuthenChainAiModelHostingMode | string
  status: AuthenChainAiModelVersionLifecycleStatus | string
  modelVersionHash?: string | null
  endpointReferenceHash?: string | null
  region?: string | null
  fineTuneReferenceHash?: string | null
  providerMetadata?: JsonObject | null
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  deprecatedAt?: string | null
  retiredAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainAiDeployment {
  id: string
  tenantId?: string
  aiSystemId: string
  aiSystemVersionHash?: string | null
  aiModelVersionId: string
  aiModelVersionHash?: string | null
  environment: AuthenChainAiDeploymentEnvironment | string
  status: AuthenChainAiModelDeploymentLifecycleStatus | string
  ownerUserId?: string | null
  ownerName?: string | null
  allowedPurposeId?: string | null
  policyBindingId?: string | null
  policyVersionRefs?: string[]
  deploymentHash?: string | null
  endpointReferenceHash?: string | null
  region?: string | null
  residencyMarker?: string | null
  dataHandlingMarkers?: string[]
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  aiModelVersionStatusAtActivation?: string | null
  deprecatedModelVersionException?: JsonObject | null
  activatedAt?: string | null
  suspendedAt?: string | null
  retiredAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainAiModelChange {
  id: string
  tenantId?: string
  aiSystemId: string
  aiModelDeploymentId?: string | null
  changeType: AuthenChainAiModelChangeType | string
  status: AuthenChainAiModelChangeStatus | string
  beforeHash?: string | null
  afterHash?: string | null
  modelChangeHash?: string | null
  reason: string
  evidenceReferences?: JsonValue[]
  changePayload?: JsonObject | null
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  createdAt?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  appliedAt?: string | null
  cancelledAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainAiInventoryBindingReference {
  enforcementMode?: AuthenChainAiInventoryEnforcementMode
  aiSystemId: string
  deploymentEnvironment: AuthenChainAiDeploymentEnvironment
  aiModelVersionId?: string | null
  aiModelVersionHash?: string | null
  aiModelDeploymentId?: string | null
  allowedPurposeId?: string | null
  policyBindingId?: string | null
  policyVersionRefs?: string[]
  [key: string]: unknown
}

export interface AuthenChainAiInventoryBinding {
  schemaVersion: 'ai_inventory_binding.v1' | string
  aiSystemId: string
  aiSystemVersionHash: string
  aiModelVersionId: string
  aiModelVersionHash: string
  aiModelDeploymentId: string
  deploymentEnvironment: AuthenChainAiDeploymentEnvironment | string
  allowedPurposeId: string
  policyBindingId?: string | null
  policyVersionRefs: string[]
  inventoryBindingHash: string
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  [key: string]: unknown
}

export interface AuthenChainAiInventorySigningBinding extends AuthenChainAiInventoryBinding {
  id?: string
  tenantId?: string
  requestLogId?: string | null
  provenanceEventId?: string | null
  traceId?: string | null
  signedAt?: string | null
  createdAt?: string | null
}

export interface ListAiInventorySystemsInput extends OperationRequestOptions {
  status?: AuthenChainAiSystemLifecycleStatus | string
  aiUseCaseId?: string
  page?: number
  pageSize?: number
}

export interface ListAiInventorySystemsResponse {
  ok?: boolean
  systems: AuthenChainAiInventorySystem[]
  pagination?: JsonObject
  [key: string]: unknown
}

export interface GetAiInventorySystemInput extends OperationRequestOptions {
  id: string
}

export interface GetAiInventorySystemResponse {
  ok?: boolean
  system: AuthenChainAiInventorySystem
  [key: string]: unknown
}

export interface AuthenChainMcpContext {
  schemaVersion: 'authenchain.mcp-context.v1' | string
  organization: { name: string; environment: 'production' | 'sandbox' | string }
  dashboardUrl: string
  apiVersion: string
  scopes: string[]
  capabilities: JsonObject
  limitations: string[]
}

export interface GetMcpContextResponse {
  ok?: boolean
  schemaVersion: string
  organization: AuthenChainMcpContext['organization']
  dashboardUrl: string
  apiVersion: string
  scopes: string[]
  capabilities: JsonObject
  limitations: string[]
  [key: string]: unknown
}

export interface AuthenChainGovernanceCorrection {
  href: string
  url: string
  actionLabel: string
}

export interface AuthenChainGovernanceRequirement {
  id: string
  label: string
  met: boolean
  notEvaluated?: boolean
  detail: string
  correction: AuthenChainGovernanceCorrection | null
  [key: string]: unknown
}

export interface AuthenChainGovernanceUseCaseReadiness {
  id: string
  key: string
  name: string
  readiness: 'ready' | 'partial' | 'blocked' | string
  productionEligible: boolean
  signingBlockedReason: string | null
  score: { met: number; total: number }
  requirements: AuthenChainGovernanceRequirement[]
  notEvaluated: AuthenChainGovernanceRequirement[]
  blockers: string[]
  warnings: string[]
  links: JsonObject
  [key: string]: unknown
}

export interface GetGovernanceReadinessInput extends OperationRequestOptions {
  useCaseId?: string
}

export interface GetGovernanceReadinessResponse {
  ok?: boolean
  readiness: {
    schemaVersion: string
    generatedAt: string
    dashboardUrl: string
    summary: JsonObject
    useCases: AuthenChainGovernanceUseCaseReadiness[]
    limitations: string[]
  }
  [key: string]: unknown
}

export interface ListPendingGovernanceInput extends OperationRequestOptions {
  useCaseId?: string
  page?: number
  pageSize?: number
}

export interface ListPendingGovernanceResponse {
  ok?: boolean
  pending: {
    schemaVersion: string
    generatedAt: string
    items: Array<{
      id: string
      useCase: { id: string; key: string; name: string }
      readiness: string
      productionEligible: boolean
      requirement: AuthenChainGovernanceRequirement
    }>
    pagination: JsonObject
    limitations: string[]
  }
  [key: string]: unknown
}

export interface LookupPublicEvidenceInput extends OperationRequestOptions {
  hash: string
}

export interface LookupPublicEvidenceResponse {
  ok?: boolean
  hash: string
  found: boolean
  evidencePacks: JsonValue[]
  policies: JsonValue[]
  verificationScope: string
  cryptographicEvidencePackVerified: boolean
  limitation: string
  [key: string]: unknown
}

export interface CreateAiInventorySystemInput extends OperationRequestOptions {
  id?: string
  workspaceId?: string | null
  aiUseCaseId?: string | null
  systemKey: string
  displayName: string
  description?: string | null
  status?: AuthenChainAiSystemLifecycleStatus | string
  internalOwnerTeam?: string | null
  businessUnit?: string | null
  allowedPurposeSummary: string
  jurisdictionMarkers: string[]
  productionUse?: boolean
  ownerUserId?: string | null
  ownerName?: string | null
  ownerEmail?: string | null
  backupOwnerUserId?: string | null
  backupOwnerName?: string | null
  backupOwnerEmail?: string | null
  allowedPurposeIds?: string[]
  policyVersionRefs?: string[]
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  reason?: string | null
}

export interface CreateAiInventorySystemResponse {
  ok?: boolean
  system: AuthenChainAiInventorySystem
  [key: string]: unknown
}

export interface CreateAiInventoryModelVersionInput extends OperationRequestOptions {
  id?: string
  aiSystemId: string
  provider: AuthenChainAiModelProvider | string
  providerDisplayName?: string | null
  modelName: string
  modelVersion?: string | null
  releaseLabel?: string | null
  displayName?: string | null
  hostingMode: AuthenChainAiModelHostingMode
  status?: AuthenChainAiModelVersionLifecycleStatus | string
  endpointReferenceHash?: string | null
  region?: string | null
  fineTuneReferenceHash?: string | null
  providerMetadata?: JsonObject | null
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  reason?: string | null
}

export interface CreateAiInventoryModelVersionResponse {
  ok?: boolean
  modelVersion: AuthenChainAiModelVersion
  [key: string]: unknown
}

export interface CreateAiInventoryDeploymentInput extends OperationRequestOptions {
  id?: string
  aiSystemId: string
  aiModelVersionId: string
  environment: AuthenChainAiDeploymentEnvironment
  status?: AuthenChainAiModelDeploymentLifecycleStatus | string
  ownerUserId?: string | null
  ownerName?: string | null
  ownerEmail?: string | null
  allowedPurposeId?: string | null
  policyBindingId?: string | null
  policyVersionRefs?: string[]
  endpointReferenceHash?: string | null
  region?: string | null
  residencyMarker?: string | null
  dataHandlingMarkers?: string[]
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
  deprecatedModelVersionException?: JsonObject | null
  reason?: string | null
}

export interface CreateAiInventoryDeploymentResponse {
  ok?: boolean
  deployment: AuthenChainAiDeployment
  [key: string]: unknown
}

export interface ActivateAiInventoryDeploymentInput extends OperationRequestOptions {
  deploymentId: string
  expectedDeploymentHash: string
  deprecatedModelVersionException?: JsonObject | null
  reason?: string | null
}

export interface ActivateAiInventoryDeploymentResponse {
  ok?: boolean
  deployment: AuthenChainAiDeployment
  [key: string]: unknown
}

export interface RequestAiInventoryModelChangeInput extends OperationRequestOptions {
  id?: string
  aiSystemId: string
  aiModelDeploymentId?: string | null
  changeType: AuthenChainAiModelChangeType | string
  beforeHash?: string | null
  afterHash?: string | null
  reason: string
  evidenceReferences?: JsonValue[]
  changePayload?: JsonObject | null
  sourceRiskClassificationId?: string | null
  sourceImpactAssessmentId?: string | null
}

export interface RequestAiInventoryModelChangeResponse {
  ok?: boolean
  modelChange: AuthenChainAiModelChange
  [key: string]: unknown
}

export interface ResolveAiInventoryBindingInput
  extends AuthenChainAiInventoryBindingReference,
    OperationRequestOptions {
  metadata?: MetadataInput | ProvenanceMetadata | JsonObject
}

export interface ResolveAiInventoryBindingResponse {
  ok?: boolean
  binding: AuthenChainAiInventoryBinding | null
  metadata?: Record<string, unknown>
  warnings?: string[]
  [key: string]: unknown
}

export interface FetchAiInventoryBindingInput extends OperationRequestOptions {
  inventoryBindingHash: string
}

export interface FetchAiInventoryBindingResponse {
  ok?: boolean
  binding: AuthenChainAiInventorySigningBinding | null
  verification?: Record<string, unknown>
  [key: string]: unknown
}

export interface AuthenChainDisclosureNoticeSnapshot {
  id: string
  tenantId?: string
  workspaceId?: string | null
  policyId?: string | null
  templateKey: string
  templateVersion: string
  status: AuthenChainDisclosureLifecycleStatus | string
  noticeText?: string
  noticeTextHash?: string | null
  noticeLocale?: string | null
  noticeChannel: AuthenChainDisclosureNoticeChannel | string
  noticePlacement: AuthenChainDisclosureNoticePlacement | string
  noticeDisplayMode: AuthenChainDisclosureNoticeDisplayMode | string
  publicSafeText?: boolean
  policyVersionRefs?: string[]
  noticeTemplateHash?: string | null
  publishedAt?: string | null
  archivedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainDisclosureApplication {
  id: string
  tenantId?: string
  workspaceId?: string | null
  policyId?: string | null
  noticeTemplateId?: string | null
  signedEventId?: string | null
  userInformed: boolean
  userInformedAt?: string | null
  notInformedReasonCode?: AuthenChainDisclosureNotInformedReasonCode | string | null
  noticeSnapshotHash?: string | null
  noticeTextHash?: string | null
  noticeTemplateVersion?: string | null
  noticeLocale?: string | null
  noticeChannel: AuthenChainDisclosureNoticeChannel | string
  noticePlacement: AuthenChainDisclosureNoticePlacement | string
  noticeDisplayMode: AuthenChainDisclosureNoticeDisplayMode | string
  evidenceArtifactHashes?: string[]
  disclosureApplicationHash?: string | null
  createdAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainSyntheticContentDeclaration {
  id: string
  tenantId?: string
  workspaceId?: string | null
  disclosureApplicationId?: string | null
  signedEventId?: string | null
  aiGeneratedOutput: boolean
  syntheticContentStatus: AuthenChainDisclosureSyntheticContentStatus | string
  syntheticContentTypes: Array<AuthenChainDisclosureSyntheticContentType | string>
  declarationBasis: string
  humanEdited?: boolean | null
  sourceSystem?: string | null
  customerPolicyReference?: string | null
  contentEvidenceHash?: string | null
  contentCredentialReferenceHash?: string | null
  syntheticContentHash?: string | null
  declaredAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainContentMarking {
  id: string
  tenantId?: string
  workspaceId?: string | null
  disclosureApplicationId?: string | null
  signedEventId?: string | null
  markingApplied: boolean
  markingTypes: Array<AuthenChainDisclosureMarkingType | string>
  markingEvidenceTypes?: Array<AuthenChainDisclosureMarkingEvidenceType | string>
  markingProvider?: string | null
  markingToolName?: string | null
  markingToolVersion?: string | null
  visibleLabelText?: string | null
  visibleLabelPublicSafe?: boolean
  visibleLabelTextHash?: string | null
  watermarkAlgorithmReference?: string | null
  contentCredentialStandard: AuthenChainDisclosureContentCredentialStandard | string
  contentCredentialReferenceHash?: string | null
  contentCredentialManifestHash?: string | null
  contentCredentialIssuerReference?: string | null
  visualEvidenceArtifactHash?: string | null
  technicalEvidenceHashes?: string[]
  customerAssertionBasis?: string | null
  contentMarkingHash?: string | null
  markedAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainDisclosureBindingReference {
  enforcementMode?: AuthenChainDisclosureEnforcementMode | string
  policyPresetKey?: string
  jurisdiction?: string
  contentType?: AuthenChainDisclosureSyntheticContentType | string
  interactionMode?: string
  outputContext?: string
  userInformed?: boolean | null
  userInformedAt?: string | null
  notInformedReasonCode?: AuthenChainDisclosureNotInformedReasonCode | string | null
  noticeSnapshotHash?: string | null
  noticeTextHash?: string | null
  noticeTemplateId?: string | null
  noticeTemplateVersion?: string | null
  noticeLocale?: string | null
  noticeChannel?: AuthenChainDisclosureNoticeChannel | string | null
  noticePlacement?: AuthenChainDisclosureNoticePlacement | string | null
  noticeDisplayMode?: AuthenChainDisclosureNoticeDisplayMode | string | null
  expectedNoticeTextHash?: string | null
  aiGeneratedOutput?: boolean
  syntheticContentStatus?: AuthenChainDisclosureSyntheticContentStatus | string | null
  syntheticContentTypes?: Array<AuthenChainDisclosureSyntheticContentType | string>
  markingApplied?: boolean | null
  markingTypes?: Array<AuthenChainDisclosureMarkingType | string>
  contentCredentialStandard?: AuthenChainDisclosureContentCredentialStandard | string | null
  contentCredentialReferenceHash?: string | null
  visualEvidenceArtifactHash?: string | null
  disclosurePolicyHash?: string | null
  policyDecisionHash?: string | null
  suppliedPolicyDecisionHash?: string | null
  syntheticContentDeclarationHash?: string | null
  contentMarkingHash?: string | null
  disclosureEvidenceHash?: string | null
  evidenceArtifactHashes?: string[]
  visualEvidencePublicSafe?: boolean | null
  disclosureEvidencePublicSafe?: boolean | null
  technicalEvidenceHashes?: string[]
  contentCredentialVerificationState?: string | null
  requireContentCredentialVerification?: boolean
  disclosureBindingHash?: string | null
  bindingId?: string | null
  [key: string]: unknown
}

export interface AuthenChainDisclosureBinding extends AuthenChainDisclosureBindingReference {
  schemaVersion?: string
  disclosureBindingHash: string
  id?: string
  tenantId?: string
  requestLogId?: string | null
  provenanceEventId?: string | null
  signedEventId?: string | null
  traceId?: string | null
  signedAt?: string | null
  createdAt?: string | null
}

export interface CreateDisclosureNoticeSnapshotInput extends OperationRequestOptions {
  id?: string
  workspaceId?: string | null
  policyId?: string | null
  templateKey: string
  templateVersion: string
  status?: AuthenChainDisclosureLifecycleStatus | string
  noticeText: string
  noticeTextHash?: string | null
  noticeLocale?: string | null
  noticeChannel: AuthenChainDisclosureNoticeChannel | string
  noticePlacement: AuthenChainDisclosureNoticePlacement | string
  noticeDisplayMode: AuthenChainDisclosureNoticeDisplayMode | string
  publicSafeText?: boolean
  policyVersionRefs?: string[]
  reason?: string | null
}

export interface CreateDisclosureNoticeSnapshotResponse {
  ok?: boolean
  notice: AuthenChainDisclosureNoticeSnapshot
  [key: string]: unknown
}

export interface RecordDisclosureApplicationInput extends OperationRequestOptions {
  id?: string
  workspaceId?: string | null
  policyId?: string | null
  noticeTemplateId?: string | null
  signedEventId?: string | null
  userInformed: boolean
  userInformedAt?: string | null
  notInformedReasonCode?: AuthenChainDisclosureNotInformedReasonCode | string | null
  noticeSnapshotHash?: string | null
  noticeTextHash?: string | null
  noticeTemplateVersion?: string | null
  noticeLocale?: string | null
  noticeChannel: AuthenChainDisclosureNoticeChannel | string
  noticePlacement: AuthenChainDisclosureNoticePlacement | string
  noticeDisplayMode: AuthenChainDisclosureNoticeDisplayMode | string
  evidenceArtifactHashes?: string[]
  createdAt?: string | null
  reason?: string | null
}

export interface RecordDisclosureApplicationResponse {
  ok?: boolean
  application: AuthenChainDisclosureApplication
  [key: string]: unknown
}

export interface RecordSyntheticContentDeclarationInput extends OperationRequestOptions {
  id?: string
  workspaceId?: string | null
  disclosureApplicationId?: string | null
  signedEventId?: string | null
  aiGeneratedOutput: boolean
  syntheticContentStatus: AuthenChainDisclosureSyntheticContentStatus | string
  syntheticContentTypes: Array<AuthenChainDisclosureSyntheticContentType | string>
  declarationBasis: string
  humanEdited?: boolean | null
  sourceSystem?: string | null
  customerPolicyReference?: string | null
  contentEvidenceHash?: string | null
  contentCredentialReferenceHash?: string | null
  declaredAt?: string | null
  reason?: string | null
}

export interface RecordSyntheticContentDeclarationResponse {
  ok?: boolean
  syntheticContentDeclaration: AuthenChainSyntheticContentDeclaration
  [key: string]: unknown
}

export interface RecordContentMarkingInput extends OperationRequestOptions {
  id?: string
  workspaceId?: string | null
  disclosureApplicationId?: string | null
  signedEventId?: string | null
  markingApplied: boolean
  markingTypes: Array<AuthenChainDisclosureMarkingType | string>
  markingEvidenceTypes?: Array<AuthenChainDisclosureMarkingEvidenceType | string>
  markingProvider?: string | null
  markingToolName?: string | null
  markingToolVersion?: string | null
  visibleLabelText?: string | null
  visibleLabelPublicSafe?: boolean
  visibleLabelTextHash?: string | null
  watermarkAlgorithmReference?: string | null
  contentCredentialStandard?: AuthenChainDisclosureContentCredentialStandard | string
  contentCredentialReferenceHash?: string | null
  contentCredentialManifestHash?: string | null
  contentCredentialIssuerReference?: string | null
  visualEvidenceArtifactHash?: string | null
  technicalEvidenceHashes?: string[]
  customerAssertionBasis?: string | null
  markedAt?: string | null
  reason?: string | null
}

export interface RecordContentMarkingResponse {
  ok?: boolean
  marking: AuthenChainContentMarking
  [key: string]: unknown
}

export interface ResolveDisclosureBindingInput extends OperationRequestOptions {
  content?: string
  contentHash?: string
  content_hash?: string
  contentEncoding?: AuthenChainContentEncoding
  content_encoding?: AuthenChainContentEncoding
  metadata?: JsonObject
  disclosure: AuthenChainDisclosureBindingReference
  requestLogId?: string | null
  provenanceEventId?: string | null
  signedEventId?: string | null
  bindingIdSeed?: string | null
}

export interface ResolveDisclosureBindingResponse {
  ok?: boolean
  binding: AuthenChainDisclosureBinding | null
  metadata?: Record<string, unknown>
  warnings?: string[]
  failures?: string[]
  [key: string]: unknown
}

export interface SignWithDisclosureEvidenceInput extends SignInput {
  disclosure: AuthenChainDisclosureBindingReference
  requestLogId?: string | null
  provenanceEventId?: string | null
  signedEventId?: string | null
  bindingIdSeed?: string | null
}

export type VerifyDisclosureEvidencePackInput = VerifyEvidencePackInput
export type VerifyDisclosureEvidencePackResponse = VerifyEvidencePackResponse

export interface AuthenChainIncidentRecord {
  id: string
  tenantId?: string
  workspaceId?: string | null
  incidentKey?: string | null
  title: string
  safeSummary?: string
  status: AuthenChainIncidentStatus | string
  severity: AuthenChainIncidentSeverity | string
  priority?: AuthenChainIncidentPriority | string | null
  source?: AuthenChainIncidentSource | string
  affectedGroups?: Array<AuthenChainIncidentAffectedGroup | string>
  ownerUserId?: string | null
  ownerTeam?: string | null
  policyVersionRefs?: string[]
  incidentHash?: string | null
  legalCompliance?: AuthenChainLegalComplianceStatus | string
  detectedAt?: string | null
  becameKnownAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainIncidentEvidenceLink {
  id?: string
  incidentId?: string
  workspaceId?: string | null
  linkType: AuthenChainIncidentEvidenceLinkType | string
  sourceRecordId?: string | null
  sourceRecordHash?: string | null
  evidenceHash?: string | null
  verificationStatusAtLinkTime?: AuthenChainIncidentEvidenceVerificationStatus | string
  evidencePackHash?: string | null
  aiSystemId?: string | null
  aiModelVersionId?: string | null
  aiModelVersionHash?: string | null
  aiModelDeploymentId?: string | null
  aiModelDeploymentHash?: string | null
  riskClassificationId?: string | null
  riskClassificationHash?: string | null
  impactAssessmentId?: string | null
  impactAssessmentHash?: string | null
  disclosureBindingId?: string | null
  disclosureBindingHash?: string | null
  linkedAt?: string | null
  linkHash?: string | null
  [key: string]: unknown
}

export interface AuthenChainEvidenceFailureAlert {
  id: string
  tenantId?: string
  workspaceId?: string | null
  incidentId?: string | null
  status: AuthenChainEvidenceFailureStatus | string
  alertHash?: string | null
  failureType?: string | null
  severity?: AuthenChainIncidentSeverity | string | null
  evidenceHash?: string | null
  firstSeenAt?: string | null
  lastSeenAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainCorrectiveAction {
  id: string
  tenantId?: string
  workspaceId?: string | null
  incidentId: string
  actionType: AuthenChainCorrectiveActionType | string
  status: AuthenChainCorrectiveActionStatus | string
  ownerUserId?: string | null
  actionSummaryHash?: string | null
  verificationMethodHash?: string | null
  correctiveActionHash?: string | null
  targetDate?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  [key: string]: unknown
}

export interface AuthenChainIncidentRecurrenceReport {
  id: string
  tenantId?: string
  workspaceId?: string | null
  reportPeriodStart: string
  reportPeriodEnd: string
  incidentCount?: number
  highSeverityCount?: number
  criticalSeverityCount?: number
  recurrenceReportHash?: string | null
  createdAt?: string | null
  [key: string]: unknown
}

export interface ListRegulatoryIncidentsInput extends OperationRequestOptions {
  workspaceId?: string
  status?: AuthenChainIncidentStatus | string
  severity?: AuthenChainIncidentSeverity | string
  priority?: AuthenChainIncidentPriority | string
  source?: AuthenChainIncidentSource | string
  q?: string
  page?: number
  pageSize?: number
}

export interface ListRegulatoryIncidentsResponse {
  ok?: boolean
  incidents: AuthenChainIncidentRecord[]
  pagination?: JsonObject
  [key: string]: unknown
}

export interface CreateRegulatoryIncidentInput extends OperationRequestOptions {
  source?: AuthenChainIncidentSource | string
  workspaceId?: string | null
  incidentId?: string | null
  incidentKey?: string | null
  title: string
  safeSummary: string
  severity?: AuthenChainIncidentSeverity | string
  priority?: AuthenChainIncidentPriority | string
  affectedGroups?: Array<AuthenChainIncidentAffectedGroup | string>
  detectedAt?: string | null
  becameKnownAt?: string | null
  ownerUserId?: string | null
  ownerTeam?: string | null
  policyVersionRefs?: string[]
  internalNotes?: string | null
  outputHash?: string | null
  evidenceFailureHash?: string | null
  modelVersionHash?: string | null
  deploymentHash?: string | null
}

export interface CreateRegulatoryIncidentResponse {
  ok?: boolean
  incident: AuthenChainIncidentRecord
  [key: string]: unknown
}

export interface GetRegulatoryIncidentInput extends OperationRequestOptions {
  id: string
}

export interface GetRegulatoryIncidentResponse {
  ok?: boolean
  incident: AuthenChainIncidentRecord
  evidenceLinks?: AuthenChainIncidentEvidenceLink[]
  alerts?: AuthenChainEvidenceFailureAlert[]
  correctiveActions?: AuthenChainCorrectiveAction[]
  [key: string]: unknown
}

export interface UpdateRegulatoryIncidentTriageInput extends OperationRequestOptions {
  id: string
  title?: string
  safeSummary?: string
  severity?: AuthenChainIncidentSeverity | string
  priority?: AuthenChainIncidentPriority | string
  regulatoryReportingStatus?: string
  ownerTeam?: string | null
  policyVersionRefs?: string[]
  internalNotes?: string | null
  reason?: string | null
}

export interface UpdateRegulatoryIncidentTriageResponse {
  ok?: boolean
  incident: AuthenChainIncidentRecord
  [key: string]: unknown
}

export interface LinkRegulatoryIncidentEvidenceInput extends OperationRequestOptions, AuthenChainIncidentEvidenceLink {
  incidentId: string
  linkReason?: string | null
}

export interface LinkRegulatoryIncidentEvidenceResponse {
  ok?: boolean
  incident?: AuthenChainIncidentRecord
  link?: AuthenChainIncidentEvidenceLink
  evidenceLink?: AuthenChainIncidentEvidenceLink
  [key: string]: unknown
}

export interface TransitionRegulatoryIncidentInput extends OperationRequestOptions {
  incidentId: string
  status?: AuthenChainIncidentStatus | string
  operation?:
    | 'assign_owner'
    | 'start_investigation'
    | 'request_more_evidence'
    | 'mark_mitigation_implemented'
    | 'mark_customer_reporting'
    | 'close'
    | 'reopen'
    | string
  ownerTeam?: string | null
  evidenceRequestSummary?: string | null
  mitigationEvidenceHash?: string | null
  reportingStatus?: string
  customerReportingMetadataHash?: string | null
  closureReason?: string | null
  investigationSummaryHash?: string | null
  correctiveActionReviewHash?: string | null
  reopenReason?: string | null
  reason?: string | null
}

export interface TransitionRegulatoryIncidentResponse {
  ok?: boolean
  incident: AuthenChainIncidentRecord
  [key: string]: unknown
}

export interface CreateRegulatoryIncidentCorrectiveActionInput extends OperationRequestOptions {
  incidentId: string
  workspaceId?: string | null
  actionType: AuthenChainCorrectiveActionType | string
  ownerUserId: string
  targetDate: string
  actionSummary: string
  verificationMethod: string
  evidenceReferences?: AuthenChainIncidentEvidenceLink[]
  approverUserId?: string | null
  status?: AuthenChainCorrectiveActionStatus | string
  reason?: string | null
}

export interface CreateRegulatoryIncidentCorrectiveActionResponse {
  ok?: boolean
  correctiveAction: AuthenChainCorrectiveAction
  [key: string]: unknown
}

export interface VerifyRegulatoryIncidentCorrectiveActionInput extends OperationRequestOptions {
  incidentId: string
  correctiveActionId: string
  status: AuthenChainCorrectiveActionStatus | string
  evidenceReference?: AuthenChainIncidentEvidenceLink | null
  customerWaiverHash?: string | null
  reason?: string | null
}

export interface VerifyRegulatoryIncidentCorrectiveActionResponse {
  ok?: boolean
  correctiveAction: AuthenChainCorrectiveAction
  [key: string]: unknown
}

export interface ExportRegulatoryIncidentEvidencePackInput extends OperationRequestOptions {
  id: string
}

export interface ExportRegulatoryIncidentEvidencePackResponse {
  ok?: boolean
  evidencePack: unknown
  [key: string]: unknown
}

export interface ListRegulatoryEvidenceFailureAlertsInput extends OperationRequestOptions {
  workspaceId?: string
  status?: AuthenChainEvidenceFailureStatus | string
  incidentId?: string
  page?: number
  pageSize?: number
}

export interface ListRegulatoryEvidenceFailureAlertsResponse {
  ok?: boolean
  alerts: AuthenChainEvidenceFailureAlert[]
  pagination?: JsonObject
  [key: string]: unknown
}

export interface GenerateRegulatoryIncidentRecurrenceReportInput extends OperationRequestOptions {
  workspaceId?: string | null
  reportPeriodStart: string
  reportPeriodEnd: string
  minRepeatCount?: number
}

export interface GenerateRegulatoryIncidentRecurrenceReportResponse {
  ok?: boolean
  report: AuthenChainIncidentRecurrenceReport
  built?: JsonObject
  [key: string]: unknown
}

export interface IncidentGovernanceWebhookMetadataInput extends OperationRequestOptions {
  eventType: AuthenChainIncidentWebhookEventType
  incidentId?: string | null
  workspaceId?: string | null
  incidentHash?: string | null
  severity?: AuthenChainIncidentSeverity | string | null
  previousSeverity?: AuthenChainIncidentSeverity | string | null
  status?: AuthenChainIncidentStatus | string | null
  deadlineId?: string | null
  alertId?: string | null
  correctiveActionId?: string | null
  evidenceHash?: string | null
  occurredAt?: string | null
}

export interface IncidentGovernanceWebhookMetadata {
  schemaVersion: 'authenchain.incident-governance.webhook-metadata.v1'
  eventType: AuthenChainIncidentWebhookEventType
  deliveryImplemented: false
  metadataOnly: true
  incidentId?: string | null
  workspaceId?: string | null
  incidentHash?: string | null
  severity?: string | null
  previousSeverity?: string | null
  status?: string | null
  deadlineId?: string | null
  alertId?: string | null
  correctiveActionId?: string | null
  evidenceHash?: string | null
  occurredAt: string
  limitations: string[]
}

export interface CaptureAssurance {
  schemaVersion: 'authenchain.assurance.v1'
  assuranceLevel: 'A0' | 'A1'
  captureMethod: 'attest_submitted_hash' | 'observe_submitted_content'
  contentObserved: boolean
  limitations: string[]
}

export interface MetadataInput {
  schema_version?: '1.0' | '1.1'
  assurance?: CaptureAssurance
  issuer: string
  content_type?: AuthenChainContentType
  created_at?: string
  nonce?: string
  trace_id?: string
  model?: string
  user_ref?: string
  extra?: JsonObject
  regulatory?: RegulatoryMetadataV1
}

export interface ProvenanceMetadata {
  schema_version: '1.0' | '1.1'
  assurance?: CaptureAssurance
  issuer: string
  content_type: AuthenChainContentType
  created_at: string
  nonce: string
  trace_id: string
  model?: string
  user_ref?: string
  extra?: JsonObject
  regulatory?: RegulatoryMetadataV1
}

export interface ContentEvidenceSideInput {
  content?: string
  content_hash?: string
  content_encoding?: AuthenChainContentEncoding
  artifactId?: string
  encrypted?: boolean
  keyOwnership?: 'authenchain_managed' | 'customer_managed'
  rawContentStored?: false
}

export interface ContentEvidenceInput {
  // PHASE3-SDK-003: captureMode is now load-bearing. When any side
  // carries plaintext `.content`, the SDK requires an explicit value -
  // omitting it fails closed with `CONTENT_EVIDENCE_MODE_REQUIRED`.
  // `hash_only` strips plaintext server-bound; `encrypted` asserts the
  // caller already encrypted the content client-side; the new
  // `plaintext_acknowledged` value is the deliberate opt-in for callers
  // that intentionally send plaintext evidence to the AuthenChain server
  // (integration tests / debug / contractually approved scenarios).
  captureMode?: 'hash_only' | 'encrypted' | 'plaintext_acknowledged'
  encryptionMode?: 'authenchain_managed' | 'byok'
  kmsProvider?: 'local' | 'aws'
  kmsKeyId?: string
  input?: ContentEvidenceSideInput
  output?: ContentEvidenceSideInput
}

export interface SignInput extends OperationRequestOptions {
  content?: string
  contentHash?: string
  // R7T-015 (Sprint 3D): when true and `content` is supplied, the SDK computes the
  // SHA-256 of the content locally, discards the raw content from the request body,
  // and sends only the hash. Recommended for security-sensitive callers.
  hashOnly?: boolean
  contentEncoding?: AuthenChainContentEncoding
  contentEvidence?: ContentEvidenceInput
  metadata: MetadataInput | ProvenanceMetadata
  generateMetadataDefaults?: boolean
  aiUseCaseId?: string
  riskClassificationId?: string
  impactAssessmentId?: string
  impactAssessmentHash?: string
  impactAssessmentGate?: JsonObject
  riskContext?: JsonObject
  aiInventory?: AuthenChainAiInventoryBindingReference | AuthenChainAiInventoryBinding | ResolveAiInventoryBindingResponse
}

export interface SignResponseWire {
  trace_id: string
  content_hash: string
  metadata: ProvenanceMetadata
  signature: string
  public_key_id: string
  kid: string
  algorithm: string
  signed_at: string
  disclaimer?: string
  contentEvidence?: unknown
  [key: string]: unknown
}

export interface SignResponse extends SignResponseWire {
  traceId: string
  contentHash: string
  metadata: ProvenanceMetadata
  signature: string
  publicKeyId: string
  kid: string
  algorithm: string
  signedAt: string
  disclaimer?: string
  rawResponse: SignResponseWire
}

export interface VerifyInputBase extends OperationRequestOptions {
  content?: string
  contentHash?: string
  contentEncoding?: AuthenChainContentEncoding
  contentEvidence?: ContentEvidenceInput
  generateMetadataDefaults?: boolean
}

export interface VerifyInputWithFields extends VerifyInputBase {
  metadata: MetadataInput | ProvenanceMetadata
  signature: string
  publicKeyId: string
}

export interface VerifyInputWithProvenance extends VerifyInputBase {
  provenance: Pick<SignResponse, 'metadata' | 'signature' | 'publicKeyId'>
}

export type VerifyInput = VerifyInputWithFields | VerifyInputWithProvenance

export interface VerifyResponseWire {
  trace_id: string
  verified: boolean
  reason: string | null
  content_hash: string | null
  origin_verified: boolean
  integrity: 'intact' | 'modified' | 'unknown'
  issuer_verified: boolean
  reason_codes: string[]
  verified_at: string
  signature_valid?: boolean | null
  key_resolved?: boolean
  key_status?: 'active' | 'not_found' | 'revoked' | 'retired' | 'not_yet_valid' | 'expired' | 'not_evaluated' | string
  issuer_match?: boolean | null
  evidence_chain?: { status: string; reason?: string }
  capture_assurance?: { schema_version?: string | null; assurance_level: string; capture_method: string; content_observed?: boolean | null; authenticated?: boolean; declared_assurance_level?: string | null; limitations?: string[] }
  legal_conclusion?: 'none'
  contentEvidenceVerification?: unknown
  disclaimer?: string
  [key: string]: unknown
}

export interface VerifyResponse extends VerifyResponseWire {
  verificationScope: 'provenance'
  externalTrustAvailable: false
  externalTrustWarning: string
  traceId: string
  verified: boolean
  reason: string | null
  contentHash: string | null
  originVerified: boolean
  integrity: 'intact' | 'modified' | 'unknown'
  issuerVerified: boolean
  reasonCodes: string[]
  verifiedAt: string
  contentEvidenceVerification?: unknown
  disclaimer?: string
  rawResponse: VerifyResponseWire
}

export interface CaptureGenerationInput<TOutput = string> extends MetadataInput, OperationRequestOptions {
  output: TOutput
  serializeOutput?: (output: TOutput) => string
  contentEncoding?: AuthenChainContentEncoding
  generateMetadataDefaults?: boolean
}

export interface CaptureGenerationResponse<TOutput = string> {
  output: TOutput
  provenance: SignResponse
}

export interface CaptureRegulatedOutputInput<TOutput = string> extends OperationRequestOptions {
  output: TOutput
  serializeOutput?: (output: TOutput) => string
  contentEncoding?: AuthenChainContentEncoding
  schema_version?: '1.0' | '1.1'
  assurance?: CaptureAssurance
  issuer: string
  content_type?: AuthenChainContentType
  created_at?: string
  nonce?: string
  trace_id?: string
  model?: string
  user_ref?: string
  extra?: JsonObject
  regulatory: RegulatoryMetadataV1
  generateMetadataDefaults?: boolean
}

export interface CaptureRegulatedOutputResponse<TOutput = string> {
  output: TOutput
  provenance: SignResponse
  regulatory: {
    metadataValid: true
    regulatoryEvidenceStatus: 'complete' | 'incomplete'
    legalCompliance: 'not_determined'
    warnings: Array<{
      severity: 'error' | 'warning'
      code: string
      path: string
      message: string
    }>
  }
}

export interface VerifyRegulatoryEvidenceInput extends OperationRequestOptions {
  content?: string
  contentHash?: string
  contentEncoding?: AuthenChainContentEncoding
  contentEvidence?: ContentEvidenceInput
  provenance?: Pick<SignResponse, 'metadata' | 'signature' | 'publicKeyId'>
  evidencePack?: unknown
  contentEvidenceByProofIndex?: unknown
  verificationScope?: AuthenChainRegulatoryVerificationScope
}

export interface VerifyRegulatoryEvidenceResponse {
  schemaVersion: 'authenchain.regulatory-verification.v1'
  verificationScope: AuthenChainRegulatoryVerificationScope
  environment: 'live' | 'mock'
  mock?: true
  provenanceVerified: boolean | null
  evidencePackVerified: boolean | null
  regulatoryEvidenceStatus: AuthenChainRegulatoryEvidenceStatus
  legalCompliance: AuthenChainLegalComplianceStatus
  traceId?: string
  reason?: string | null
  reasonCodes: string[]
  warnings: string[]
  failures: string[]
  customerResponsibilities: string[]
  provenanceVerification?: VerifyResponse
  evidencePackVerification?: VerifyEvidencePackResponse
}

export interface WrapGenerationResultObject {
  output: string
  model?: string
  provider?: string
  raw?: unknown
}

export type WrapGenerationCallbackResult = string | WrapGenerationResultObject

export type WrapGenerationOutputFromResult<TResult> =
  TResult extends string
    ? string
    : TResult extends { output: infer TOutput extends string }
      ? TOutput
      : TResult

export interface WrapGenerationInput<
  TResult = WrapGenerationCallbackResult,
  TOutput = WrapGenerationOutputFromResult<TResult>,
> extends MetadataInput,
    OperationRequestOptions {
  run?: () => Promise<TResult> | TResult
  generate?: () => Promise<TResult> | TResult
  mapOutput?: (result: TResult) => Promise<TOutput> | TOutput
  serializeOutput?: (output: TOutput) => string
  contentEncoding?: AuthenChainContentEncoding
  generateMetadataDefaults?: boolean
}

export interface WrapGenerationResponse<
  TResult = WrapGenerationCallbackResult,
  TOutput = WrapGenerationOutputFromResult<TResult>,
> {
  result: TResult
  output: TOutput
  provenance: SignResponse
}

export interface ExportEvidencePackInput extends OperationRequestOptions {
  traceId?: string
  from?: string | Date
  to?: string | Date
  limit?: number
}

export type EvidencePackProofStatus = 'complete' | 'incomplete' | 'failed' | 'no_records'
export type EvidencePackAuthenticityStatus =
  | 'authenchain_issued'
  | 'missing_envelope'
  | 'invalid_envelope'
  | 'unknown_signing_key'
  | 'not_authenchain_issued'
export type EvidencePackTrustedStatus = 'trusted' | 'untrusted' | 'failed' | 'incomplete' | 'no_records'

export interface EvidencePackVerificationConclusion {
  internalProofStatus: EvidencePackProofStatus
  authenticityStatus: EvidencePackAuthenticityStatus
  trustedStatus: EvidencePackTrustedStatus
  externallyTrustworthy: boolean
  reason: string
}

export interface EvidencePackTrustFields {
  internalProofStatus: EvidencePackProofStatus
  authenticityStatus: EvidencePackAuthenticityStatus
  trustedStatus: EvidencePackTrustedStatus
  externallyTrustworthy: boolean
  verificationConclusion: EvidencePackVerificationConclusion
}

export interface ExportEvidencePackResponse {
  internalProofStatus: EvidencePackProofStatus
  authenticityStatus: EvidencePackAuthenticityStatus
  trustedStatus: EvidencePackTrustedStatus
  externallyTrustworthy: boolean
  verificationConclusion: EvidencePackVerificationConclusion
  proofs: unknown[]
  evidenceEnvelope?: unknown
  contentEvidence?: unknown
  rawResponse: Record<string, unknown>
  [key: string]: unknown
}

export interface VerifyEvidencePackInput extends OperationRequestOptions {
  evidencePack: unknown
  contentEvidenceByProofIndex?: unknown
}

export interface VerifyEvidencePackResponse extends EvidencePackTrustFields {
  status?: EvidencePackTrustedStatus
  proofs?: unknown[]
  rawResponse: Record<string, unknown>
  [key: string]: unknown
}

export interface RegulatoryEvidencePackSummary {
  trustedStatus: EvidencePackTrustedStatus
  authenticityStatus: EvidencePackAuthenticityStatus
  internalProofStatus: EvidencePackProofStatus
  externallyTrustworthy: boolean
  regulatoryEvidenceStatus: AuthenChainRegulatoryEvidenceStatus
  legalCompliance: AuthenChainLegalComplianceStatus
  warnings: string[]
  failures: string[]
}

export interface AuthenChainApiErrorPayload {
  error?: string
  code?: string
  message?: string
  trace_id?: string
  request_id?: string
  [key: string]: unknown
}

export type AuthenChainOptions = AuthenChainConfig
export type AuthenChainMetadataInput = MetadataInput
export type AuthenChainProvenanceMetadata = ProvenanceMetadata
export type AuthenChainSignInput = SignInput
export type AuthenChainSignedProvenance = SignResponse
export type AuthenChainVerifyInput = VerifyInput
export type AuthenChainVerification = VerifyResponse
export type AuthenChainVerifyRegulatoryEvidenceInput = VerifyRegulatoryEvidenceInput
export type AuthenChainRegulatoryEvidenceVerification = VerifyRegulatoryEvidenceResponse
export type AuthenChainVerifyEvidencePackInput = VerifyEvidencePackInput
export type AuthenChainVerifyEvidencePackResponse = VerifyEvidencePackResponse
export type AuthenChainExportEvidencePackInput = ExportEvidencePackInput
export type AuthenChainExportEvidencePackResponse = ExportEvidencePackResponse
export type AuthenChainListImpactAssessmentsInput = ListImpactAssessmentsInput
export type AuthenChainListImpactAssessmentsResponse = ListImpactAssessmentsResponse
export type AuthenChainCreateImpactAssessmentDraftInput = CreateImpactAssessmentDraftInput
export type AuthenChainCreateImpactAssessmentDraftResponse = CreateImpactAssessmentDraftResponse
export type AuthenChainUpdateImpactAssessmentAnswersInput = UpdateImpactAssessmentAnswersInput
export type AuthenChainUpdateImpactAssessmentAnswersResponse = UpdateImpactAssessmentAnswersResponse
export type AuthenChainSubmitImpactAssessmentInput = SubmitImpactAssessmentInput
export type AuthenChainSubmitImpactAssessmentResponse = SubmitImpactAssessmentResponse
export type AuthenChainGetImpactAssessmentInput = GetImpactAssessmentInput
export type AuthenChainGetImpactAssessmentResponse = GetImpactAssessmentResponse
export type AuthenChainExportImpactAssessmentEvidencePackInput = ExportImpactAssessmentEvidencePackInput
export type AuthenChainExportImpactAssessmentEvidencePackResponse = ExportImpactAssessmentEvidencePackResponse
export type AuthenChainVerifyImpactAssessmentEvidencePackInput = VerifyImpactAssessmentEvidencePackInput
export type AuthenChainVerifyImpactAssessmentEvidencePackResponse = VerifyImpactAssessmentEvidencePackResponse
export type AuthenChainListControlFrameworksInput = ListControlFrameworksInput
export type AuthenChainListControlFrameworksResponse = ListControlFrameworksResponse
export type AuthenChainListControlRequirementsInput = ListControlRequirementsInput
export type AuthenChainListControlRequirementsResponse = ListControlRequirementsResponse
export type AuthenChainPreviewControlMappingInput = PreviewControlMappingInput
export type AuthenChainPreviewControlMappingResponse = PreviewControlMappingResponse
export type AuthenChainGenerateControlMappingSnapshotInput = GenerateControlMappingSnapshotInput
export type AuthenChainGenerateControlMappingSnapshotResponse = GenerateControlMappingSnapshotResponse
export type AuthenChainGetControlMappingSnapshotInput = GetControlMappingSnapshotInput
export type AuthenChainGetControlMappingSnapshotResponse = GetControlMappingSnapshotResponse
export type AuthenChainExportControlMappingEvidencePackSectionInput = ExportControlMappingEvidencePackSectionInput
export type AuthenChainExportControlMappingEvidencePackSectionResponse = ExportControlMappingEvidencePackSectionResponse
export type AuthenChainGetControlMappingMaturityInput = GetControlMappingMaturityInput
export type AuthenChainGetControlMappingMaturityResponse = GetControlMappingMaturityResponse
export type AuthenChainListAiInventorySystemsInput = ListAiInventorySystemsInput
export type AuthenChainListAiInventorySystemsResponse = ListAiInventorySystemsResponse
export type AuthenChainCreateAiInventorySystemInput = CreateAiInventorySystemInput
export type AuthenChainCreateAiInventorySystemResponse = CreateAiInventorySystemResponse
export type AuthenChainCreateAiInventoryModelVersionInput = CreateAiInventoryModelVersionInput
export type AuthenChainCreateAiInventoryModelVersionResponse = CreateAiInventoryModelVersionResponse
export type AuthenChainCreateAiInventoryDeploymentInput = CreateAiInventoryDeploymentInput
export type AuthenChainCreateAiInventoryDeploymentResponse = CreateAiInventoryDeploymentResponse
export type AuthenChainActivateAiInventoryDeploymentInput = ActivateAiInventoryDeploymentInput
export type AuthenChainActivateAiInventoryDeploymentResponse = ActivateAiInventoryDeploymentResponse
export type AuthenChainRequestAiInventoryModelChangeInput = RequestAiInventoryModelChangeInput
export type AuthenChainRequestAiInventoryModelChangeResponse = RequestAiInventoryModelChangeResponse
export type AuthenChainResolveAiInventoryBindingInput = ResolveAiInventoryBindingInput
export type AuthenChainResolveAiInventoryBindingResponse = ResolveAiInventoryBindingResponse
export type AuthenChainFetchAiInventoryBindingInput = FetchAiInventoryBindingInput
export type AuthenChainFetchAiInventoryBindingResponse = FetchAiInventoryBindingResponse
export type AuthenChainCreateDisclosureNoticeSnapshotInput = CreateDisclosureNoticeSnapshotInput
export type AuthenChainCreateDisclosureNoticeSnapshotResponse = CreateDisclosureNoticeSnapshotResponse
export type AuthenChainRecordDisclosureApplicationInput = RecordDisclosureApplicationInput
export type AuthenChainRecordDisclosureApplicationResponse = RecordDisclosureApplicationResponse
export type AuthenChainRecordSyntheticContentDeclarationInput = RecordSyntheticContentDeclarationInput
export type AuthenChainRecordSyntheticContentDeclarationResponse = RecordSyntheticContentDeclarationResponse
export type AuthenChainRecordContentMarkingInput = RecordContentMarkingInput
export type AuthenChainRecordContentMarkingResponse = RecordContentMarkingResponse
export type AuthenChainResolveDisclosureBindingInput = ResolveDisclosureBindingInput
export type AuthenChainResolveDisclosureBindingResponse = ResolveDisclosureBindingResponse
export type AuthenChainSignWithDisclosureEvidenceInput = SignWithDisclosureEvidenceInput
export type AuthenChainVerifyDisclosureEvidencePackInput = VerifyDisclosureEvidencePackInput
export type AuthenChainVerifyDisclosureEvidencePackResponse = VerifyDisclosureEvidencePackResponse
export type AuthenChainListRegulatoryIncidentsInput = ListRegulatoryIncidentsInput
export type AuthenChainListRegulatoryIncidentsResponse = ListRegulatoryIncidentsResponse
export type AuthenChainCreateRegulatoryIncidentInput = CreateRegulatoryIncidentInput
export type AuthenChainCreateRegulatoryIncidentResponse = CreateRegulatoryIncidentResponse
export type AuthenChainGetRegulatoryIncidentInput = GetRegulatoryIncidentInput
export type AuthenChainGetRegulatoryIncidentResponse = GetRegulatoryIncidentResponse
export type AuthenChainUpdateRegulatoryIncidentTriageInput = UpdateRegulatoryIncidentTriageInput
export type AuthenChainUpdateRegulatoryIncidentTriageResponse = UpdateRegulatoryIncidentTriageResponse
export type AuthenChainLinkRegulatoryIncidentEvidenceInput = LinkRegulatoryIncidentEvidenceInput
export type AuthenChainLinkRegulatoryIncidentEvidenceResponse = LinkRegulatoryIncidentEvidenceResponse
export type AuthenChainTransitionRegulatoryIncidentInput = TransitionRegulatoryIncidentInput
export type AuthenChainTransitionRegulatoryIncidentResponse = TransitionRegulatoryIncidentResponse
export type AuthenChainCreateRegulatoryIncidentCorrectiveActionInput = CreateRegulatoryIncidentCorrectiveActionInput
export type AuthenChainCreateRegulatoryIncidentCorrectiveActionResponse = CreateRegulatoryIncidentCorrectiveActionResponse
export type AuthenChainVerifyRegulatoryIncidentCorrectiveActionInput = VerifyRegulatoryIncidentCorrectiveActionInput
export type AuthenChainVerifyRegulatoryIncidentCorrectiveActionResponse = VerifyRegulatoryIncidentCorrectiveActionResponse
export type AuthenChainExportRegulatoryIncidentEvidencePackInput = ExportRegulatoryIncidentEvidencePackInput
export type AuthenChainExportRegulatoryIncidentEvidencePackResponse = ExportRegulatoryIncidentEvidencePackResponse
export type AuthenChainListRegulatoryEvidenceFailureAlertsInput = ListRegulatoryEvidenceFailureAlertsInput
export type AuthenChainListRegulatoryEvidenceFailureAlertsResponse = ListRegulatoryEvidenceFailureAlertsResponse
export type AuthenChainGenerateRegulatoryIncidentRecurrenceReportInput = GenerateRegulatoryIncidentRecurrenceReportInput
export type AuthenChainGenerateRegulatoryIncidentRecurrenceReportResponse = GenerateRegulatoryIncidentRecurrenceReportResponse
export type AuthenChainIncidentGovernanceWebhookMetadataInput = IncidentGovernanceWebhookMetadataInput
export type AuthenChainIncidentGovernanceWebhookMetadata = IncidentGovernanceWebhookMetadata
export type AuthenChainRegulatoryEvidencePackSummary = RegulatoryEvidencePackSummary
export type AuthenChainCaptureGenerationInput<TOutput = string> = CaptureGenerationInput<TOutput>
export type AuthenChainCapturedGeneration<TOutput = string> = CaptureGenerationResponse<TOutput>
export type AuthenChainCaptureRegulatedOutputInput<TOutput = string> = CaptureRegulatedOutputInput<TOutput>
export type AuthenChainCapturedRegulatedOutput<TOutput = string> = CaptureRegulatedOutputResponse<TOutput>
export type AuthenChainWrapGenerationInput<
  TResult = WrapGenerationCallbackResult,
  TOutput = WrapGenerationOutputFromResult<TResult>,
> = WrapGenerationInput<TResult, TOutput>
export type AuthenChainWrappedGeneration<
  TResult = WrapGenerationCallbackResult,
  TOutput = WrapGenerationOutputFromResult<TResult>,
> = WrapGenerationResponse<TResult, TOutput>
