from __future__ import annotations

from typing import Any, Dict, List, Literal, TypedDict

AuthenChainRegulatoryJurisdiction = Literal["EU", "BR", "US", "GLOBAL"]
AuthenChainRegulatoryContentType = Literal["text", "image", "audio", "video", "document", "json"]
AuthenChainRegulatoryRiskContext = Literal["low", "limited", "high", "unknown"]
AuthenChainRegulatoryLabelType = Literal["machine_readable", "human_visible", "both", "none"]
# R7B-HIGH-004 / R7B-HIGH-005 (Sprint 3B-3)
AuthenChainRegulatorySensitiveDataCategory = Literal[
    "none",
    "health",
    "racial_ethnic",
    "religious_belief",
    "political_opinion",
    "union_membership",
    "philosophical_belief",
    "genetic",
    "biometric",
    "sexual_life",
    "criminal_records",
    "other_customer_declared",
]
AuthenChainRegulatoryMinorsConsentBasis = Literal[
    "parental_consent",
    "legitimate_interest_with_safeguards",
    "legal_obligation",
]
AuthenChainRegulatoryLegalBasis = Literal[
    "consent",
    "legal_obligation",
    "public_administration_execution",
    "research_study",
    "contract_execution",
    "judicial_administrative_arbitral",
    "protection_of_life",
    "health_protection",
    "legitimate_interest",
    "credit_protection",
    "gdpr_vital_interests",
    "public_interest_specific_law",
    "shared_database_public_entities",
    "other_customer_documented",
]
AuthenChainRegulatoryEvidenceStatus = Literal["not_applicable", "complete", "incomplete", "invalid"]
AuthenChainRegulatoryVerificationScope = Literal["provenance", "evidence_pack", "combined"]
AuthenChainLegalComplianceStatus = Literal["not_determined"]
AuthenChainRiskJurisdiction = Literal["EU", "BR", "US", "GLOBAL"]
AuthenChainRiskSector = Literal[
    "health",
    "financial_services",
    "legal",
    "education",
    "human_resources",
    "government",
    "insurance",
    "public_safety",
    "law_enforcement",
    "critical_infrastructure",
    "housing",
    "marketing",
    "customer_support",
    "internal_productivity",
    "general_business",
    "other",
]
AuthenChainRiskDecisionType = Literal[
    "informative",
    "recommendation",
    "automated_decision",
    "consequential_decision",
]
AuthenChainRiskTier = Literal["low_risk", "limited_risk", "high_risk", "prohibited"]
AuthenChainRiskReviewStatus = Literal[
    "suggested",
    "approved",
    "overridden",
    "needs_legal_review",
    "blocked",
    "superseded",
]
AuthenChainDataSensitivityLevel = Literal["low", "medium", "high", "restricted"]


class RegulatoryMetadataV1(TypedDict, total=False):
    schema_version: Literal["regulatory.v1"]
    ai_generated: bool
    jurisdiction: AuthenChainRegulatoryJurisdiction
    regulatory_context: List[str]
    content_type: AuthenChainRegulatoryContentType
    model_provider: str
    model_name: str
    model_version: str
    system_purpose: str
    risk_context: AuthenChainRegulatoryRiskContext
    human_reviewed: bool
    reviewer_role: str
    review_timestamp: str
    disclosure_required: bool
    disclosure_applied: bool
    label_type: AuthenChainRegulatoryLabelType
    policy_version: str
    riskContext: "SignedRiskContext"
    impactAssessmentId: str
    impactAssessmentHash: str
    impactAssessmentStatus: str
    impactAssessmentApprovedAt: str
    # R7B-HIGH-004: customer-declared sensitive data category and minor processing flags.
    sensitive_data_category: AuthenChainRegulatorySensitiveDataCategory
    involves_minors: bool
    minors_consent_basis: AuthenChainRegulatoryMinorsConsentBasis
    sensitive_data_category_detail: str
    # legal_basis: lawful basis for the data PROCESSING that produced this AI output
    # (LGPD Art. 7 / 23 / GDPR Art. 6 / 9). Distinct from the forensic-access legal
    # basis (decrypt operations under a Forensic Access Grant).
    legal_basis: AuthenChainRegulatoryLegalBasis
    legal_basis_reference: str
    # R7B-MED-001: free-form RoPA data-subject category (LGPD Art. 37).
    data_subject_category: str


class SignedRiskContext(TypedDict):
    schemaVersion: Literal["authenchain.regulatory.v2"]
    jurisdiction: AuthenChainRiskJurisdiction
    sector: AuthenChainRiskSector
    decisionType: AuthenChainRiskDecisionType
    useCaseId: str
    riskClassificationId: str
    riskTier: AuthenChainRiskTier
    riskPolicyVersion: str
    riskRulesetHash: str
    riskContextHash: str
    reviewStatus: AuthenChainRiskReviewStatus
    humanReviewRequired: bool
    disclosureRequired: bool


class AiUseCaseInput(TypedDict, total=False):
    name: str
    description: str
    ownerUserId: str
    businessOwner: str
    technicalOwner: str
    jurisdiction: AuthenChainRiskJurisdiction
    sector: AuthenChainRiskSector
    decisionType: AuthenChainRiskDecisionType
    contextFlags: Dict[str, bool]
    dataSensitivity: AuthenChainDataSensitivityLevel
    modelProvider: str
    modelName: str
    modelVersion: str
    workflowName: str


class RiskClassification(TypedDict, total=False):
    id: str
    aiUseCaseId: str
    suggestedRiskTier: AuthenChainRiskTier
    approvedRiskTier: AuthenChainRiskTier
    effectiveRiskTier: AuthenChainRiskTier
    reviewStatus: AuthenChainRiskReviewStatus
    policyVersion: str
    rulesetHash: str
    justification: JsonObject
    matchedRules: List[JsonObject]
    requiredControls: List[str]


class RegulatoryMetadataValidationIssue(TypedDict):
    severity: Literal["error", "warning"]
    code: str
    path: str
    message: str


class RegulatoryMetadataValidationResult(TypedDict, total=False):
    valid: bool
    regulatory: RegulatoryMetadataV1
    errors: List[RegulatoryMetadataValidationIssue]
    warnings: List[RegulatoryMetadataValidationIssue]


JsonObject = Dict[str, Any]


class CaptureAssurance(TypedDict):
    schemaVersion: Literal["authenchain.assurance.v1"]
    assuranceLevel: Literal["A0", "A1"]
    captureMethod: Literal["attest_submitted_hash", "observe_submitted_content"]
    contentObserved: bool
    limitations: List[str]


class MetadataRequired(TypedDict):
    issuer: str
    content_type: Literal["text", "image", "video"]
    created_at: str
    nonce: str


class ProvenanceMetadata(MetadataRequired, total=False):
    schema_version: Literal["1.0", "1.1"]
    trace_id: str
    assurance: CaptureAssurance
    extra: JsonObject
