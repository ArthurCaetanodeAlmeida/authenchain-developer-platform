import { AuthenChainHttpClient } from './client.js'
import { captureGeneration } from './capture-generation.js'
import { captureRegulatedOutput } from './capture-regulated-output.js'
import { exportEvidencePack, summarizeRegulatoryEvidencePack, verifyEvidencePack } from './evidence-pack.js'
import {
  REGULATORY_METADATA_CONTENT_TYPES,
  REGULATORY_METADATA_JURISDICTIONS,
  REGULATORY_METADATA_LABEL_TYPES,
  REGULATORY_METADATA_RISK_CONTEXTS,
  REGULATORY_METADATA_SCHEMA_VERSION,
  validateRegulatoryMetadata,
} from './regulatory-metadata.js'
import {
  AuthenChainApiError,
  AuthenChainError,
  AuthenChainHookError,
  AuthenChainNetworkError,
  AuthenChainTimeoutError,
  AuthenChainValidationError,
} from './errors.js'
import {
  mockCaptureGeneration,
  mockCaptureRegulatedOutput,
  mockExportEvidencePack,
  mockSign,
  mockVerify,
  mockVerifyEvidencePack,
  mockVerifyRegulatoryEvidence,
  mockWrapGeneration,
} from './mock.js'
import {
  signProvenance,
  signWithContentHash as signWithContentHashImpl,
  type SignWithContentHashInput,
} from './sign.js'
import {
  classifyAiUseCase,
  createAiUseCase,
  getAiUseCase,
  getRiskClassificationHistory,
  listAiUseCases,
  signWithRiskContext,
} from './risk-classification.js'
import {
  createImpactAssessmentDraft,
  exportImpactAssessmentEvidencePack,
  getImpactAssessment,
  listImpactAssessments,
  submitImpactAssessment,
  updateImpactAssessmentAnswers,
  verifyImpactAssessmentEvidencePack,
} from './impact-assessment.js'
import {
  exportControlMappingEvidencePackSection,
  generateControlMappingSnapshot,
  getControlMappingMaturity,
  getControlMappingSnapshot,
  listControlFrameworks,
  listControlRequirements,
  previewControlMapping,
} from './control-mapping.js'
import {
  activateAiInventoryDeployment,
  attachAiInventoryBindingToMetadata,
  createAiInventoryDeployment,
  createAiInventoryModelVersion,
  createAiInventorySystem,
  fetchAiInventoryBinding,
  getAiInventorySystem,
  listAiInventorySystems,
  requestAiInventoryModelChange,
  resolveAiInventoryBinding,
} from './ai-inventory.js'
import {
  attachDisclosureBindingToMetadata,
  createDisclosureNoticeSnapshot,
  recordContentMarking,
  recordDisclosureApplication,
  recordSyntheticContentDeclaration,
  resolveDisclosureBinding,
  signWithDisclosureEvidence,
  verifyDisclosureEvidencePack,
} from './disclosure-transparency.js'
import {
  buildIncidentGovernanceWebhookMetadata,
  createRegulatoryIncident,
  createRegulatoryIncidentCorrectiveAction,
  exportRegulatoryIncidentEvidencePack,
  generateRegulatoryIncidentRecurrenceReport,
  getRegulatoryIncident,
  linkRegulatoryIncidentEvidence,
  listRegulatoryEvidenceFailureAlerts,
  listRegulatoryIncidents,
  transitionRegulatoryIncident,
  updateRegulatoryIncidentTriage,
  verifyRegulatoryIncidentCorrectiveAction,
} from './incident-governance.js'
import {
  getGovernanceReadiness,
  getMcpContext,
  listPendingGovernance,
  lookupPublicEvidence,
} from './mcp-api.js'
import type {
  ActivateAiInventoryDeploymentInput,
  ActivateAiInventoryDeploymentResponse,
  AuthenChainCapturedGeneration,
  AuthenChainFetchAiInventoryBindingInput,
  AuthenChainFetchAiInventoryBindingResponse,
  AuthenChainExportEvidencePackInput,
  AuthenChainExportEvidencePackResponse,
  AuthenChainExportImpactAssessmentEvidencePackInput,
  AuthenChainExportImpactAssessmentEvidencePackResponse,
  AuthenChainCaptureGenerationInput,
  AuthenChainCaptureRegulatedOutputInput,
  AuthenChainAiInventoryBinding,
  AuthenChainAiInventoryBindingReference,
  AuthenChainConfig,
  AuthenChainOptions,
  AuthenChainRegulatoryContentType,
  AuthenChainRegulatoryJurisdiction,
  AuthenChainRegulatoryLabelType,
  AuthenChainRegulatoryRiskContext,
  AuthenChainRegulatoryEvidenceStatus,
  AuthenChainRegulatoryVerificationScope,
  AuthenChainLegalComplianceStatus,
  AuthenChainRegulatoryEvidencePackSummary,
  AuthenChainRegulatoryEvidenceVerification,
  AuthenChainSignInput,
  AuthenChainSignedProvenance,
  AuthenChainVerification,
  AuthenChainVerifyRegulatoryEvidenceInput,
  AuthenChainVerifyEvidencePackInput,
  AuthenChainVerifyEvidencePackResponse,
  AuthenChainVerifyInput,
  AuthenChainWrappedGeneration,
  AuthenChainAiUseCaseInput,
  AuthenChainAiUseCase,
  AuthenChainAiInventorySystem,
  AuthenChainContentMarking,
  AuthenChainCreateDisclosureNoticeSnapshotInput,
  AuthenChainCreateDisclosureNoticeSnapshotResponse,
  AuthenChainDisclosureApplication,
  AuthenChainDisclosureNoticeSnapshot,
  AuthenChainDisclosureBinding,
  AuthenChainRecordContentMarkingInput,
  AuthenChainRecordContentMarkingResponse,
  AuthenChainRecordDisclosureApplicationInput,
  AuthenChainRecordDisclosureApplicationResponse,
  AuthenChainRecordSyntheticContentDeclarationInput,
  AuthenChainRecordSyntheticContentDeclarationResponse,
  AuthenChainResolveDisclosureBindingInput,
  AuthenChainResolveDisclosureBindingResponse,
  AuthenChainSignWithDisclosureEvidenceInput,
  AuthenChainSyntheticContentDeclaration,
  AuthenChainVerifyDisclosureEvidencePackInput,
  AuthenChainVerifyDisclosureEvidencePackResponse,
  AuthenChainCorrectiveAction,
  AuthenChainCorrectiveActionStatus,
  AuthenChainCorrectiveActionType,
  AuthenChainCreateRegulatoryIncidentCorrectiveActionInput,
  AuthenChainCreateRegulatoryIncidentCorrectiveActionResponse,
  AuthenChainCreateRegulatoryIncidentInput,
  AuthenChainCreateRegulatoryIncidentResponse,
  AuthenChainEvidenceFailureAlert,
  AuthenChainEvidenceFailureStatus,
  AuthenChainExportRegulatoryIncidentEvidencePackInput,
  AuthenChainExportRegulatoryIncidentEvidencePackResponse,
  AuthenChainGenerateRegulatoryIncidentRecurrenceReportInput,
  AuthenChainGenerateRegulatoryIncidentRecurrenceReportResponse,
  AuthenChainGetRegulatoryIncidentInput,
  AuthenChainGetRegulatoryIncidentResponse,
  AuthenChainIncidentGovernanceWebhookMetadataInput,
  AuthenChainIncidentGovernanceWebhookMetadata,
  AuthenChainIncidentAffectedGroup,
  AuthenChainIncidentEvidenceLink,
  AuthenChainIncidentEvidenceLinkType,
  AuthenChainIncidentEvidenceVerificationStatus,
  AuthenChainIncidentPriority,
  AuthenChainIncidentRecord,
  AuthenChainIncidentRecurrenceReport,
  AuthenChainIncidentSeverity,
  AuthenChainIncidentSource,
  AuthenChainIncidentStatus,
  AuthenChainIncidentWebhookEventType,
  AuthenChainLinkRegulatoryIncidentEvidenceInput,
  AuthenChainLinkRegulatoryIncidentEvidenceResponse,
  AuthenChainListRegulatoryEvidenceFailureAlertsInput,
  AuthenChainListRegulatoryEvidenceFailureAlertsResponse,
  AuthenChainListRegulatoryIncidentsInput,
  AuthenChainListRegulatoryIncidentsResponse,
  AuthenChainTransitionRegulatoryIncidentInput,
  AuthenChainTransitionRegulatoryIncidentResponse,
  AuthenChainUpdateRegulatoryIncidentTriageInput,
  AuthenChainUpdateRegulatoryIncidentTriageResponse,
  AuthenChainVerifyRegulatoryIncidentCorrectiveActionInput,
  AuthenChainVerifyRegulatoryIncidentCorrectiveActionResponse,
  AuthenChainAiModelDeploymentLifecycleStatus,
  AuthenChainAiModelProvider,
  AuthenChainAiModelVersion,
  AuthenChainAiSystemLifecycleStatus,
  AuthenChainRiskClassification,
  AuthenChainRiskClassificationSummary,
  AuthenChainRiskDecisionType,
  AuthenChainRiskJurisdiction,
  AuthenChainRiskReviewStatus,
  AuthenChainRiskSector,
  AuthenChainRiskTier,
  AuthenChainSignedRiskContext,
  AuthenChainControlFramework,
  AuthenChainControlFrameworkId,
  AuthenChainControlMappingJurisdiction,
  AuthenChainControlMappingMaturity,
  AuthenChainControlMappingPreview,
  AuthenChainControlMappingShareMode,
  AuthenChainControlMappingSnapshot,
  AuthenChainControlMappingStatus,
  AuthenChainControlRequirement,
  AuthenChainExportControlMappingEvidencePackSectionInput,
  AuthenChainExportControlMappingEvidencePackSectionResponse,
  AuthenChainGenerateControlMappingSnapshotInput,
  AuthenChainGenerateControlMappingSnapshotResponse,
  AuthenChainGetControlMappingMaturityInput,
  AuthenChainGetControlMappingMaturityResponse,
  AuthenChainGetControlMappingSnapshotInput,
  AuthenChainGetControlMappingSnapshotResponse,
  AuthenChainListControlFrameworksInput,
  AuthenChainListControlFrameworksResponse,
  AuthenChainListControlRequirementsInput,
  AuthenChainListControlRequirementsResponse,
  AuthenChainPreviewControlMappingInput,
  AuthenChainPreviewControlMappingResponse,
  AuthenChainSubmitImpactAssessmentInput,
  AuthenChainSubmitImpactAssessmentResponse,
  AuthenChainUpdateImpactAssessmentAnswersInput,
  AuthenChainUpdateImpactAssessmentAnswersResponse,
  AuthenChainVerifyImpactAssessmentEvidencePackInput,
  AuthenChainVerifyImpactAssessmentEvidencePackResponse,
  ClassifyAiUseCaseInput,
  ClassifyAiUseCaseResponse,
  CreateAiUseCaseResponse,
  CreateImpactAssessmentDraftResponse,
  AuthenChainCapturedRegulatedOutput,
  AuthenChainWrapGenerationInput,
  CaptureGenerationInput,
  CaptureGenerationResponse,
  CaptureRegulatedOutputInput,
  CaptureRegulatedOutputResponse,
  ContentEvidenceInput,
  ContentEvidenceSideInput,
  CreateAiInventoryDeploymentInput,
  CreateAiInventoryDeploymentResponse,
  CreateAiInventoryModelVersionInput,
  CreateAiInventoryModelVersionResponse,
  CreateAiInventorySystemInput,
  CreateAiInventorySystemResponse,
  MetadataInput,
  OperationRequestOptions,
  ProvenanceMetadata,
  RegulatoryMetadataV1,
  RegulatoryEvidencePackSummary,
  RequestHookContext,
  ResponseHookContext,
  ErrorHookContext,
  EvidencePackTrustFields,
  ExportEvidencePackInput,
  ExportEvidencePackResponse,
  GetImpactAssessmentResponse,
  GetAiUseCaseInput,
  GetAiUseCaseResponse,
  GetAiInventorySystemInput,
  GetAiInventorySystemResponse,
  GetGovernanceReadinessInput,
  GetGovernanceReadinessResponse,
  GetMcpContextResponse,
  GetRiskClassificationHistoryInput,
  GetRiskClassificationHistoryResponse,
  ListAiInventorySystemsInput,
  ListAiInventorySystemsResponse,
  ListAiUseCasesInput,
  ListAiUseCasesResponse,
  ListPendingGovernanceInput,
  ListPendingGovernanceResponse,
  ListImpactAssessmentsResponse,
  LookupPublicEvidenceInput,
  LookupPublicEvidenceResponse,
  RetryConfig,
  RequestAiInventoryModelChangeInput,
  RequestAiInventoryModelChangeResponse,
  ResolveAiInventoryBindingInput,
  ResolveAiInventoryBindingResponse,
  SignInput,
  SignResponse,
  SignWithRiskContextInput,
  VerifyInput,
  VerifyRegulatoryEvidenceInput,
  VerifyRegulatoryEvidenceResponse,
  VerifyEvidencePackInput,
  VerifyEvidencePackResponse,
  VerifyResponse,
  CreateImpactAssessmentDraftInput,
  ExportImpactAssessmentEvidencePackInput,
  ExportImpactAssessmentEvidencePackResponse,
  GetImpactAssessmentInput,
  ListImpactAssessmentsInput,
  SubmitImpactAssessmentInput,
  SubmitImpactAssessmentResponse,
  UpdateImpactAssessmentAnswersInput,
  UpdateImpactAssessmentAnswersResponse,
  VerifyImpactAssessmentEvidencePackInput,
  VerifyImpactAssessmentEvidencePackResponse,
  WrapGenerationCallbackResult,
  WrapGenerationInput,
  WrapGenerationOutputFromResult,
  WrapGenerationResponse,
  WrapGenerationResultObject,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from './types.js'
import type {
  RegulatoryMetadataIssueSeverity,
  RegulatoryMetadataValidationIssue,
  RegulatoryMetadataValidationResult,
} from './regulatory-metadata.js'
import { verifyProvenance } from './verify.js'
import { verifyRegulatoryEvidence } from './verify-regulatory-evidence.js'
import { wrapGeneration } from './wrap-generation.js'

function mockImpactAssessment(overrides: {
  id?: string
  useCaseId?: string
  jurisdiction?: AuthenChainRegulatoryJurisdiction
  status?: string
  assessmentKey?: string | null
  assessmentType?: string | null
  questionnaire?: JsonObject | null
  fundamentalRightsAssessment?: JsonObject | null
  dataAssessment?: JsonObject | null
  affectedGroupAssessment?: JsonObject | null
  periodicReview?: JsonObject | null
} = {}) {
  return {
    id: overrides.id ?? 'mock_impact_assessment',
    tenantId: 'mock_tenant',
    useCaseId: overrides.useCaseId ?? 'mock_use_case',
    assessmentKey: overrides.assessmentKey ?? 'mock-assessment',
    version: 1,
    schemaVersion: 'authenchain.ai-impact-assessment.v1',
    status: overrides.status ?? 'draft',
    jurisdiction: overrides.jurisdiction ?? 'EU',
    assessmentType: overrides.assessmentType ?? 'pre_production',
    sourceRiskClassificationId: null,
    sourceRiskTier: null,
    sourceRiskPolicyVersion: null,
    sourceRiskRulesetHash: null,
    mitigationSummary: { total: 0, openCritical: 0 },
    approvalSummary: null,
    periodicReview: overrides.periodicReview ?? null,
    limitations: [
      'technical_evidence_only',
      'customer_responsible_for_legal_review',
    ],
    customerResponsibilities: [
      'complete_assessment_before_production_use',
      'maintain_human_review_and_mitigations',
    ],
    assessmentHash: 'sha256:mock-impact-assessment',
    createdByUserId: 'mock_user',
    updatedByUserId: 'mock_user',
    approvedByUserId: null,
    approvedAt: null,
    expiresAt: null,
    supersededByAssessmentId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    questionnaire: overrides.questionnaire ?? null,
    fundamentalRightsAssessment: overrides.fundamentalRightsAssessment ?? null,
    dataAssessment: overrides.dataAssessment ?? null,
    affectedGroupAssessment: overrides.affectedGroupAssessment ?? null,
    mitigations: [],
    approvals: [],
    reviews: [],
    evidenceExports: [],
  }
}

function mockControlFramework(overrides: Partial<AuthenChainControlFramework> = {}): AuthenChainControlFramework {
  return {
    id: overrides.id ?? 'eu_ai_act',
    label: overrides.label ?? 'EU AI Act',
    jurisdiction: overrides.jurisdiction ?? 'EU',
    versionDate: overrides.versionDate ?? '2024-07-12',
    status: overrides.status ?? 'active',
    sourceLabel: overrides.sourceLabel ?? 'Regulatory framework catalog',
    sourceUrl: overrides.sourceUrl ?? null,
    catalogVersion: overrides.catalogVersion ?? 'authenchain.control-framework-catalog.mock.v1',
    legalCompliance: 'not_determined',
    ...overrides,
  }
}

function mockControlRequirement(overrides: Partial<AuthenChainControlRequirement> = {}): AuthenChainControlRequirement {
  return {
    id: overrides.id ?? 'eu-ai-act-article-50-disclosure-001',
    frameworkId: overrides.frameworkId ?? 'eu_ai_act',
    controlId: overrides.controlId ?? 'EU-AIA-ARTICLE50-DISCLOSURE-001',
    articleOrClauseLabel: overrides.articleOrClauseLabel ?? 'Article 50',
    title: overrides.title ?? 'AI disclosure notice evidence',
    objective: overrides.objective ?? 'Maintain technical evidence for disclosure and content marking controls.',
    references: overrides.references ?? [],
    requiredEvidenceTypes: overrides.requiredEvidenceTypes ?? ['disclosure_notice', 'content_marking'],
    optionalEvidenceTypes: overrides.optionalEvidenceTypes ?? ['public_verifier_result'],
    customerResponsibilityCategories: overrides.customerResponsibilityCategories ?? ['legal_applicability'],
    legalCompliance: 'not_determined',
    ...overrides,
  }
}

function mockControlMappingSnapshot(
  overrides: Partial<AuthenChainControlMappingSnapshot> = {},
): AuthenChainControlMappingSnapshot {
  return {
    id: overrides.id ?? 'mock_control_mapping_snapshot',
    orgId: overrides.orgId ?? 'mock_tenant',
    workspaceId: overrides.workspaceId ?? null,
    frameworkIds: overrides.frameworkIds ?? ['eu_ai_act'],
    jurisdiction: overrides.jurisdiction ?? 'EU',
    aiSystemId: overrides.aiSystemId ?? 'mock_ai_system',
    modelVersionId: overrides.modelVersionId ?? 'mock_model_version',
    deploymentId: overrides.deploymentId ?? null,
    environment: overrides.environment ?? 'production',
    scopeHash: overrides.scopeHash ?? `sha256:${'8'.repeat(64)}`,
    snapshotHash: overrides.snapshotHash ?? `sha256:${'9'.repeat(64)}`,
    status: overrides.status ?? 'ready',
    generatedAt: overrides.generatedAt ?? '2026-01-01T00:00:00.000Z',
    legalCompliance: 'not_determined',
    evidenceLinks: overrides.evidenceLinks ?? [],
    gaps: overrides.gaps ?? [],
    maturityScores: overrides.maturityScores ?? [
      {
        frameworkId: 'eu_ai_act',
        totalControls: 1,
        coveredCount: 0,
        partiallyCoveredCount: 1,
        notCoveredCount: 0,
        customerResponsibilityCount: 0,
        coveredPercent: 0,
        partiallyCoveredPercent: 100,
        notCoveredPercent: 0,
        customerResponsibilityPercent: 0,
        legalCompliance: 'not_determined',
      },
    ],
    ...overrides,
  }
}

function mockControlMappingPreview(
  overrides: Partial<AuthenChainControlMappingPreview> = {},
): AuthenChainControlMappingPreview {
  return {
    scopeHash: overrides.scopeHash ?? `sha256:${'8'.repeat(64)}`,
    snapshotHash: overrides.snapshotHash ?? `sha256:${'9'.repeat(64)}`,
    scope: overrides.scope ?? {
      frameworkIds: ['eu_ai_act'],
      jurisdiction: 'EU',
      environment: 'production',
    },
    statusCounts: overrides.statusCounts ?? { partially_covered: 1 },
    statusesByRequirement: overrides.statusesByRequirement ?? {
      'eu-ai-act-article-50-disclosure-001': 'partially_covered',
    },
    evidenceLinks: overrides.evidenceLinks ?? [],
    gaps: overrides.gaps ?? [],
    maturityScores: overrides.maturityScores ?? [],
    generatedAt: overrides.generatedAt ?? '2026-01-01T00:00:00.000Z',
    legalCompliance: 'not_determined',
    ...overrides,
  }
}

function mockAiInventorySystem(overrides: Partial<AuthenChainAiInventorySystem> = {}): AuthenChainAiInventorySystem {
  return {
    id: overrides.id ?? 'mock_ai_system',
    tenantId: 'mock_tenant',
    systemKey: overrides.systemKey ?? 'mock-ai-system',
    displayName: overrides.displayName ?? 'Mock AI system',
    description: overrides.description ?? null,
    status: (overrides.status ?? 'active') as AuthenChainAiSystemLifecycleStatus,
    internalOwnerTeam: overrides.internalOwnerTeam ?? 'AI Platform',
    businessUnit: overrides.businessUnit ?? null,
    allowedPurposeSummary: overrides.allowedPurposeSummary ?? 'Mock signing and audit workflows.',
    jurisdictionMarkers: overrides.jurisdictionMarkers ?? ['EU'],
    productionUse: overrides.productionUse ?? true,
    ownerUserId: overrides.ownerUserId ?? null,
    ownerName: overrides.ownerName ?? 'Mock owner',
    backupOwnerUserId: overrides.backupOwnerUserId ?? null,
    backupOwnerName: overrides.backupOwnerName ?? null,
    allowedPurposeIds: overrides.allowedPurposeIds ?? ['mock_purpose'],
    policyVersionRefs: overrides.policyVersionRefs ?? ['mock-ai-policy'],
    currentSystemVersionHash: overrides.currentSystemVersionHash ?? `sha256:${'a'.repeat(64)}`,
    sourceRiskClassificationId: overrides.sourceRiskClassificationId ?? null,
    sourceImpactAssessmentId: overrides.sourceImpactAssessmentId ?? null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    retiredAt: null,
    archivedAt: null,
    ...overrides,
  }
}

function mockAiInventoryModelVersion(
  overrides: Partial<AuthenChainAiModelVersion> = {},
): AuthenChainAiModelVersion {
  return {
    id: overrides.id ?? 'mock_model_version',
    tenantId: 'mock_tenant',
    aiSystemId: overrides.aiSystemId ?? 'mock_ai_system',
    provider: (overrides.provider ?? 'openai') as AuthenChainAiModelProvider,
    providerDisplayName: overrides.providerDisplayName ?? null,
    modelName: overrides.modelName ?? 'mock-model',
    modelVersion: overrides.modelVersion ?? '2026-01-01',
    displayName: overrides.displayName ?? 'Mock model version',
    hostingMode: overrides.hostingMode ?? 'provider_api',
    status: overrides.status ?? 'active',
    modelVersionHash: overrides.modelVersionHash ?? `sha256:${'b'.repeat(64)}`,
    endpointReferenceHash: overrides.endpointReferenceHash ?? null,
    region: overrides.region ?? null,
    fineTuneReferenceHash: overrides.fineTuneReferenceHash ?? null,
    providerMetadata: overrides.providerMetadata ?? null,
    sourceRiskClassificationId: overrides.sourceRiskClassificationId ?? null,
    sourceImpactAssessmentId: overrides.sourceImpactAssessmentId ?? null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deprecatedAt: null,
    retiredAt: null,
    ...overrides,
  }
}

function mockAiInventoryDeployment(
  overrides: Partial<CreateAiInventoryDeploymentResponse['deployment']> = {},
): CreateAiInventoryDeploymentResponse['deployment'] {
  return {
    id: overrides.id ?? 'mock_deployment',
    tenantId: 'mock_tenant',
    aiSystemId: overrides.aiSystemId ?? 'mock_ai_system',
    aiSystemVersionHash: overrides.aiSystemVersionHash ?? `sha256:${'a'.repeat(64)}`,
    aiModelVersionId: overrides.aiModelVersionId ?? 'mock_model_version',
    aiModelVersionHash: overrides.aiModelVersionHash ?? `sha256:${'b'.repeat(64)}`,
    environment: overrides.environment ?? 'production',
    status: (overrides.status ?? 'active') as AuthenChainAiModelDeploymentLifecycleStatus,
    ownerUserId: overrides.ownerUserId ?? null,
    ownerName: overrides.ownerName ?? 'Mock owner',
    allowedPurposeId: overrides.allowedPurposeId ?? 'mock_purpose',
    policyBindingId: overrides.policyBindingId ?? 'mock_policy_binding',
    policyVersionRefs: overrides.policyVersionRefs ?? ['mock-ai-policy'],
    deploymentHash: overrides.deploymentHash ?? `sha256:${'c'.repeat(64)}`,
    endpointReferenceHash: overrides.endpointReferenceHash ?? null,
    region: overrides.region ?? null,
    residencyMarker: overrides.residencyMarker ?? null,
    dataHandlingMarkers: overrides.dataHandlingMarkers ?? [],
    sourceRiskClassificationId: overrides.sourceRiskClassificationId ?? null,
    sourceImpactAssessmentId: overrides.sourceImpactAssessmentId ?? null,
    aiModelVersionStatusAtActivation: overrides.aiModelVersionStatusAtActivation ?? 'active',
    deprecatedModelVersionException: overrides.deprecatedModelVersionException ?? null,
    activatedAt: '2026-01-01T00:00:00.000Z',
    suspendedAt: null,
    retiredAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function mockAiInventoryBinding(
  overrides: Partial<AuthenChainAiInventoryBinding> = {},
): AuthenChainAiInventoryBinding {
  return {
    schemaVersion: 'ai_inventory_binding.v1',
    aiSystemId: overrides.aiSystemId ?? 'mock_ai_system',
    aiSystemVersionHash: overrides.aiSystemVersionHash ?? `sha256:${'a'.repeat(64)}`,
    aiModelVersionId: overrides.aiModelVersionId ?? 'mock_model_version',
    aiModelVersionHash: overrides.aiModelVersionHash ?? `sha256:${'b'.repeat(64)}`,
    aiModelDeploymentId: overrides.aiModelDeploymentId ?? 'mock_deployment',
    deploymentEnvironment: overrides.deploymentEnvironment ?? 'production',
    allowedPurposeId: overrides.allowedPurposeId ?? 'mock_purpose',
    policyBindingId: overrides.policyBindingId ?? 'mock_policy_binding',
    policyVersionRefs: overrides.policyVersionRefs ?? ['mock-ai-policy'],
    inventoryBindingHash: overrides.inventoryBindingHash ?? `sha256:${'d'.repeat(64)}`,
    sourceRiskClassificationId: overrides.sourceRiskClassificationId ?? null,
    sourceImpactAssessmentId: overrides.sourceImpactAssessmentId ?? null,
    ...overrides,
  }
}

function mockDisclosureBinding(
  overrides: Partial<AuthenChainDisclosureBinding> = {},
): AuthenChainDisclosureBinding {
  return {
    schemaVersion: 'authenchain.disclosure-signing-binding.v1',
    enforcementMode: overrides.enforcementMode ?? 'warn',
    userInformed: overrides.userInformed ?? true,
    noticeTextHash: overrides.noticeTextHash ?? `sha256:${'1'.repeat(64)}`,
    noticeTemplateId: overrides.noticeTemplateId ?? 'mock_notice_template',
    noticeTemplateVersion: overrides.noticeTemplateVersion ?? 'v1',
    noticeChannel: overrides.noticeChannel ?? 'web',
    noticePlacement: overrides.noticePlacement ?? 'pre_interaction',
    noticeDisplayMode: overrides.noticeDisplayMode ?? 'banner',
    aiGeneratedOutput: overrides.aiGeneratedOutput ?? true,
    syntheticContentStatus: overrides.syntheticContentStatus ?? 'synthetic',
    syntheticContentTypes: overrides.syntheticContentTypes ?? ['text'],
    markingApplied: overrides.markingApplied ?? true,
    markingTypes: overrides.markingTypes ?? ['visible_label'],
    contentCredentialStandard: overrides.contentCredentialStandard ?? 'none',
    evidenceArtifactHashes: overrides.evidenceArtifactHashes ?? [],
    technicalEvidenceHashes: overrides.technicalEvidenceHashes ?? [],
    disclosureBindingHash: overrides.disclosureBindingHash ?? `sha256:${'2'.repeat(64)}`,
    ...overrides,
  }
}

function mockIncidentRecord(overrides: Partial<AuthenChainIncidentRecord> = {}): AuthenChainIncidentRecord {
  return {
    id: overrides.id ?? 'mock_incident',
    tenantId: 'mock_tenant',
    workspaceId: overrides.workspaceId ?? null,
    incidentKey: overrides.incidentKey ?? 'mock-incident',
    title: overrides.title ?? 'Mock AI incident',
    safeSummary: overrides.safeSummary ?? 'Mock incident governance record for local development.',
    status: overrides.status ?? 'open',
    severity: overrides.severity ?? 'medium',
    priority: overrides.priority ?? 'normal',
    source: overrides.source ?? 'api_submission',
    affectedGroups: overrides.affectedGroups ?? ['customers'],
    ownerUserId: overrides.ownerUserId ?? null,
    ownerTeam: overrides.ownerTeam ?? null,
    policyVersionRefs: overrides.policyVersionRefs ?? ['mock-incident-policy'],
    incidentHash: overrides.incidentHash ?? `sha256:${'7'.repeat(64)}`,
    legalCompliance: 'not_determined',
    detectedAt: overrides.detectedAt ?? '2026-01-01T00:00:00.000Z',
    becameKnownAt: overrides.becameKnownAt ?? '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export class AuthenChain {
  private readonly client?: AuthenChainHttpClient
  private readonly mockMode: boolean

  constructor(config: AuthenChainConfig) {
    this.mockMode = config.mock === true || process.env.AUTHENCHAIN_MOCK_MODE === 'true'
    this.client = this.mockMode ? undefined : new AuthenChainHttpClient(config)
  }

  sign(input: SignInput): Promise<SignResponse> {
    if (this.mockMode) return mockSign(input)
    return signProvenance(this.requireClient(), input)
  }

  // R7T-015 (Sprint 3D): sign a pre-computed SHA-256 content hash; raw content
  // never touches the SDK or the wire.
  signWithContentHash(input: SignWithContentHashInput): Promise<SignResponse> {
    if (this.mockMode) return mockSign({ ...input, contentHash: input.contentHash } as SignInput)
    return signWithContentHashImpl(this.requireClient(), input)
  }

  createAiUseCase(input: AuthenChainAiUseCaseInput): Promise<CreateAiUseCaseResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        useCase: {
          id: 'mock_use_case',
          name: input.name,
          jurisdiction: input.jurisdiction,
          sector: input.sector,
          decisionType: input.decisionType,
          contextFlags: input.contextFlags ?? {},
          dataSensitivity: input.dataSensitivity ?? null,
          modelProvider: input.modelProvider ?? null,
          modelName: input.modelName ?? null,
          modelVersion: input.modelVersion ?? null,
          workflowName: input.workflowName ?? null,
        },
      })
    }
    return createAiUseCase(this.requireClient(), input)
  }

  getAiUseCase(input: GetAiUseCaseInput): Promise<GetAiUseCaseResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        useCase: {
          id: input.id,
          name: 'Mock AI use case',
          jurisdiction: 'EU',
          sector: 'general_business',
          decisionType: 'informative',
          contextFlags: {},
          dataSensitivity: 'low',
        },
      })
    }
    return getAiUseCase(this.requireClient(), input)
  }

  listAiUseCases(input: ListAiUseCasesInput = {}): Promise<ListAiUseCasesResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        useCases: [],
        pagination: { page: input.page ?? 1, pageSize: input.pageSize ?? 25, total: 0, totalPages: 0 },
        environment: 'mock',
        mock: true,
      })
    }
    return listAiUseCases(this.requireClient(), input)
  }

  classifyAiUseCase(input: ClassifyAiUseCaseInput): Promise<ClassifyAiUseCaseResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        classification: {
          id: 'mock_risk_classification',
          aiUseCaseId: input.id,
          suggestedRiskTier: 'low_risk',
          effectiveRiskTier: 'low_risk',
          reviewStatus: 'suggested',
          policyVersion: 'mock-policy',
          rulesetHash: 'sha256:mock',
          justification: {
            summary: 'Mock policy suggestion for local development.',
          },
        },
      })
    }
    return classifyAiUseCase(this.requireClient(), input)
  }

  getRiskClassificationHistory(
    input: GetRiskClassificationHistoryInput
  ): Promise<GetRiskClassificationHistoryResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        history: [],
        pagination: { page: input.page ?? 1, pageSize: input.pageSize ?? 50, total: 0, totalPages: 0 },
      })
    }
    return getRiskClassificationHistory(this.requireClient(), input)
  }

  signWithRiskContext(input: SignWithRiskContextInput): Promise<SignResponse> {
    if (this.mockMode) return mockSign(input)
    return signWithRiskContext(this.requireClient(), input)
  }

  listImpactAssessments(input: ListImpactAssessmentsInput = {}): Promise<ListImpactAssessmentsResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        assessments: [mockImpactAssessment({ useCaseId: input.useCaseId })],
        pagination: { page: input.page ?? 1, pageSize: input.pageSize ?? 25, total: 1, totalPages: 1 },
        environment: 'mock',
        mock: true,
      })
    }
    return listImpactAssessments(this.requireClient(), input)
  }

  createImpactAssessmentDraft(
    input: CreateImpactAssessmentDraftInput
  ): Promise<CreateImpactAssessmentDraftResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        assessment: mockImpactAssessment({
          id: 'mock_impact_assessment',
          useCaseId: input.useCaseId,
          jurisdiction: input.jurisdiction,
          assessmentKey: input.assessmentKey ?? null,
          assessmentType: input.assessmentType ?? null,
          questionnaire: input.questionnaire ?? null,
          fundamentalRightsAssessment: input.fundamentalRightsAssessment ?? null,
          dataAssessment: input.dataAssessment ?? null,
          affectedGroupAssessment: input.affectedGroupAssessment ?? null,
          periodicReview: input.periodicReview ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return createImpactAssessmentDraft(this.requireClient(), input)
  }

  updateImpactAssessmentAnswers(
    input: UpdateImpactAssessmentAnswersInput
  ): Promise<UpdateImpactAssessmentAnswersResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        assessment: mockImpactAssessment({
          id: input.id,
          questionnaire: input.questionnaire ?? null,
          fundamentalRightsAssessment: input.fundamentalRightsAssessment ?? null,
          dataAssessment: input.dataAssessment ?? null,
          affectedGroupAssessment: input.affectedGroupAssessment ?? null,
          periodicReview: input.periodicReview ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return updateImpactAssessmentAnswers(this.requireClient(), input)
  }

  submitImpactAssessment(input: SubmitImpactAssessmentInput): Promise<SubmitImpactAssessmentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        assessment: mockImpactAssessment({ id: input.id, status: 'in_review' }),
        environment: 'mock',
        mock: true,
      })
    }
    return submitImpactAssessment(this.requireClient(), input)
  }

  getImpactAssessment(input: GetImpactAssessmentInput): Promise<GetImpactAssessmentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        assessment: mockImpactAssessment({ id: input.id }),
        environment: 'mock',
        mock: true,
      })
    }
    return getImpactAssessment(this.requireClient(), input)
  }

  exportImpactAssessmentEvidencePack(
    input: ExportImpactAssessmentEvidencePackInput
  ): Promise<ExportImpactAssessmentEvidencePackResponse> {
    if (this.mockMode) {
      const evidencePack = {
        schemaVersion: 'authenchain.ai-impact-assessment-evidence-pack.v1',
        evidencePackId: `mock_pack_${input.id}`,
        assessmentId: input.id,
        assessmentHash: 'sha256:mock-impact-assessment',
        exportedAt: '2026-01-01T00:00:00.000Z',
        legalCompliance: 'not_determined',
        environment: 'mock',
        mock: true,
      }
      return Promise.resolve({
        ok: true,
        evidenceExport: {
          id: `mock_export_${input.id}`,
          exportType: input.exportType ?? 'assessment_evidence_pack',
          exportStatus: 'completed',
          exportHash: 'sha256:mock-impact-assessment-pack',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        evidencePack,
        verification: {
          ok: true,
          status: 'valid',
          trustedStatus: 'incomplete',
          legalCompliance: 'not_determined',
          warnings: ['Mock mode output is not externally trustworthy evidence.'],
          failures: [],
        },
        environment: 'mock',
        mock: true,
      })
    }
    return exportImpactAssessmentEvidencePack(this.requireClient(), input)
  }

  verifyImpactAssessmentEvidencePack(
    input: VerifyImpactAssessmentEvidencePackInput
  ): Promise<VerifyImpactAssessmentEvidencePackResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        verification: {
          ok: true,
          status: 'valid',
          legalCompliance: 'not_determined',
          warnings: ['Mock mode output is not externally trustworthy evidence.'],
          failures: [],
        },
        environment: 'mock',
        mock: true,
      })
    }
    return verifyImpactAssessmentEvidencePack(this.requireClient(), input)
  }

  listControlFrameworks(input: AuthenChainListControlFrameworksInput = {}): Promise<AuthenChainListControlFrameworksResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        frameworks: [
          mockControlFramework(),
          mockControlFramework({
            id: 'nist_ai_rmf',
            label: 'NIST AI RMF',
            jurisdiction: 'US',
            versionDate: '2023-01-26',
          }),
        ],
        environment: 'mock',
        mock: true,
      })
    }
    return listControlFrameworks(this.requireClient(), input)
  }

  listControlRequirements(input: AuthenChainListControlRequirementsInput = {}): Promise<AuthenChainListControlRequirementsResponse> {
    if (this.mockMode) {
      const controls = [
        mockControlRequirement({ frameworkId: input.frameworkId ?? 'eu_ai_act' }),
      ]
      return Promise.resolve({
        ok: true,
        controls,
        environment: 'mock',
        mock: true,
      })
    }
    return listControlRequirements(this.requireClient(), input)
  }

  previewControlMapping(input: AuthenChainPreviewControlMappingInput): Promise<AuthenChainPreviewControlMappingResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        preview: mockControlMappingPreview({
          scope: {
            frameworkIds: input.frameworkIds,
            jurisdiction: input.jurisdiction,
            workspaceId: input.workspaceId ?? null,
            aiSystemId: input.aiSystemId ?? null,
            modelVersionId: input.modelVersionId ?? null,
            environment: input.environment ?? null,
          },
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return previewControlMapping(this.requireClient(), input)
  }

  generateControlMappingSnapshot(
    input: AuthenChainGenerateControlMappingSnapshotInput,
  ): Promise<AuthenChainGenerateControlMappingSnapshotResponse> {
    if (this.mockMode) {
      const snapshot = mockControlMappingSnapshot({
        frameworkIds: input.frameworkIds,
        jurisdiction: input.jurisdiction,
        workspaceId: input.workspaceId ?? null,
        aiSystemId: input.aiSystemId ?? null,
        modelVersionId: input.modelVersionId ?? null,
        deploymentId: input.deploymentId ?? null,
        environment: input.environment ?? null,
      })
      return Promise.resolve({
        ok: true,
        snapshot,
        idempotent: input.idempotency !== 'force',
        preview: mockControlMappingPreview({
          scopeHash: snapshot.scopeHash,
          snapshotHash: snapshot.snapshotHash,
          scope: {
            frameworkIds: input.frameworkIds,
            jurisdiction: input.jurisdiction,
            workspaceId: input.workspaceId ?? null,
            aiSystemId: input.aiSystemId ?? null,
            modelVersionId: input.modelVersionId ?? null,
            environment: input.environment ?? null,
          },
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return generateControlMappingSnapshot(this.requireClient(), input)
  }

  getControlMappingSnapshot(
    input: AuthenChainGetControlMappingSnapshotInput,
  ): Promise<AuthenChainGetControlMappingSnapshotResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        snapshot: mockControlMappingSnapshot({ id: input.snapshotId ?? input.id ?? 'mock_control_mapping_snapshot' }),
        environment: 'mock',
        mock: true,
      })
    }
    return getControlMappingSnapshot(this.requireClient(), input)
  }

  exportControlMappingEvidencePackSection(
    input: AuthenChainExportControlMappingEvidencePackSectionInput,
  ): Promise<AuthenChainExportControlMappingEvidencePackSectionResponse> {
    if (this.mockMode) {
      const snapshot = mockControlMappingSnapshot({ id: input.snapshotId ?? input.id ?? 'mock_control_mapping_snapshot' })
      return Promise.resolve({
        ok: true,
        section: {
          schemaVersion: 'authenchain.regulatory-control-mapping-evidence-pack.v1',
          sectionId: 'regulatory_control_mapping',
          snapshotId: snapshot.id,
          snapshotHash: snapshot.snapshotHash,
          frameworkIds: snapshot.frameworkIds,
          legalCompliance: 'not_determined',
          limitations: [
            'not_legal_advice',
            'legal_compliance_not_determined',
            'technical_evidence_only',
          ],
        },
        validation: {
          ok: true,
          legalCompliance: 'not_determined',
          warnings: ['Mock mode output is not externally trustworthy evidence.'],
          failures: [],
        },
        export: {
          id: `mock_control_mapping_export_${snapshot.id}`,
          exportType: input.shareMode ?? 'evidence_pack',
          exportHash: `sha256:${'a'.repeat(64)}`,
        },
        environment: 'mock',
        mock: true,
      })
    }
    return exportControlMappingEvidencePackSection(this.requireClient(), input)
  }

  getControlMappingMaturity(
    input: AuthenChainGetControlMappingMaturityInput = {},
  ): Promise<AuthenChainGetControlMappingMaturityResponse> {
    if (this.mockMode) {
      const snapshot = mockControlMappingSnapshot({ id: input.snapshotId ?? input.id ?? 'mock_control_mapping_snapshot' })
      return Promise.resolve({
        ok: true,
        maturity: {
          snapshotId: snapshot.id,
          snapshotHash: snapshot.snapshotHash,
          scopeHash: snapshot.scopeHash,
          maturityScores: snapshot.maturityScores ?? [],
          legalCompliance: 'not_determined',
        },
        environment: 'mock',
        mock: true,
      })
    }
    return getControlMappingMaturity(this.requireClient(), input)
  }

  listAiInventorySystems(input: ListAiInventorySystemsInput = {}): Promise<ListAiInventorySystemsResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        systems: [mockAiInventorySystem({ aiUseCaseId: input.aiUseCaseId ?? null, status: input.status ?? 'active' })],
        pagination: { page: input.page ?? 1, pageSize: input.pageSize ?? 25, total: 1, totalPages: 1 },
        environment: 'mock',
        mock: true,
      })
    }
    return listAiInventorySystems(this.requireClient(), input)
  }

  getAiInventorySystem(input: GetAiInventorySystemInput): Promise<GetAiInventorySystemResponse> {
    if (this.mockMode) {
      return Promise.resolve({ ok: true, system: mockAiInventorySystem({ id: input.id }), environment: 'mock', mock: true })
    }
    return getAiInventorySystem(this.requireClient(), input)
  }

  createAiInventorySystem(input: CreateAiInventorySystemInput): Promise<CreateAiInventorySystemResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        system: mockAiInventorySystem({
          id: input.id ?? 'mock_ai_system',
          systemKey: input.systemKey,
          displayName: input.displayName,
          description: input.description ?? null,
          status: input.status ?? 'active',
          allowedPurposeSummary: input.allowedPurposeSummary,
          jurisdictionMarkers: input.jurisdictionMarkers,
          productionUse: input.productionUse ?? true,
          ownerUserId: input.ownerUserId ?? null,
          ownerName: input.ownerName ?? null,
          allowedPurposeIds: input.allowedPurposeIds ?? [],
          policyVersionRefs: input.policyVersionRefs ?? [],
          sourceRiskClassificationId: input.sourceRiskClassificationId ?? null,
          sourceImpactAssessmentId: input.sourceImpactAssessmentId ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return createAiInventorySystem(this.requireClient(), input)
  }

  createAiInventoryModelVersion(
    input: CreateAiInventoryModelVersionInput,
  ): Promise<CreateAiInventoryModelVersionResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        modelVersion: mockAiInventoryModelVersion({
          id: input.id ?? 'mock_model_version',
          aiSystemId: input.aiSystemId,
          provider: input.provider,
          providerDisplayName: input.providerDisplayName ?? null,
          modelName: input.modelName,
          modelVersion: input.modelVersion ?? input.releaseLabel ?? null,
          displayName: input.displayName ?? null,
          hostingMode: input.hostingMode,
          status: input.status ?? 'active',
          endpointReferenceHash: input.endpointReferenceHash ?? null,
          region: input.region ?? null,
          fineTuneReferenceHash: input.fineTuneReferenceHash ?? null,
          providerMetadata: input.providerMetadata ?? null,
          sourceRiskClassificationId: input.sourceRiskClassificationId ?? null,
          sourceImpactAssessmentId: input.sourceImpactAssessmentId ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return createAiInventoryModelVersion(this.requireClient(), input)
  }

  createAiInventoryDeployment(
    input: CreateAiInventoryDeploymentInput,
  ): Promise<CreateAiInventoryDeploymentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        deployment: mockAiInventoryDeployment({
          id: input.id ?? 'mock_deployment',
          aiSystemId: input.aiSystemId,
          aiModelVersionId: input.aiModelVersionId,
          environment: input.environment,
          status: input.status ?? 'draft',
          ownerUserId: input.ownerUserId ?? null,
          ownerName: input.ownerName ?? null,
          allowedPurposeId: input.allowedPurposeId ?? null,
          policyBindingId: input.policyBindingId ?? null,
          policyVersionRefs: input.policyVersionRefs ?? [],
          endpointReferenceHash: input.endpointReferenceHash ?? null,
          region: input.region ?? null,
          residencyMarker: input.residencyMarker ?? null,
          dataHandlingMarkers: input.dataHandlingMarkers ?? [],
          sourceRiskClassificationId: input.sourceRiskClassificationId ?? null,
          sourceImpactAssessmentId: input.sourceImpactAssessmentId ?? null,
          deprecatedModelVersionException: input.deprecatedModelVersionException ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return createAiInventoryDeployment(this.requireClient(), input)
  }

  activateAiInventoryDeployment(
    input: ActivateAiInventoryDeploymentInput,
  ): Promise<ActivateAiInventoryDeploymentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        deployment: mockAiInventoryDeployment({
          id: input.deploymentId,
          status: 'active',
          deprecatedModelVersionException: input.deprecatedModelVersionException ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return activateAiInventoryDeployment(this.requireClient(), input)
  }

  requestAiInventoryModelChange(
    input: RequestAiInventoryModelChangeInput,
  ): Promise<RequestAiInventoryModelChangeResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        modelChange: {
          id: input.id ?? 'mock_model_change',
          tenantId: 'mock_tenant',
          aiSystemId: input.aiSystemId,
          aiModelDeploymentId: input.aiModelDeploymentId ?? null,
          changeType: input.changeType,
          status: 'draft',
          beforeHash: input.beforeHash ?? null,
          afterHash: input.afterHash ?? null,
          modelChangeHash: `sha256:${'e'.repeat(64)}`,
          reason: input.reason,
          evidenceReferences: input.evidenceReferences ?? [],
          changePayload: input.changePayload ?? null,
          sourceRiskClassificationId: input.sourceRiskClassificationId ?? null,
          sourceImpactAssessmentId: input.sourceImpactAssessmentId ?? null,
          createdAt: '2026-01-01T00:00:00.000Z',
          submittedAt: null,
          reviewedAt: null,
          appliedAt: null,
          cancelledAt: null,
        },
        environment: 'mock',
        mock: true,
      })
    }
    return requestAiInventoryModelChange(this.requireClient(), input)
  }

  resolveAiInventoryBinding(input: ResolveAiInventoryBindingInput): Promise<ResolveAiInventoryBindingResponse> {
    if (this.mockMode) {
      const binding = mockAiInventoryBinding({
        aiSystemId: input.aiSystemId,
        aiModelVersionId: input.aiModelVersionId ?? 'mock_model_version',
        aiModelVersionHash: input.aiModelVersionHash ?? `sha256:${'b'.repeat(64)}`,
        aiModelDeploymentId: input.aiModelDeploymentId ?? 'mock_deployment',
        deploymentEnvironment: input.deploymentEnvironment,
        allowedPurposeId: input.allowedPurposeId ?? 'mock_purpose',
        policyBindingId: input.policyBindingId ?? 'mock_policy_binding',
        policyVersionRefs: input.policyVersionRefs ?? ['mock-ai-policy'],
      })
      const metadata: Record<string, unknown> = input.metadata
        ? attachAiInventoryBindingToMetadata(input.metadata, binding) as Record<string, unknown>
        : { regulatory: { ai_inventory: binding } }
      return Promise.resolve({
        ok: true,
        binding,
        metadata,
        warnings: [],
        environment: 'mock',
        mock: true,
      })
    }
    return resolveAiInventoryBinding(this.requireClient(), input)
  }

  fetchAiInventoryBinding(input: AuthenChainFetchAiInventoryBindingInput): Promise<AuthenChainFetchAiInventoryBindingResponse> {
    if (this.mockMode) {
      const binding = mockAiInventoryBinding({ inventoryBindingHash: input.inventoryBindingHash })
      return Promise.resolve({
        ok: true,
        binding,
        verification: {
          schemaVersion: 'authenchain.ai-system-inventory-verification.v1',
          status: 'verified',
          legalCompliance: 'not_determined',
          binding,
          warnings: [],
          failures: [],
        },
        environment: 'mock',
        mock: true,
      })
    }
    return fetchAiInventoryBinding(this.requireClient(), input)
  }

  createDisclosureNoticeSnapshot(
    input: AuthenChainCreateDisclosureNoticeSnapshotInput,
  ): Promise<AuthenChainCreateDisclosureNoticeSnapshotResponse> {
    if (this.mockMode) {
      const notice: AuthenChainDisclosureNoticeSnapshot = {
        id: input.id ?? 'mock_notice_template',
        tenantId: 'mock_tenant',
        workspaceId: input.workspaceId ?? null,
        policyId: input.policyId ?? null,
        templateKey: input.templateKey,
        templateVersion: input.templateVersion,
        status: input.status ?? 'draft',
        noticeText: input.noticeText,
        noticeTextHash: input.noticeTextHash ?? `sha256:${'1'.repeat(64)}`,
        noticeLocale: input.noticeLocale ?? null,
        noticeChannel: input.noticeChannel,
        noticePlacement: input.noticePlacement,
        noticeDisplayMode: input.noticeDisplayMode,
        publicSafeText: input.publicSafeText ?? false,
        policyVersionRefs: input.policyVersionRefs ?? [],
        noticeTemplateHash: `sha256:${'3'.repeat(64)}`,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      return Promise.resolve({ ok: true, notice, environment: 'mock', mock: true })
    }
    return createDisclosureNoticeSnapshot(this.requireClient(), input)
  }

  recordDisclosureApplication(
    input: AuthenChainRecordDisclosureApplicationInput,
  ): Promise<AuthenChainRecordDisclosureApplicationResponse> {
    if (this.mockMode) {
      const application: AuthenChainDisclosureApplication = {
        id: input.id ?? 'mock_disclosure_application',
        tenantId: 'mock_tenant',
        workspaceId: input.workspaceId ?? null,
        policyId: input.policyId ?? null,
        noticeTemplateId: input.noticeTemplateId ?? null,
        signedEventId: input.signedEventId ?? null,
        userInformed: input.userInformed,
        userInformedAt: input.userInformedAt ?? null,
        notInformedReasonCode: input.notInformedReasonCode ?? null,
        noticeSnapshotHash: input.noticeSnapshotHash ?? null,
        noticeTextHash: input.noticeTextHash ?? null,
        noticeTemplateVersion: input.noticeTemplateVersion ?? null,
        noticeLocale: input.noticeLocale ?? null,
        noticeChannel: input.noticeChannel,
        noticePlacement: input.noticePlacement,
        noticeDisplayMode: input.noticeDisplayMode,
        evidenceArtifactHashes: input.evidenceArtifactHashes ?? [],
        disclosureApplicationHash: `sha256:${'4'.repeat(64)}`,
        createdAt: input.createdAt ?? '2026-01-01T00:00:00.000Z',
      }
      return Promise.resolve({ ok: true, application, environment: 'mock', mock: true })
    }
    return recordDisclosureApplication(this.requireClient(), input)
  }

  recordSyntheticContentDeclaration(
    input: AuthenChainRecordSyntheticContentDeclarationInput,
  ): Promise<AuthenChainRecordSyntheticContentDeclarationResponse> {
    if (this.mockMode) {
      const syntheticContentDeclaration: AuthenChainSyntheticContentDeclaration = {
        id: input.id ?? 'mock_synthetic_content',
        tenantId: 'mock_tenant',
        workspaceId: input.workspaceId ?? null,
        disclosureApplicationId: input.disclosureApplicationId ?? null,
        signedEventId: input.signedEventId ?? null,
        aiGeneratedOutput: input.aiGeneratedOutput,
        syntheticContentStatus: input.syntheticContentStatus,
        syntheticContentTypes: input.syntheticContentTypes,
        declarationBasis: input.declarationBasis,
        humanEdited: input.humanEdited ?? null,
        sourceSystem: input.sourceSystem ?? null,
        customerPolicyReference: input.customerPolicyReference ?? null,
        contentEvidenceHash: input.contentEvidenceHash ?? null,
        contentCredentialReferenceHash: input.contentCredentialReferenceHash ?? null,
        syntheticContentHash: `sha256:${'5'.repeat(64)}`,
        declaredAt: input.declaredAt ?? '2026-01-01T00:00:00.000Z',
      }
      return Promise.resolve({ ok: true, syntheticContentDeclaration, environment: 'mock', mock: true })
    }
    return recordSyntheticContentDeclaration(this.requireClient(), input)
  }

  recordContentMarking(input: AuthenChainRecordContentMarkingInput): Promise<AuthenChainRecordContentMarkingResponse> {
    if (this.mockMode) {
      const marking: AuthenChainContentMarking = {
        id: input.id ?? 'mock_content_marking',
        tenantId: 'mock_tenant',
        workspaceId: input.workspaceId ?? null,
        disclosureApplicationId: input.disclosureApplicationId ?? null,
        signedEventId: input.signedEventId ?? null,
        markingApplied: input.markingApplied,
        markingTypes: input.markingTypes,
        markingEvidenceTypes: input.markingEvidenceTypes ?? [],
        contentCredentialStandard: input.contentCredentialStandard ?? 'none',
        contentCredentialReferenceHash: input.contentCredentialReferenceHash ?? null,
        visualEvidenceArtifactHash: input.visualEvidenceArtifactHash ?? null,
        technicalEvidenceHashes: input.technicalEvidenceHashes ?? [],
        contentMarkingHash: `sha256:${'6'.repeat(64)}`,
        markedAt: input.markedAt ?? '2026-01-01T00:00:00.000Z',
      }
      return Promise.resolve({ ok: true, marking, environment: 'mock', mock: true })
    }
    return recordContentMarking(this.requireClient(), input)
  }

  resolveDisclosureBinding(
    input: AuthenChainResolveDisclosureBindingInput,
  ): Promise<AuthenChainResolveDisclosureBindingResponse> {
    if (this.mockMode) {
      const binding = mockDisclosureBinding(input.disclosure as Partial<AuthenChainDisclosureBinding>)
      const metadata = input.metadata
        ? attachDisclosureBindingToMetadata(input.metadata, binding) as Record<string, unknown>
        : { regulatory: { disclosure: binding } }
      return Promise.resolve({
        ok: true,
        binding,
        metadata,
        warnings: [],
        environment: 'mock',
        mock: true,
      })
    }
    return resolveDisclosureBinding(this.requireClient(), input)
  }

  signWithDisclosureEvidence(input: AuthenChainSignWithDisclosureEvidenceInput): Promise<SignResponse> {
    if (this.mockMode) {
      const binding = mockDisclosureBinding(input.disclosure as Partial<AuthenChainDisclosureBinding>)
      return mockSign({
        ...input,
        metadata: attachDisclosureBindingToMetadata(input.metadata, binding),
      })
    }
    return signWithDisclosureEvidence(this.requireClient(), input)
  }

  verifyDisclosureEvidencePack(
    input: AuthenChainVerifyDisclosureEvidencePackInput,
  ): Promise<AuthenChainVerifyDisclosureEvidencePackResponse> {
    if (this.mockMode) return mockVerifyEvidencePack(input)
    return verifyDisclosureEvidencePack(this.requireClient(), input)
  }

  listRegulatoryIncidents(
    input: AuthenChainListRegulatoryIncidentsInput = {},
  ): Promise<AuthenChainListRegulatoryIncidentsResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        incidents: [mockIncidentRecord({ status: input.status ?? 'open', severity: input.severity ?? 'medium' })],
        pagination: { page: input.page ?? 1, pageSize: input.pageSize ?? 25, total: 1, totalPages: 1 },
        environment: 'mock',
        mock: true,
      })
    }
    return listRegulatoryIncidents(this.requireClient(), input)
  }

  createRegulatoryIncident(
    input: AuthenChainCreateRegulatoryIncidentInput,
  ): Promise<AuthenChainCreateRegulatoryIncidentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        incident: mockIncidentRecord({
          id: input.incidentId ?? 'mock_incident',
          workspaceId: input.workspaceId ?? null,
          incidentKey: input.incidentKey ?? null,
          title: input.title,
          safeSummary: input.safeSummary,
          severity: input.severity ?? 'unknown',
          priority: input.priority ?? 'normal',
          source: input.source ?? 'api_submission',
          affectedGroups: input.affectedGroups ?? ['unknown'],
          ownerUserId: input.ownerUserId ?? null,
          ownerTeam: input.ownerTeam ?? null,
          policyVersionRefs: input.policyVersionRefs ?? [],
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return createRegulatoryIncident(this.requireClient(), input)
  }

  getRegulatoryIncident(
    input: AuthenChainGetRegulatoryIncidentInput,
  ): Promise<AuthenChainGetRegulatoryIncidentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        incident: mockIncidentRecord({ id: input.id }),
        evidenceLinks: [],
        alerts: [],
        correctiveActions: [],
        environment: 'mock',
        mock: true,
      })
    }
    return getRegulatoryIncident(this.requireClient(), input)
  }

  updateRegulatoryIncidentTriage(
    input: AuthenChainUpdateRegulatoryIncidentTriageInput,
  ): Promise<AuthenChainUpdateRegulatoryIncidentTriageResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        incident: mockIncidentRecord({
          id: input.id,
          title: input.title ?? 'Mock AI incident',
          safeSummary: input.safeSummary ?? 'Mock incident governance record for local development.',
          severity: input.severity ?? 'medium',
          priority: input.priority ?? 'normal',
          ownerTeam: input.ownerTeam ?? null,
          policyVersionRefs: input.policyVersionRefs ?? ['mock-incident-policy'],
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return updateRegulatoryIncidentTriage(this.requireClient(), input)
  }

  linkRegulatoryIncidentEvidence(
    input: AuthenChainLinkRegulatoryIncidentEvidenceInput,
  ): Promise<AuthenChainLinkRegulatoryIncidentEvidenceResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        link: {
          id: 'mock_incident_evidence_link',
          incidentId: input.incidentId,
          linkType: input.linkType,
          evidenceHash: input.evidenceHash ?? null,
          evidencePackHash: input.evidencePackHash ?? null,
          verificationStatusAtLinkTime: input.verificationStatusAtLinkTime ?? 'not_checked',
          linkHash: `sha256:${'8'.repeat(64)}`,
        },
        environment: 'mock',
        mock: true,
      })
    }
    return linkRegulatoryIncidentEvidence(this.requireClient(), input)
  }

  transitionRegulatoryIncident(
    input: AuthenChainTransitionRegulatoryIncidentInput,
  ): Promise<AuthenChainTransitionRegulatoryIncidentResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        incident: mockIncidentRecord({
          id: input.incidentId,
          status: input.status ?? (input.operation === 'start_investigation' ? 'investigating' : 'open'),
          ownerTeam: input.ownerTeam ?? null,
        }),
        environment: 'mock',
        mock: true,
      })
    }
    return transitionRegulatoryIncident(this.requireClient(), input)
  }

  createRegulatoryIncidentCorrectiveAction(
    input: AuthenChainCreateRegulatoryIncidentCorrectiveActionInput,
  ): Promise<AuthenChainCreateRegulatoryIncidentCorrectiveActionResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        correctiveAction: {
          id: 'mock_corrective_action',
          tenantId: 'mock_tenant',
          workspaceId: input.workspaceId ?? null,
          incidentId: input.incidentId,
          actionType: input.actionType,
          status: input.status ?? 'proposed',
          ownerUserId: input.ownerUserId,
          actionSummaryHash: `sha256:${'9'.repeat(64)}`,
          verificationMethodHash: `sha256:${'a'.repeat(64)}`,
          correctiveActionHash: `sha256:${'b'.repeat(64)}`,
          targetDate: input.targetDate,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        environment: 'mock',
        mock: true,
      })
    }
    return createRegulatoryIncidentCorrectiveAction(this.requireClient(), input)
  }

  verifyRegulatoryIncidentCorrectiveAction(
    input: AuthenChainVerifyRegulatoryIncidentCorrectiveActionInput,
  ): Promise<AuthenChainVerifyRegulatoryIncidentCorrectiveActionResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        correctiveAction: {
          id: input.correctiveActionId,
          tenantId: 'mock_tenant',
          incidentId: input.incidentId,
          actionType: 'other',
          status: input.status,
          correctiveActionHash: `sha256:${'b'.repeat(64)}`,
        },
        environment: 'mock',
        mock: true,
      })
    }
    return verifyRegulatoryIncidentCorrectiveAction(this.requireClient(), input)
  }

  exportRegulatoryIncidentEvidencePack(
    input: AuthenChainExportRegulatoryIncidentEvidencePackInput,
  ): Promise<AuthenChainExportRegulatoryIncidentEvidencePackResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        evidencePack: {
          schemaVersion: 'authenchain.incident-governance-evidence-pack.v1',
          incidentId: input.id,
          incidentHash: `sha256:${'7'.repeat(64)}`,
          legalCompliance: 'not_determined',
          environment: 'mock',
          mock: true,
        },
        environment: 'mock',
        mock: true,
      })
    }
    return exportRegulatoryIncidentEvidencePack(this.requireClient(), input)
  }

  listRegulatoryEvidenceFailureAlerts(
    input: AuthenChainListRegulatoryEvidenceFailureAlertsInput = {},
  ): Promise<AuthenChainListRegulatoryEvidenceFailureAlertsResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        alerts: [],
        pagination: { page: input.page ?? 1, pageSize: input.pageSize ?? 25, total: 0, totalPages: 0 },
        environment: 'mock',
        mock: true,
      })
    }
    return listRegulatoryEvidenceFailureAlerts(this.requireClient(), input)
  }

  generateRegulatoryIncidentRecurrenceReport(
    input: AuthenChainGenerateRegulatoryIncidentRecurrenceReportInput,
  ): Promise<AuthenChainGenerateRegulatoryIncidentRecurrenceReportResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        report: {
          id: 'mock_recurrence_report',
          tenantId: 'mock_tenant',
          workspaceId: input.workspaceId ?? null,
          reportPeriodStart: input.reportPeriodStart,
          reportPeriodEnd: input.reportPeriodEnd,
          incidentCount: 0,
          highSeverityCount: 0,
          criticalSeverityCount: 0,
          recurrenceReportHash: `sha256:${'c'.repeat(64)}`,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        built: {},
        environment: 'mock',
        mock: true,
      })
    }
    return generateRegulatoryIncidentRecurrenceReport(this.requireClient(), input)
  }

  buildIncidentGovernanceWebhookMetadata(
    input: AuthenChainIncidentGovernanceWebhookMetadataInput,
  ): AuthenChainIncidentGovernanceWebhookMetadata {
    return buildIncidentGovernanceWebhookMetadata(input)
  }

  verify(input: VerifyInput): Promise<VerifyResponse> {
    if (this.mockMode) return mockVerify(input)
    return verifyProvenance(this.requireClient(), input)
  }

  verifyRegulatoryEvidence(input: VerifyRegulatoryEvidenceInput): Promise<VerifyRegulatoryEvidenceResponse> {
    if (this.mockMode) return mockVerifyRegulatoryEvidence(input)
    return verifyRegulatoryEvidence(this.requireClient(), input)
  }

  exportEvidencePack(input: ExportEvidencePackInput): Promise<ExportEvidencePackResponse> {
    if (this.mockMode) return mockExportEvidencePack(input)
    return exportEvidencePack(this.requireClient(), input)
  }

  verifyEvidencePack(input: VerifyEvidencePackInput): Promise<VerifyEvidencePackResponse> {
    if (this.mockMode) return mockVerifyEvidencePack(input)
    return verifyEvidencePack(this.requireClient(), input)
  }

  captureGeneration<TOutput>(
    input: CaptureGenerationInput<TOutput>
  ): Promise<CaptureGenerationResponse<TOutput>> {
    if (this.mockMode) return mockCaptureGeneration(input)
    return captureGeneration(this.requireClient(), input)
  }

  captureRegulatedOutput<TOutput>(
    input: CaptureRegulatedOutputInput<TOutput>
  ): Promise<CaptureRegulatedOutputResponse<TOutput>> {
    if (this.mockMode) return mockCaptureRegulatedOutput(input)
    return captureRegulatedOutput(this.requireClient(), input)
  }

  wrapGeneration<
    TResult = WrapGenerationCallbackResult,
    TOutput = WrapGenerationOutputFromResult<TResult>,
  >(
    input: WrapGenerationInput<TResult, TOutput>
  ): Promise<WrapGenerationResponse<TResult, TOutput>> {
    if (this.mockMode) return mockWrapGeneration(input)
    return wrapGeneration(this.requireClient(), input)
  }

  getMcpContext(input: OperationRequestOptions = {}): Promise<GetMcpContextResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        schemaVersion: 'authenchain.mcp-context.v1',
        organization: { name: 'Mock organization', environment: 'sandbox' },
        dashboardUrl: 'https://forgetechindustrial.cloud',
        apiVersion: '1',
        scopes: ['mcp:connect'],
        capabilities: { read: true, provenanceHashOnly: true },
        limitations: ['legal_compliance_not_determined'],
        mock: true,
      })
    }
    return getMcpContext(this.requireClient(), input)
  }

  getGovernanceReadiness(input: GetGovernanceReadinessInput = {}): Promise<GetGovernanceReadinessResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        readiness: {
          schemaVersion: 'authenchain.governance-readiness.v1',
          generatedAt: new Date(0).toISOString(),
          dashboardUrl: 'https://forgetechindustrial.cloud',
          summary: { readyUseCases: 0, totalUseCases: 0, pendingRequirements: 0 },
          useCases: [],
          limitations: ['legal_compliance_not_determined'],
        },
        mock: true,
      })
    }
    return getGovernanceReadiness(this.requireClient(), input)
  }

  listPendingGovernance(input: ListPendingGovernanceInput = {}): Promise<ListPendingGovernanceResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        pending: {
          schemaVersion: 'authenchain.governance-pending.v1',
          generatedAt: new Date(0).toISOString(),
          items: [],
          pagination: { page: 1, pageSize: input.pageSize ?? 25, total: 0, totalPages: 0 },
          limitations: ['legal_compliance_not_determined'],
        },
        mock: true,
      })
    }
    return listPendingGovernance(this.requireClient(), input)
  }

  lookupPublicEvidence(input: LookupPublicEvidenceInput): Promise<LookupPublicEvidenceResponse> {
    if (this.mockMode) {
      return Promise.resolve({
        ok: true,
        hash: input.hash.replace(/^sha256:/i, '').toLowerCase(),
        found: false,
        evidencePacks: [],
        policies: [],
        verificationScope: 'public_hash_registry',
        cryptographicEvidencePackVerified: false,
        limitation: 'Mock lookup.',
        mock: true,
      })
    }
    return lookupPublicEvidence(this.requireClient(), input)
  }

  private requireClient(): AuthenChainHttpClient {
    if (!this.client) {
      throw new AuthenChainValidationError({
        message: 'AuthenChain client is unavailable outside live mode',
        code: 'CLIENT_UNAVAILABLE',
      })
    }
    return this.client
  }
}

export class AITLClient extends AuthenChain {}

export {
  AuthenChainApiError,
  AuthenChainError,
  AuthenChainHookError,
  AuthenChainNetworkError,
  AuthenChainTimeoutError,
  AuthenChainValidationError,
  REGULATORY_METADATA_CONTENT_TYPES,
  REGULATORY_METADATA_JURISDICTIONS,
  REGULATORY_METADATA_LABEL_TYPES,
  REGULATORY_METADATA_RISK_CONTEXTS,
  REGULATORY_METADATA_SCHEMA_VERSION,
  activateAiInventoryDeployment,
  attachAiInventoryBindingToMetadata,
  attachDisclosureBindingToMetadata,
  buildIncidentGovernanceWebhookMetadata,
  classifyAiUseCase,
  createAiInventoryDeployment,
  createAiInventoryModelVersion,
  createAiInventorySystem,
  createDisclosureNoticeSnapshot,
  createAiUseCase,
  createImpactAssessmentDraft,
  createRegulatoryIncident,
  createRegulatoryIncidentCorrectiveAction,
  exportControlMappingEvidencePackSection,
  exportImpactAssessmentEvidencePack,
  exportRegulatoryIncidentEvidencePack,
  fetchAiInventoryBinding,
  generateControlMappingSnapshot,
  generateRegulatoryIncidentRecurrenceReport,
  getAiUseCase,
  getAiInventorySystem,
  getGovernanceReadiness,
  getMcpContext,
  getControlMappingMaturity,
  getControlMappingSnapshot,
  getImpactAssessment,
  getRegulatoryIncident,
  getRiskClassificationHistory,
  linkRegulatoryIncidentEvidence,
  listAiInventorySystems,
  listAiUseCases,
  listPendingGovernance,
  lookupPublicEvidence,
  listControlFrameworks,
  listControlRequirements,
  listImpactAssessments,
  listRegulatoryEvidenceFailureAlerts,
  listRegulatoryIncidents,
  previewControlMapping,
  recordContentMarking,
  recordDisclosureApplication,
  recordSyntheticContentDeclaration,
  requestAiInventoryModelChange,
  resolveDisclosureBinding,
  resolveAiInventoryBinding,
  signWithDisclosureEvidence,
  signWithRiskContext,
  submitImpactAssessment,
  summarizeRegulatoryEvidencePack,
  transitionRegulatoryIncident,
  updateImpactAssessmentAnswers,
  updateRegulatoryIncidentTriage,
  validateRegulatoryMetadata,
  verifyDisclosureEvidencePack,
  verifyImpactAssessmentEvidencePack,
  verifyRegulatoryIncidentCorrectiveAction,
}

export type {
  AuthenChainCapturedGeneration,
  AuthenChainExportEvidencePackInput,
  AuthenChainExportEvidencePackResponse,
  AuthenChainExportImpactAssessmentEvidencePackInput,
  AuthenChainExportImpactAssessmentEvidencePackResponse,
  AuthenChainCaptureGenerationInput,
  AuthenChainCaptureRegulatedOutputInput,
  AuthenChainConfig,
  AuthenChainContentEncoding,
  AuthenChainContentType,
  AuthenChainMetadataInput,
  AuthenChainOptions,
  AuthenChainProvenanceMetadata,
  AuthenChainRegulatoryContentType,
  AuthenChainRegulatoryJurisdiction,
  AuthenChainRegulatoryLabelType,
  AuthenChainRegulatoryRiskContext,
  AuthenChainRegulatoryEvidenceStatus,
  AuthenChainRegulatoryVerificationScope,
  AuthenChainLegalComplianceStatus,
  AuthenChainRegulatoryEvidencePackSummary,
  AuthenChainRegulatoryEvidenceVerification,
  AuthenChainSignInput,
  AuthenChainSignedProvenance,
  AuthenChainVerification,
  AuthenChainCapturedRegulatedOutput,
  AuthenChainVerifyRegulatoryEvidenceInput,
  AuthenChainVerifyEvidencePackInput,
  AuthenChainVerifyEvidencePackResponse,
  AuthenChainVerifyInput,
  AuthenChainWrappedGeneration,
  AuthenChainAiUseCaseInput,
  AuthenChainAiUseCase,
  AuthenChainAiDeploymentEnvironment,
  AuthenChainAiInventoryBinding,
  AuthenChainAiInventoryBindingReference,
  AuthenChainAiInventoryEnforcementMode,
  AuthenChainAiInventorySigningBinding,
  AuthenChainAiInventorySystem,
  AuthenChainContentMarking,
  AuthenChainCreateDisclosureNoticeSnapshotInput,
  AuthenChainCreateDisclosureNoticeSnapshotResponse,
  AuthenChainDisclosureApplication,
  AuthenChainDisclosureBinding,
  AuthenChainDisclosureBindingReference,
  AuthenChainDisclosureContentCredentialStandard,
  AuthenChainDisclosureEnforcementMode,
  AuthenChainDisclosureLifecycleStatus,
  AuthenChainDisclosureMarkingEvidenceType,
  AuthenChainDisclosureMarkingType,
  AuthenChainDisclosureNoticeChannel,
  AuthenChainDisclosureNoticeDisplayMode,
  AuthenChainDisclosureNoticePlacement,
  AuthenChainDisclosureNoticeSnapshot,
  AuthenChainDisclosureNotInformedReasonCode,
  AuthenChainDisclosureSyntheticContentStatus,
  AuthenChainDisclosureSyntheticContentType,
  AuthenChainRecordContentMarkingInput,
  AuthenChainRecordContentMarkingResponse,
  AuthenChainRecordDisclosureApplicationInput,
  AuthenChainRecordDisclosureApplicationResponse,
  AuthenChainRecordSyntheticContentDeclarationInput,
  AuthenChainRecordSyntheticContentDeclarationResponse,
  AuthenChainResolveDisclosureBindingInput,
  AuthenChainResolveDisclosureBindingResponse,
  AuthenChainSignWithDisclosureEvidenceInput,
  AuthenChainSyntheticContentDeclaration,
  AuthenChainVerifyDisclosureEvidencePackInput,
  AuthenChainVerifyDisclosureEvidencePackResponse,
  AuthenChainCorrectiveAction,
  AuthenChainCorrectiveActionStatus,
  AuthenChainCorrectiveActionType,
  AuthenChainCreateRegulatoryIncidentCorrectiveActionInput,
  AuthenChainCreateRegulatoryIncidentCorrectiveActionResponse,
  AuthenChainCreateRegulatoryIncidentInput,
  AuthenChainCreateRegulatoryIncidentResponse,
  AuthenChainEvidenceFailureAlert,
  AuthenChainEvidenceFailureStatus,
  AuthenChainExportRegulatoryIncidentEvidencePackInput,
  AuthenChainExportRegulatoryIncidentEvidencePackResponse,
  AuthenChainGenerateRegulatoryIncidentRecurrenceReportInput,
  AuthenChainGenerateRegulatoryIncidentRecurrenceReportResponse,
  AuthenChainGetRegulatoryIncidentInput,
  AuthenChainGetRegulatoryIncidentResponse,
  AuthenChainIncidentAffectedGroup,
  AuthenChainIncidentEvidenceLink,
  AuthenChainIncidentEvidenceLinkType,
  AuthenChainIncidentEvidenceVerificationStatus,
  AuthenChainIncidentGovernanceWebhookMetadataInput,
  AuthenChainIncidentGovernanceWebhookMetadata,
  AuthenChainIncidentPriority,
  AuthenChainIncidentRecord,
  AuthenChainIncidentRecurrenceReport,
  AuthenChainIncidentSeverity,
  AuthenChainIncidentSource,
  AuthenChainIncidentStatus,
  AuthenChainIncidentWebhookEventType,
  AuthenChainLinkRegulatoryIncidentEvidenceInput,
  AuthenChainLinkRegulatoryIncidentEvidenceResponse,
  AuthenChainListRegulatoryEvidenceFailureAlertsInput,
  AuthenChainListRegulatoryEvidenceFailureAlertsResponse,
  AuthenChainListRegulatoryIncidentsInput,
  AuthenChainListRegulatoryIncidentsResponse,
  AuthenChainTransitionRegulatoryIncidentInput,
  AuthenChainTransitionRegulatoryIncidentResponse,
  AuthenChainUpdateRegulatoryIncidentTriageInput,
  AuthenChainUpdateRegulatoryIncidentTriageResponse,
  AuthenChainVerifyRegulatoryIncidentCorrectiveActionInput,
  AuthenChainVerifyRegulatoryIncidentCorrectiveActionResponse,
  AuthenChainAiModelChange,
  AuthenChainAiModelChangeStatus,
  AuthenChainAiModelChangeType,
  AuthenChainAiModelDeploymentLifecycleStatus,
  AuthenChainAiModelHostingMode,
  AuthenChainAiModelProvider,
  AuthenChainAiModelVersion,
  AuthenChainAiModelVersionLifecycleStatus,
  AuthenChainAiSystemLifecycleStatus,
  AuthenChainRiskClassification,
  AuthenChainRiskClassificationSummary,
  AuthenChainRiskDecisionType,
  AuthenChainRiskJurisdiction,
  AuthenChainRiskReviewStatus,
  AuthenChainRiskSector,
  AuthenChainRiskTier,
  AuthenChainSignedRiskContext,
  AuthenChainControlFramework,
  AuthenChainControlFrameworkId,
  AuthenChainControlMappingJurisdiction,
  AuthenChainControlMappingMaturity,
  AuthenChainControlMappingPreview,
  AuthenChainControlMappingShareMode,
  AuthenChainControlMappingSnapshot,
  AuthenChainControlMappingStatus,
  AuthenChainControlRequirement,
  AuthenChainExportControlMappingEvidencePackSectionInput,
  AuthenChainExportControlMappingEvidencePackSectionResponse,
  AuthenChainGenerateControlMappingSnapshotInput,
  AuthenChainGenerateControlMappingSnapshotResponse,
  AuthenChainGetControlMappingMaturityInput,
  AuthenChainGetControlMappingMaturityResponse,
  AuthenChainGetControlMappingSnapshotInput,
  AuthenChainGetControlMappingSnapshotResponse,
  AuthenChainListControlFrameworksInput,
  AuthenChainListControlFrameworksResponse,
  AuthenChainListControlRequirementsInput,
  AuthenChainListControlRequirementsResponse,
  AuthenChainPreviewControlMappingInput,
  AuthenChainPreviewControlMappingResponse,
  AuthenChainSubmitImpactAssessmentInput,
  AuthenChainSubmitImpactAssessmentResponse,
  AuthenChainUpdateImpactAssessmentAnswersInput,
  AuthenChainUpdateImpactAssessmentAnswersResponse,
  AuthenChainVerifyImpactAssessmentEvidencePackInput,
  AuthenChainVerifyImpactAssessmentEvidencePackResponse,
  AuthenChainListAiInventorySystemsInput,
  AuthenChainListAiInventorySystemsResponse,
  AuthenChainCreateAiInventorySystemInput,
  AuthenChainCreateAiInventorySystemResponse,
  AuthenChainCreateAiInventoryModelVersionInput,
  AuthenChainCreateAiInventoryModelVersionResponse,
  AuthenChainCreateAiInventoryDeploymentInput,
  AuthenChainCreateAiInventoryDeploymentResponse,
  AuthenChainActivateAiInventoryDeploymentInput,
  AuthenChainActivateAiInventoryDeploymentResponse,
  AuthenChainRequestAiInventoryModelChangeInput,
  AuthenChainRequestAiInventoryModelChangeResponse,
  AuthenChainResolveAiInventoryBindingInput,
  AuthenChainResolveAiInventoryBindingResponse,
  AuthenChainFetchAiInventoryBindingInput,
  AuthenChainFetchAiInventoryBindingResponse,
  ClassifyAiUseCaseInput,
  ClassifyAiUseCaseResponse,
  CreateAiUseCaseResponse,
  CreateImpactAssessmentDraftInput,
  CreateImpactAssessmentDraftResponse,
  ActivateAiInventoryDeploymentInput,
  ActivateAiInventoryDeploymentResponse,
  AuthenChainWrapGenerationInput,
  CaptureGenerationInput,
  CaptureGenerationResponse,
  CaptureRegulatedOutputInput,
  CaptureRegulatedOutputResponse,
  ContentEvidenceInput,
  ContentEvidenceSideInput,
  CreateAiInventoryDeploymentInput,
  CreateAiInventoryDeploymentResponse,
  CreateAiInventoryModelVersionInput,
  CreateAiInventoryModelVersionResponse,
  CreateAiInventorySystemInput,
  CreateAiInventorySystemResponse,
  ErrorHookContext,
  EvidencePackTrustFields,
  ExportEvidencePackInput,
  ExportEvidencePackResponse,
  ExportImpactAssessmentEvidencePackInput,
  ExportImpactAssessmentEvidencePackResponse,
  GetAiUseCaseInput,
  GetAiUseCaseResponse,
  GetImpactAssessmentInput,
  GetImpactAssessmentResponse,
  GetRiskClassificationHistoryInput,
  GetRiskClassificationHistoryResponse,
  FetchAiInventoryBindingInput,
  FetchAiInventoryBindingResponse,
  ListAiInventorySystemsInput,
  ListAiInventorySystemsResponse,
  ListImpactAssessmentsInput,
  ListImpactAssessmentsResponse,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  MetadataInput,
  LookupPublicEvidenceInput,
  LookupPublicEvidenceResponse,
  OperationRequestOptions,
  ProvenanceMetadata,
  RegulatoryMetadataV1,
  RegulatoryEvidencePackSummary,
  RequestHookContext,
  ResponseHookContext,
  RetryConfig,
  RequestAiInventoryModelChangeInput,
  RequestAiInventoryModelChangeResponse,
  ResolveAiInventoryBindingInput,
  ResolveAiInventoryBindingResponse,
  SignInput,
  SignResponse,
  SignWithRiskContextInput,
  SubmitImpactAssessmentInput,
  SubmitImpactAssessmentResponse,
  UpdateImpactAssessmentAnswersInput,
  UpdateImpactAssessmentAnswersResponse,
  VerifyInput,
  VerifyRegulatoryEvidenceInput,
  VerifyRegulatoryEvidenceResponse,
  VerifyEvidencePackInput,
  VerifyEvidencePackResponse,
  VerifyImpactAssessmentEvidencePackInput,
  VerifyImpactAssessmentEvidencePackResponse,
  VerifyResponse,
  WrapGenerationCallbackResult,
  WrapGenerationInput,
  WrapGenerationOutputFromResult,
  WrapGenerationResponse,
  WrapGenerationResultObject,
  AuthenChainGovernanceCorrection,
  AuthenChainGovernanceRequirement,
  AuthenChainGovernanceUseCaseReadiness,
  AuthenChainMcpContext,
  GetAiInventorySystemInput,
  GetAiInventorySystemResponse,
  GetGovernanceReadinessInput,
  GetGovernanceReadinessResponse,
  GetMcpContextResponse,
  ListAiUseCasesInput,
  ListAiUseCasesResponse,
  ListPendingGovernanceInput,
  ListPendingGovernanceResponse,
}
  from './types.js'

export type {
  RegulatoryMetadataIssueSeverity,
  RegulatoryMetadataValidationIssue,
  RegulatoryMetadataValidationResult,
}
  from './regulatory-metadata.js'

// R7T-015 (Sprint 3D): hash-only signing helper and standalone webhook verifier.
export { signWithContentHash } from './sign.js'
export type { SignWithContentHashInput } from './sign.js'
export {
  verifyAuthenChainWebhook,
  verifyAuthenChainWebhookSignature,
  AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS,
} from './webhook-verifier.js'
export { AUTHENCHAIN_PRODUCTION_BASE_URL } from './client.js'
export type {
  VerifyAuthenChainWebhookParams,
  VerifyAuthenChainWebhookResult,
  VerifyAuthenChainWebhookRequestParams,
  VerifyAuthenChainWebhookRequestResult,
  AuthenChainWebhookHeaders,
  AuthenChainWebhookReplayStore,
  WebhookVerifierSeenNonces,
} from './webhook-verifier.js'
