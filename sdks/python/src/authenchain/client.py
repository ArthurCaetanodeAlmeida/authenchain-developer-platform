from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import socket
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Mapping, Optional
from urllib import error, parse, request

from .exceptions import (
    AuthenChainApiError,
    AuthenChainNetworkError,
    AuthenChainTimeoutError,
    AuthenChainValidationError,
)

DEFAULT_BASE_URL = "https://api.authenchain.com"
DEFAULT_TIMEOUT = 10.0
DEFAULT_MAX_RETRIES = 0
REGULATORY_METADATA_SCHEMA_VERSION = "regulatory.v1"
REGULATORY_VERIFICATION_SCHEMA_VERSION = "authenchain.regulatory-verification.v1"

REGULATORY_METADATA_JURISDICTIONS = ("EU", "BR", "US", "GLOBAL")
REGULATORY_METADATA_CONTENT_TYPES = ("text", "image", "audio", "video", "document", "json")
REGULATORY_METADATA_RISK_CONTEXTS = ("low", "limited", "high", "unknown")
REGULATORY_METADATA_LABEL_TYPES = ("machine_readable", "human_visible", "both", "none")
# R7B-HIGH-004 / R7B-HIGH-005 (Sprint 3B-3)
REGULATORY_SENSITIVE_DATA_CATEGORIES = (
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
)
REGULATORY_MINORS_CONSENT_BASES = (
    "parental_consent",
    "legitimate_interest_with_safeguards",
    "legal_obligation",
)
REGULATORY_LEGAL_BASES = (
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
)
REGULATORY_METADATA_KEYS = {
    "schema_version",
    "ai_generated",
    "jurisdiction",
    "regulatory_context",
    "content_type",
    "model_provider",
    "model_name",
    "model_version",
    "system_purpose",
    "risk_context",
    "human_reviewed",
    "reviewer_role",
    "review_timestamp",
    "disclosure_required",
    "disclosure_applied",
    "label_type",
    "policy_version",
    "riskContext",
    "impactAssessmentId",
    "impactAssessmentHash",
    "impactAssessmentStatus",
    "impactAssessmentApprovedAt",
    "sensitive_data_category",
    "involves_minors",
    "minors_consent_basis",
    "sensitive_data_category_detail",
    "legal_basis",
    "legal_basis_reference",
    "data_subject_category",
}
REGULATORY_EVIDENCE_STATUSES = {"not_applicable", "complete", "incomplete", "invalid"}
REGULATORY_VERIFICATION_SCOPES = {"provenance", "evidence_pack", "combined"}
CUSTOMER_RESPONSIBILITIES = [
    "Classify the AI workflow risk context through customer policy, backend workflow, or compliance review.",
    "Determine legal basis, disclosure requirements, and jurisdiction-specific obligations.",
    "Confirm whether human review, labeling, retention, and dispute handling are legally sufficient.",
    "Use legal or compliance counsel for final regulatory interpretation.",
]
MOCK_SIGNED_AT = "2026-01-01T00:00:00.000Z"
MOCK_KEY_ID = "mock_key_local"
MOCK_ALGORITHM = "MOCK-SHA256"
MOCK_WARNING = "Mock mode output is not externally trustworthy evidence."

Transport = Callable[[str, str, Optional[Dict[str, Any]], Optional[Dict[str, Any]]], Dict[str, Any]]


@dataclass(frozen=True)
class AuthenChainConfig:
    api_key: Optional[str] = field(repr=False)
    base_url: str
    timeout: float
    mock: bool
    max_retries: int


class AuthenChain:
    """AuthenChain Python SDK client."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        mock: bool = False,
        max_retries: int = DEFAULT_MAX_RETRIES,
        transport: Optional[Transport] = None,
    ) -> None:
        env_mock = os.getenv("AUTHENCHAIN_MOCK_MODE") == "true"
        resolved_mock = bool(mock or env_mock)
        resolved_api_key = _normalize_optional_string(api_key) or _normalize_optional_string(
            os.getenv("AUTHENCHAIN_API_KEY")
        )

        if not resolved_mock and not resolved_api_key:
            raise AuthenChainValidationError("AuthenChain requires api_key unless mock mode is enabled")

        if timeout <= 0:
            raise AuthenChainValidationError("timeout must be greater than zero")

        if max_retries < 0:
            raise AuthenChainValidationError("max_retries must be zero or greater")

        resolved_base_url = _normalize_base_url(
            base_url or os.getenv("AUTHENCHAIN_BASE_URL") or DEFAULT_BASE_URL
        )

        self.config = AuthenChainConfig(
            api_key=resolved_api_key,
            base_url=resolved_base_url,
            timeout=float(timeout),
            mock=resolved_mock,
            max_retries=int(max_retries),
        )
        self._transport = transport

    @property
    def is_mock(self) -> bool:
        return self.config.mock

    def sign(
        self,
        *,
        content: Optional[str] = None,
        content_hash: Optional[str] = None,
        metadata: Mapping[str, Any],
        content_encoding: Optional[str] = None,
        content_evidence: Optional[Mapping[str, Any]] = None,
        hash_only: bool = False,
        generate_metadata_defaults: bool = False,
        ai_use_case_id: Optional[str] = None,
        risk_classification_id: Optional[str] = None,
        impact_assessment_id: Optional[str] = None,
        impact_assessment_hash: Optional[str] = None,
        impact_assessment_gate: Optional[Mapping[str, Any]] = None,
        risk_context: Optional[Mapping[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not content and not content_hash:
            raise AuthenChainValidationError("sign requires content or content_hash")
        if not isinstance(metadata, Mapping):
            raise AuthenChainValidationError("sign requires metadata as a dictionary")

        # R7T-015 (Sprint 3D): hash-only mode. When the caller opts in and supplies raw
        # content, compute the SHA-256 locally and send only the hash.
        wire_content = content
        wire_content_hash = content_hash
        if hash_only and content is not None:
            wire_content_hash = _sha256_hex_for_encoding(content, content_encoding)
            wire_content = None

        # R7T-015: captureMode guard parity with the Node SDK - reject plaintext
        # content evidence with no captureMode (fail-closed) and strip on hash_only.
        prepared_content_evidence = _prepare_content_evidence_for_wire(content_evidence)

        if self.config.mock:
            return _mock_sign(
                content=wire_content,
                content_hash=wire_content_hash,
                metadata=metadata,
                content_encoding=content_encoding if wire_content is not None else None,
            )

        body = _clean_dict(
            {
                "content": wire_content,
                "content_hash": wire_content_hash,
                "content_encoding": content_encoding if wire_content is not None else None,
                "contentEvidence": prepared_content_evidence,
                "aiUseCaseId": _normalize_optional_non_empty(ai_use_case_id, "ai_use_case_id"),
                "riskClassificationId": _normalize_optional_non_empty(risk_classification_id, "risk_classification_id"),
                "impactAssessmentId": _normalize_optional_non_empty(impact_assessment_id, "impact_assessment_id"),
                "impactAssessmentHash": _normalize_optional_non_empty(impact_assessment_hash, "impact_assessment_hash"),
                "impactAssessmentGate": dict(impact_assessment_gate) if isinstance(impact_assessment_gate, Mapping) else impact_assessment_gate,
                "riskContext": dict(risk_context) if isinstance(risk_context, Mapping) else risk_context,
                "metadata": dict(metadata),
                "generateMetadataDefaults": generate_metadata_defaults if generate_metadata_defaults else None,
            }
        )
        operation_idempotency_key = _normalize_optional_string(idempotency_key) or f"sign:{uuid.uuid4()}"
        payload = self._request(
            "POST",
            "/api/provenance/sign",
            body=body,
            request_options=_request_options(operation_idempotency_key, request_id, correlation_id),
        )
        return _map_sign_response(payload)

    def sign_with_content_hash(
        self,
        *,
        content_hash: str,
        metadata: Mapping[str, Any],
        generate_metadata_defaults: bool = False,
        ai_use_case_id: Optional[str] = None,
        risk_classification_id: Optional[str] = None,
        impact_assessment_id: Optional[str] = None,
        impact_assessment_hash: Optional[str] = None,
        impact_assessment_gate: Optional[Mapping[str, Any]] = None,
        risk_context: Optional[Mapping[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """R7T-015 (Sprint 3D): sign a pre-computed SHA-256 content hash.

        The raw content never touches the SDK or the wire - the caller hashes in
        their own environment and passes the 64-character hex digest.
        """
        normalized = (content_hash or "").strip()
        if not re.fullmatch(r"[0-9a-fA-F]{64}", normalized):
            raise AuthenChainValidationError(
                "sign_with_content_hash requires content_hash to be a 64-character hex SHA-256 digest",
                code="INVALID_CONTENT_HASH",
            )
        return self.sign(
            content_hash=normalized,
            metadata=metadata,
            generate_metadata_defaults=generate_metadata_defaults,
            ai_use_case_id=ai_use_case_id,
            risk_classification_id=risk_classification_id,
            impact_assessment_id=impact_assessment_id,
            impact_assessment_hash=impact_assessment_hash,
            impact_assessment_gate=impact_assessment_gate,
            risk_context=risk_context,
            idempotency_key=idempotency_key,
            request_id=request_id,
            correlation_id=correlation_id,
        )

    def create_ai_use_case(
        self,
        *,
        name: str,
        jurisdiction: str,
        sector: str,
        decision_type: str,
        description: Optional[str] = None,
        owner_user_id: Optional[str] = None,
        business_owner: Optional[str] = None,
        technical_owner: Optional[str] = None,
        context_flags: Optional[Mapping[str, bool]] = None,
        data_sensitivity: Optional[str] = None,
        model_provider: Optional[str] = None,
        model_name: Optional[str] = None,
        model_version: Optional[str] = None,
        workflow_name: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not name.strip():
            raise AuthenChainValidationError("create_ai_use_case requires name")
        if self.config.mock:
            return {
                "ok": True,
                "useCase": {
                    "id": "mock_use_case",
                    "name": name,
                    "jurisdiction": jurisdiction,
                    "sector": sector,
                    "decisionType": decision_type,
                    "contextFlags": dict(context_flags or {}),
                    "dataSensitivity": data_sensitivity,
                    "modelProvider": model_provider,
                    "modelName": model_name,
                    "modelVersion": model_version,
                    "workflowName": workflow_name,
                },
            }
        body = _clean_dict(
            {
                "name": name,
                "description": description,
                "ownerUserId": owner_user_id,
                "businessOwner": business_owner,
                "technicalOwner": technical_owner,
                "jurisdiction": jurisdiction,
                "sector": sector,
                "decisionType": decision_type,
                "contextFlags": dict(context_flags or {}),
                "dataSensitivity": data_sensitivity,
                "modelProvider": model_provider,
                "modelName": model_name,
                "modelVersion": model_version,
                "workflowName": workflow_name,
            }
        )
        return self._request(
            "POST",
            "/api/regulatory/risk/use-cases",
            body=body,
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )

    def get_ai_use_case(
        self,
        ai_use_case_id: str,
        *,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        use_case_id = _normalize_required_non_empty(ai_use_case_id, "ai_use_case_id")
        if self.config.mock:
            return {
                "ok": True,
                "useCase": {
                    "id": use_case_id,
                    "name": "Mock AI use case",
                    "jurisdiction": "EU",
                    "sector": "general_business",
                    "decisionType": "informative",
                },
            }
        return self._request(
            "GET",
            f"/api/regulatory/risk/use-cases/{parse.quote(use_case_id, safe='')}",
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )

    def classify_ai_use_case(
        self,
        ai_use_case_id: str,
        *,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        use_case_id = _normalize_required_non_empty(ai_use_case_id, "ai_use_case_id")
        if self.config.mock:
            return {
                "ok": True,
                "classification": {
                    "id": "mock_risk_classification",
                    "aiUseCaseId": use_case_id,
                    "suggestedRiskTier": "low_risk",
                    "effectiveRiskTier": "low_risk",
                    "reviewStatus": "suggested",
                    "policyVersion": "mock-policy",
                    "rulesetHash": "sha256:mock",
                },
            }
        return self._request(
            "POST",
            f"/api/regulatory/risk/use-cases/{parse.quote(use_case_id, safe='')}/classify",
            body={},
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )

    def get_risk_classification_history(
        self,
        ai_use_case_id: str,
        *,
        page: int = 1,
        page_size: int = 50,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        use_case_id = _normalize_required_non_empty(ai_use_case_id, "ai_use_case_id")
        if self.config.mock:
            return {
                "ok": True,
                "history": [],
                "pagination": {"page": page, "pageSize": page_size, "total": 0, "totalPages": 0},
            }
        return self._request(
            "GET",
            f"/api/regulatory/risk/use-cases/{parse.quote(use_case_id, safe='')}/history",
            query={"page": page, "pageSize": page_size},
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )

    def sign_with_risk_context(
        self,
        *,
        ai_use_case_id: str,
        risk_classification_id: str,
        content: Optional[str] = None,
        content_hash: Optional[str] = None,
        metadata: Mapping[str, Any],
        risk_context: Optional[Mapping[str, Any]] = None,
        impact_assessment_id: Optional[str] = None,
        impact_assessment_hash: Optional[str] = None,
        impact_assessment_gate: Optional[Mapping[str, Any]] = None,
        content_encoding: Optional[str] = None,
        content_evidence: Optional[Mapping[str, Any]] = None,
        generate_metadata_defaults: bool = False,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.sign(
            content=content,
            content_hash=content_hash,
            metadata=metadata,
            content_encoding=content_encoding,
            content_evidence=content_evidence,
            generate_metadata_defaults=generate_metadata_defaults,
            ai_use_case_id=_normalize_required_non_empty(ai_use_case_id, "ai_use_case_id"),
            risk_classification_id=_normalize_required_non_empty(risk_classification_id, "risk_classification_id"),
            impact_assessment_id=impact_assessment_id,
            impact_assessment_hash=impact_assessment_hash,
            impact_assessment_gate=impact_assessment_gate,
            risk_context=risk_context,
            idempotency_key=idempotency_key,
            request_id=request_id,
            correlation_id=correlation_id,
        )

    def verify(
        self,
        *,
        content: Optional[str] = None,
        content_hash: Optional[str] = None,
        metadata: Optional[Mapping[str, Any]] = None,
        signature: Optional[str] = None,
        public_key_id: Optional[str] = None,
        provenance: Optional[Mapping[str, Any]] = None,
        content_encoding: Optional[str] = None,
        content_evidence: Optional[Mapping[str, Any]] = None,
        generate_metadata_defaults: bool = False,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not content and not content_hash:
            raise AuthenChainValidationError("verify requires content or content_hash")

        if provenance is not None:
            if not isinstance(provenance, Mapping):
                raise AuthenChainValidationError("provenance must be a dictionary")
            metadata = _as_mapping(provenance.get("metadata"), "provenance.metadata")
            signature = _optional_string(provenance.get("signature"))
            public_key_id = _optional_string(provenance.get("publicKeyId")) or _optional_string(
                provenance.get("public_key_id")
            )

        if not isinstance(metadata, Mapping):
            raise AuthenChainValidationError("verify requires metadata as a dictionary")
        if not signature:
            raise AuthenChainValidationError("verify requires signature")
        if not public_key_id:
            raise AuthenChainValidationError("verify requires public_key_id")

        if self.config.mock:
            return _mock_verify(
                content=content,
                content_hash=content_hash,
                metadata=metadata,
                signature=signature,
                public_key_id=public_key_id,
                content_encoding=content_encoding,
            )

        body = _clean_dict(
            {
                "content": content,
                "content_hash": content_hash,
                "content_encoding": content_encoding,
                "contentEvidence": content_evidence,
                "metadata": dict(metadata),
                "signature": signature,
                "public_key_id": public_key_id,
                "generateMetadataDefaults": generate_metadata_defaults if generate_metadata_defaults else None,
            }
        )
        payload = self._request(
            "POST",
            "/api/provenance/verify",
            body=body,
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )
        return _map_verify_response(payload)

    def export_evidence_pack(
        self,
        *,
        trace_id: Optional[str] = None,
        from_time: Optional[Any] = None,
        to: Optional[Any] = None,
        limit: Optional[int] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not trace_id and from_time is None and to is None:
            raise AuthenChainValidationError("export_evidence_pack requires trace_id, from_time, or to")
        if limit is not None and (not isinstance(limit, int) or limit <= 0):
            raise AuthenChainValidationError("limit must be a positive integer")

        if self.config.mock:
            return _mock_export_evidence_pack(trace_id=trace_id, from_time=from_time, to=to)

        query = _clean_dict(
            {
                "traceId": _normalize_optional_non_empty(trace_id, "trace_id"),
                "from": _normalize_optional_datetime(from_time, "from_time"),
                "to": _normalize_optional_datetime(to, "to"),
                "limit": limit,
            }
        )
        payload = self._request(
            "GET",
            "/api/provenance/evidence-pack",
            query=query,
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )
        _require_evidence_pack_trust_fields(payload)
        return {**payload, "rawResponse": payload}

    def verify_evidence_pack(
        self,
        *,
        evidence_pack: Any,
        content_evidence_by_proof_index: Optional[Any] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if evidence_pack is None:
            raise AuthenChainValidationError("verify_evidence_pack requires evidence_pack")

        if self.config.mock:
            return _mock_verify_evidence_pack(evidence_pack)

        body = _clean_dict(
            {
                "evidencePack": evidence_pack,
                "contentEvidenceByProofIndex": content_evidence_by_proof_index,
            }
        )
        payload = self._request(
            "POST",
            "/api/public/evidence/verify",
            body=body,
            request_options=_request_options(idempotency_key, request_id, correlation_id),
        )
        _require_evidence_pack_trust_fields(payload)
        return {**payload, "rawResponse": payload}

    def validate_regulatory_metadata(self, input_value: Any) -> Dict[str, Any]:
        return _validate_regulatory_metadata(input_value)

    def capture_regulated_output(
        self,
        *,
        output: Any,
        issuer: str,
        regulatory: Mapping[str, Any],
        serialize_output: Optional[Callable[[Any], str]] = None,
        content_encoding: Optional[str] = None,
        schema_version: Optional[str] = None,
        content_type: Optional[str] = None,
        created_at: Optional[str] = None,
        nonce: Optional[str] = None,
        trace_id: Optional[str] = None,
        model: Optional[str] = None,
        user_ref: Optional[str] = None,
        extra: Optional[Mapping[str, Any]] = None,
        generate_metadata_defaults: bool = False,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        validation = _validate_regulatory_metadata(regulatory)
        if not validation["valid"] or "regulatory" not in validation:
            raise AuthenChainValidationError(
                "AuthenChain.capture_regulated_output requires valid regulatory metadata",
                code="INVALID_REGULATORY_METADATA",
                details={
                    "errors": validation["errors"],
                    "warnings": validation["warnings"],
                },
            )

        content = _serialize_regulated_output(output, serialize_output, "capture_regulated_output")
        metadata = _clean_dict(
            {
                "schema_version": schema_version,
                "issuer": issuer,
                "content_type": content_type,
                "created_at": created_at,
                "nonce": nonce,
                "trace_id": trace_id,
                "model": model,
                "user_ref": user_ref,
                "extra": dict(extra) if isinstance(extra, Mapping) else extra,
                "regulatory": validation["regulatory"],
            }
        )
        provenance = self.sign(
            content=content,
            content_encoding=content_encoding,
            metadata=metadata,
            generate_metadata_defaults=generate_metadata_defaults,
            idempotency_key=idempotency_key,
            request_id=request_id,
            correlation_id=correlation_id,
        )

        return {
            "output": output,
            "provenance": provenance,
            "regulatory": {
                "metadataValid": True,
                "regulatoryEvidenceStatus": "incomplete" if validation["warnings"] else "complete",
                "legalCompliance": "not_determined",
                "warnings": validation["warnings"],
            },
        }

    def verify_regulatory_evidence(
        self,
        *,
        content: Optional[str] = None,
        content_hash: Optional[str] = None,
        content_encoding: Optional[str] = None,
        content_evidence: Optional[Mapping[str, Any]] = None,
        provenance: Optional[Mapping[str, Any]] = None,
        evidence_pack: Optional[Any] = None,
        content_evidence_by_proof_index: Optional[Any] = None,
        verification_scope: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        scope = _resolve_regulatory_verification_scope(verification_scope, provenance, evidence_pack)
        _validate_regulatory_verification_inputs(scope, content, content_hash, provenance, evidence_pack)

        provenance_verification = None
        evidence_pack_verification = None

        if _should_verify_provenance(scope):
            provenance_verification = self.verify(
                content=content,
                content_hash=content_hash,
                content_encoding=content_encoding,
                content_evidence=content_evidence,
                provenance=provenance,
                idempotency_key=idempotency_key,
                request_id=request_id,
                correlation_id=correlation_id,
            )

        if _should_verify_evidence_pack(scope):
            evidence_pack_verification = self.verify_evidence_pack(
                evidence_pack=evidence_pack,
                content_evidence_by_proof_index=content_evidence_by_proof_index,
                idempotency_key=idempotency_key,
                request_id=request_id,
                correlation_id=correlation_id,
            )

        provenance_verified = None if provenance_verification is None else provenance_verification["verified"]
        evidence_pack_verified = None if evidence_pack_verification is None else (
            evidence_pack_verification.get("trustedStatus") == "trusted"
            and evidence_pack_verification.get("externallyTrustworthy") is True
        )
        regulatory_status = _resolve_regulatory_evidence_status(
            scope=scope,
            provenance_metadata=None if provenance is None else provenance.get("metadata"),
            provenance_verification=provenance_verification,
            evidence_pack_verification=evidence_pack_verification,
            provenance_verified=provenance_verified,
            evidence_pack_verified=evidence_pack_verified,
        )
        warnings = _unique_strings(
            _extract_string_array(evidence_pack_verification, "warnings")
            + [f"missing:{item}" for item in _extract_string_array(evidence_pack_verification, "missing")]
        )
        failures = _unique_strings(
            ([] if provenance_verified is not False else ["provenance_verification_failed"])
            + ([] if evidence_pack_verified is not False else ["evidence_pack_verification_failed"])
            + _extract_string_array(evidence_pack_verification, "failures")
        )
        reason_codes = _unique_strings(
            (provenance_verification.get("reasonCodes", []) if provenance_verification else [])
            + failures
        )

        response = {
            "schemaVersion": REGULATORY_VERIFICATION_SCHEMA_VERSION,
            "verificationScope": scope,
            "environment": "mock" if self.config.mock else "live",
            "provenanceVerified": provenance_verified,
            "evidencePackVerified": evidence_pack_verified,
            "regulatoryEvidenceStatus": regulatory_status,
            "legalCompliance": "not_determined",
            "reason": _resolve_regulatory_reason(provenance_verification, evidence_pack_verification, failures),
            "reasonCodes": reason_codes,
            "warnings": warnings if not self.config.mock else _unique_strings(warnings + [MOCK_WARNING]),
            "failures": failures,
            "customerResponsibilities": (
                [
                    "Mock mode is for tests, demos, local CI, examples, and harness simulations only.",
                    "Do not treat mock mode output as externally trusted regulatory evidence.",
                ]
                if self.config.mock
                else CUSTOMER_RESPONSIBILITIES
            ),
        }
        if provenance_verification and provenance_verification.get("traceId"):
            response["traceId"] = provenance_verification["traceId"]
        if provenance_verification is not None:
            response["provenanceVerification"] = provenance_verification
        if evidence_pack_verification is not None:
            response["evidencePackVerification"] = evidence_pack_verification
        if self.config.mock:
            response["mock"] = True
        return response

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: Optional[Dict[str, Any]] = None,
        query: Optional[Dict[str, Any]] = None,
        request_options: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        if self.config.mock:
            raise AuthenChainValidationError("mock mode request was not handled locally")

        if self._transport is not None:
            return self._transport(method, path, body, query)

        return self._http_request(method, path, body=body, query=query, request_options=request_options)

    def _http_request(
        self,
        method: str,
        path: str,
        *,
        body: Optional[Dict[str, Any]],
        query: Optional[Dict[str, Any]],
        request_options: Optional[Dict[str, str]],
    ) -> Dict[str, Any]:
        url = _build_url(self.config.base_url, path, query)
        payload = None if body is None else json.dumps(body).encode("utf-8")
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {self.config.api_key}",
        }
        if payload is not None:
            headers["content-type"] = "application/json"
        if request_options:
            headers.update(request_options)

        attempts = self.config.max_retries + 1
        last_error: Optional[Exception] = None
        for attempt in range(attempts):
            try:
                req = request.Request(url, data=payload, headers=headers, method=method)
                with request.urlopen(req, timeout=self.config.timeout) as response:
                    return _decode_response(response.read())
            except error.HTTPError as exc:
                decoded = _decode_error_body(exc)
                if attempt + 1 < attempts and exc.code in {429, 502, 503, 504}:
                    time.sleep(min(0.25 * (attempt + 1), 1.0))
                    continue
                details = _sanitize_for_diagnostics(decoded, sensitive_values=[self.config.api_key])
                raise AuthenChainApiError(
                    _redact_sensitive_text(
                        _error_message(decoded, f"AuthenChain request failed with status {exc.code}"),
                        [self.config.api_key],
                    ),
                    code=_error_code(decoded),
                    status=exc.code,
                    details=details,
                ) from exc
            except socket.timeout as exc:
                last_error = exc
                if attempt + 1 < attempts:
                    continue
                raise AuthenChainTimeoutError("AuthenChain request timed out") from exc
            except OSError as exc:
                last_error = exc
                if attempt + 1 < attempts:
                    continue
                raise AuthenChainNetworkError("AuthenChain network request failed") from exc

        raise AuthenChainNetworkError("AuthenChain network request failed", details=last_error)


def _normalize_optional_string(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _normalize_base_url(value: str) -> str:
    normalized = value.strip().rstrip("/")
    if not normalized:
        raise AuthenChainValidationError("base_url must be a non-empty string")
    return normalized


def _request_options(
    idempotency_key: Optional[str],
    request_id: Optional[str],
    correlation_id: Optional[str],
) -> Dict[str, str]:
    return _clean_dict(
        {
            "Idempotency-Key": idempotency_key,
            "X-Request-Id": request_id,
            "X-Correlation-Id": correlation_id,
        }
    )


def _clean_dict(value: Mapping[str, Any]) -> Dict[str, Any]:
    return {key: item for key, item in value.items() if item is not None}


def _sha256_hex_for_encoding(content: str, content_encoding: Optional[str]) -> str:
    # R7T-015: hash the content bytes for hash-only signing. Mirrors the Node SDK
    # which hashes Buffer.from(content, encoding).
    encoding = (content_encoding or "utf8").lower()
    if encoding == "base64":
        data = base64.b64decode(content)
    elif encoding == "hex":
        data = bytes.fromhex(content)
    else:
        data = content.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _prepare_content_evidence_for_wire(
    content_evidence: Optional[Mapping[str, Any]]
) -> Optional[Dict[str, Any]]:
    # R7T-015: captureMode guard parity with sdks/node content-evidence.ts. When a
    # side carries plaintext .content but no captureMode is set, fail closed with
    # CONTENT_EVIDENCE_MODE_REQUIRED. On 'hash_only', strip plaintext .content.
    if content_evidence is None:
        return None
    if not isinstance(content_evidence, Mapping):
        raise AuthenChainValidationError(
            "content_evidence must be a dictionary", code="INVALID_CONTENT_EVIDENCE"
        )

    def side_has_plaintext(side: Any) -> bool:
        return (
            isinstance(side, Mapping)
            and isinstance(side.get("content"), str)
            and len(side.get("content")) > 0
        )

    carries_plaintext = side_has_plaintext(content_evidence.get("input")) or side_has_plaintext(
        content_evidence.get("output")
    )
    capture_mode = content_evidence.get("captureMode")
    if carries_plaintext and capture_mode is None:
        raise AuthenChainValidationError(
            "contentEvidence carries plaintext .content but no captureMode was specified. "
            "Set contentEvidence.captureMode to one of: 'hash_only' (strip plaintext, ship "
            "only hashes), 'encrypted' (caller asserts .content is already ciphertext), "
            "'plaintext_acknowledged' (caller has explicitly opted in to sending plaintext "
            "evidence to the AuthenChain server).",
            code="CONTENT_EVIDENCE_MODE_REQUIRED",
        )

    if capture_mode == "hash_only":
        def strip(side: Any) -> Any:
            if not isinstance(side, Mapping):
                return side
            return {key: value for key, value in side.items() if key != "content"}

        result = dict(content_evidence)
        if "input" in result:
            result["input"] = strip(result.get("input"))
        if "output" in result:
            result["output"] = strip(result.get("output"))
        return result

    return dict(content_evidence)


def _as_mapping(value: Any, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise AuthenChainValidationError(f"{field} must be a dictionary")
    return value


def _optional_string(value: Any) -> Optional[str]:
    return value if isinstance(value, str) and value else None


def _normalize_optional_non_empty(value: Optional[str], field: str) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        raise AuthenChainValidationError(f"{field} must be a non-empty string")
    return normalized


def _normalize_required_non_empty(value: str, field: str) -> str:
    normalized = _normalize_optional_non_empty(value, field)
    if not normalized:
        raise AuthenChainValidationError(f"{field} must be a non-empty string")
    return normalized


def _normalize_optional_datetime(value: Optional[Any], field: str) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if isinstance(value, str) and value.strip():
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise AuthenChainValidationError(f"{field} must be a valid ISO timestamp") from exc
        return value
    raise AuthenChainValidationError(f"{field} must be a valid ISO timestamp")


def _build_url(base_url: str, path: str, query: Optional[Dict[str, Any]]) -> str:
    url = f"{base_url}/{path.lstrip('/')}"
    if query:
        url = f"{url}?{parse.urlencode(query)}"
    return url


def _decode_response(data: bytes) -> Dict[str, Any]:
    if not data:
        return {}
    decoded = json.loads(data.decode("utf-8"))
    if not isinstance(decoded, dict):
        raise AuthenChainValidationError("AuthenChain returned a non-object response")
    return decoded


def _decode_error_body(exc: error.HTTPError) -> Any:
    raw = exc.read()
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {"message": raw.decode("utf-8", errors="replace")}


def _error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, Mapping):
        value = payload.get("message") or payload.get("error")
        if isinstance(value, str):
            return value
    return fallback


def _error_code(payload: Any) -> Optional[str]:
    if isinstance(payload, Mapping) and isinstance(payload.get("code"), str):
        return payload["code"]
    return None


def _sanitize_for_diagnostics(value: Any, sensitive_values: Optional[list] = None) -> Any:
    return _redact_for_diagnostics(value, set(), None, [item for item in sensitive_values or [] if item])


def _redact_for_diagnostics(value: Any, seen: set, key: Optional[str], sensitive_values: list) -> Any:
    if key and _is_sensitive_key(key):
        return "[REDACTED]"
    if key and _is_payload_key(key):
        return "[REDACTED]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _redact_sensitive_text(value, sensitive_values) if key in {"message", "error", "code"} else "[REDACTED]"
    if isinstance(value, list):
        return [_redact_for_diagnostics(item, seen, key, sensitive_values) for item in value]
    if isinstance(value, Mapping):
        object_id = id(value)
        if object_id in seen:
            return "[circular]"
        seen.add(object_id)
        try:
            return {
                item_key: _redact_for_diagnostics(item_value, seen, str(item_key), sensitive_values)
                for item_key, item_value in value.items()
            }
        finally:
            seen.remove(object_id)
    return "[REDACTED]"


def _redact_sensitive_text(value: str, sensitive_values: list) -> str:
    redacted = value
    for sensitive in sensitive_values:
        if sensitive:
            redacted = redacted.replace(str(sensitive), "[REDACTED]")
    return redacted


def _is_sensitive_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(
        marker in normalized
        for marker in (
            "authorization",
            "cookie",
            "api_key",
            "apikey",
            "secret",
            "token",
            "password",
            "credential",
            "private_key",
            "encrypted_dek",
            "ciphertext",
        )
    ) or normalized == "dek" or normalized.endswith("_dek")


def _is_payload_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(marker in normalized for marker in ("content", "input", "output", "body", "payload", "raw"))


def _validate_capture_metadata(value: Mapping[str, Any]) -> None:
    version = value.get("schema_version")
    if version is not None and version not in ("1.0", "1.1"):
        raise AuthenChainValidationError("AuthenChain returned unknown metadata schema_version")
    if version != "1.1":
        return  # Preserve historical mapping responses without inventing assurance.
    assurance = value.get("assurance")
    if not isinstance(assurance, Mapping):
        raise AuthenChainValidationError("AuthenChain returned missing capture assurance")
    allowed = {"schemaVersion", "assuranceLevel", "captureMethod", "contentObserved", "limitations"}
    valid_pair = (assurance.get("assuranceLevel") == "A0" and assurance.get("captureMethod") == "attest_submitted_hash" and assurance.get("contentObserved") is False) or (assurance.get("assuranceLevel") == "A1" and assurance.get("captureMethod") == "observe_submitted_content" and assurance.get("contentObserved") is True)
    limitations = assurance.get("limitations")
    if set(assurance) != allowed or assurance.get("schemaVersion") != "authenchain.assurance.v1" or not valid_pair or not isinstance(limitations, list) or not 1 <= len(limitations) <= 10 or not all(isinstance(item, str) and 1 <= len(item) <= 1000 for item in limitations):
        raise AuthenChainValidationError("AuthenChain returned malformed capture assurance")


def _map_sign_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    _require_string(payload, "trace_id")
    _require_string(payload, "content_hash")
    _validate_capture_metadata(_as_mapping(payload.get("metadata"), "metadata"))
    _require_string(payload, "signature")
    _require_string(payload, "public_key_id")
    _require_string(payload, "kid")
    _require_string(payload, "algorithm")
    _require_string(payload, "signed_at")
    return {
        **payload,
        "traceId": payload["trace_id"],
        "contentHash": payload["content_hash"],
        "publicKeyId": payload["public_key_id"],
        "signedAt": payload["signed_at"],
        "rawResponse": payload,
    }


def _map_verify_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    _require_string(payload, "trace_id")
    _require_bool(payload, "verified")
    _require_string_or_none(payload, "reason")
    _require_string_or_none(payload, "content_hash")
    _require_bool(payload, "origin_verified")
    if payload.get("integrity") not in {"intact", "modified", "unknown"}:
        raise AuthenChainValidationError("AuthenChain returned invalid integrity")
    _require_bool(payload, "issuer_verified")
    if not isinstance(payload.get("reason_codes"), list):
        raise AuthenChainValidationError("AuthenChain returned invalid reason_codes")
    _require_string(payload, "verified_at")
    return {
        **payload,
        "verificationScope": "provenance",
        "externalTrustAvailable": False,
        "externalTrustWarning": "This verifies provenance integrity only. Use verify_evidence_pack(...) for external AuthenChain trust.",
        "traceId": payload["trace_id"],
        "contentHash": payload["content_hash"],
        "originVerified": payload["origin_verified"],
        "issuerVerified": payload["issuer_verified"],
        "reasonCodes": payload["reason_codes"],
        "verifiedAt": payload["verified_at"],
        "rawResponse": payload,
    }


def _require_evidence_pack_trust_fields(payload: Mapping[str, Any]) -> None:
    if payload.get("internalProofStatus") not in {"complete", "incomplete", "failed", "no_records"}:
        raise AuthenChainValidationError("Evidence Pack response contains invalid internalProofStatus")
    if payload.get("authenticityStatus") not in {
        "authenchain_issued",
        "missing_envelope",
        "invalid_envelope",
        "unknown_signing_key",
        "not_authenchain_issued",
    }:
        raise AuthenChainValidationError("Evidence Pack response contains invalid authenticityStatus")
    if payload.get("trustedStatus") not in {"trusted", "untrusted", "failed", "incomplete", "no_records"}:
        raise AuthenChainValidationError("Evidence Pack response contains invalid trustedStatus")
    _require_bool(payload, "externallyTrustworthy")
    conclusion = _as_mapping(payload.get("verificationConclusion"), "verificationConclusion")
    _require_evidence_pack_conclusion(conclusion)


def _require_evidence_pack_conclusion(payload: Mapping[str, Any]) -> None:
    if payload.get("internalProofStatus") not in {"complete", "incomplete", "failed", "no_records"}:
        raise AuthenChainValidationError("Evidence Pack conclusion contains invalid internalProofStatus")
    if payload.get("authenticityStatus") not in {
        "authenchain_issued",
        "missing_envelope",
        "invalid_envelope",
        "unknown_signing_key",
        "not_authenchain_issued",
    }:
        raise AuthenChainValidationError("Evidence Pack conclusion contains invalid authenticityStatus")
    if payload.get("trustedStatus") not in {"trusted", "untrusted", "failed", "incomplete", "no_records"}:
        raise AuthenChainValidationError("Evidence Pack conclusion contains invalid trustedStatus")
    _require_bool(payload, "externallyTrustworthy")
    _require_string(payload, "reason")


def _require_string(payload: Mapping[str, Any], field: str) -> None:
    if not isinstance(payload.get(field), str) or not payload.get(field):
        raise AuthenChainValidationError(f"AuthenChain returned invalid {field}")


def _require_string_or_none(payload: Mapping[str, Any], field: str) -> None:
    value = payload.get(field)
    if value is not None and not isinstance(value, str):
        raise AuthenChainValidationError(f"AuthenChain returned invalid {field}")


def _require_bool(payload: Mapping[str, Any], field: str) -> None:
    if not isinstance(payload.get(field), bool):
        raise AuthenChainValidationError(f"AuthenChain returned invalid {field}")


def _validate_regulatory_metadata(input_value: Any) -> Dict[str, Any]:
    errors = []
    warnings = []
    regulatory_input = _unwrap_regulatory_metadata_input(input_value, errors)
    if regulatory_input is None:
        return {"valid": False, "errors": errors, "warnings": warnings}

    for key in regulatory_input:
        if key not in REGULATORY_METADATA_KEYS:
            errors.append(_issue("error", "unknown_field", f"regulatory.{key}", f"regulatory.{key} is not allowed"))

    normalized: Dict[str, Any] = {}
    if regulatory_input.get("schema_version") != REGULATORY_METADATA_SCHEMA_VERSION:
        errors.append(_issue(
            "error",
            "invalid_schema_version",
            "regulatory.schema_version",
            f'regulatory.schema_version must be "{REGULATORY_METADATA_SCHEMA_VERSION}"',
        ))
    else:
        normalized["schema_version"] = REGULATORY_METADATA_SCHEMA_VERSION

    _required_boolean(regulatory_input, normalized, errors, "ai_generated")
    _normalize_enum(regulatory_input, normalized, errors, "jurisdiction", REGULATORY_METADATA_JURISDICTIONS)
    _normalize_regulatory_context(regulatory_input, normalized, errors)
    _normalize_enum(regulatory_input, normalized, errors, "content_type", REGULATORY_METADATA_CONTENT_TYPES)
    _required_string(regulatory_input, normalized, errors, "model_provider")
    _required_string(regulatory_input, normalized, errors, "model_name")
    _optional_string_field(regulatory_input, normalized, errors, "model_version")
    _required_string(regulatory_input, normalized, errors, "system_purpose")
    risk_context = _normalize_enum(regulatory_input, normalized, errors, "risk_context", REGULATORY_METADATA_RISK_CONTEXTS)
    human_reviewed = _required_boolean(regulatory_input, normalized, errors, "human_reviewed")
    _optional_string_field(regulatory_input, normalized, errors, "reviewer_role")
    _normalize_iso_timestamp_field(regulatory_input, normalized, errors, "review_timestamp")
    disclosure_required = _required_boolean(regulatory_input, normalized, errors, "disclosure_required")
    disclosure_applied = _required_boolean(regulatory_input, normalized, errors, "disclosure_applied")
    _normalize_optional_enum(regulatory_input, normalized, errors, "label_type", REGULATORY_METADATA_LABEL_TYPES)
    _required_string(regulatory_input, normalized, errors, "policy_version")
    _optional_mapping_field(regulatory_input, normalized, errors, "riskContext")
    _optional_string_field(regulatory_input, normalized, errors, "impactAssessmentId")
    _optional_string_field(regulatory_input, normalized, errors, "impactAssessmentHash")
    _optional_string_field(regulatory_input, normalized, errors, "impactAssessmentStatus")
    _normalize_iso_timestamp_field(regulatory_input, normalized, errors, "impactAssessmentApprovedAt")

    # R7B-HIGH-004 / R7B-HIGH-005: sensitive-data category, minor flags, lawful basis.
    # Optional fields, only normalized when present so legacy payloads are unchanged.
    sensitive_category = _normalize_optional_enum(
        regulatory_input, normalized, errors, "sensitive_data_category", REGULATORY_SENSITIVE_DATA_CATEGORIES
    ) or "none"
    sensitive_detail = _optional_string_field(
        regulatory_input, normalized, errors, "sensitive_data_category_detail"
    )
    if sensitive_category == "other_customer_declared" and not sensitive_detail:
        errors.append(_issue(
            "error",
            "required_sensitive_detail",
            "regulatory.sensitive_data_category_detail",
            'regulatory.sensitive_data_category_detail is required when regulatory.sensitive_data_category is "other_customer_declared"',
        ))
    if sensitive_category != "none":
        context = normalized.get("regulatory_context") or []
        has_art_11 = any(
            ("lgpd_art_11" in entry.lower() or "art_11" in entry.lower() or "sensitive_data_lgpd" in entry.lower())
            for entry in context
            if isinstance(entry, str)
        )
        if not has_art_11:
            warnings.append(_issue(
                "warning",
                "metadata_sensitive_category_lgpd_art_11_reference_recommended",
                "regulatory.regulatory_context",
                "regulatory.sensitive_data_category is set but regulatory_context has no LGPD Art. 11 reference",
            ))
    involves_minors = False
    if regulatory_input.get("involves_minors") is not None:
        if _required_boolean(regulatory_input, normalized, errors, "involves_minors") is True:
            involves_minors = True
    consent_basis = _normalize_optional_enum(
        regulatory_input, normalized, errors, "minors_consent_basis", REGULATORY_MINORS_CONSENT_BASES
    )
    if involves_minors is True and not consent_basis:
        errors.append(_issue(
            "error",
            "required_minors_consent_basis",
            "regulatory.minors_consent_basis",
            "regulatory.minors_consent_basis is required when regulatory.involves_minors is true",
        ))
    legal_basis = _normalize_optional_enum(
        regulatory_input, normalized, errors, "legal_basis", REGULATORY_LEGAL_BASES
    )
    legal_basis_reference = _optional_string_field(
        regulatory_input, normalized, errors, "legal_basis_reference"
    )
    if legal_basis is not None and not legal_basis_reference:
        errors.append(_issue(
            "error",
            "required_legal_basis_reference",
            "regulatory.legal_basis_reference",
            "regulatory.legal_basis_reference is required when regulatory.legal_basis is set",
        ))
    if legal_basis is None and regulatory_input.get("legal_basis") is None:
        warnings.append(_issue(
            "warning",
            "metadata_legal_basis_recommended",
            "regulatory.legal_basis",
            "regulatory.legal_basis is recommended so the lawful basis for processing is recorded",
        ))
    _optional_string_field(regulatory_input, normalized, errors, "data_subject_category")

    if human_reviewed is True:
        if not isinstance(regulatory_input.get("reviewer_role"), str) or not regulatory_input.get("reviewer_role", "").strip():
            errors.append(_issue(
                "error",
                "required_when_human_reviewed",
                "regulatory.reviewer_role",
                "regulatory.reviewer_role is required when regulatory.human_reviewed is true",
            ))
        if not isinstance(regulatory_input.get("review_timestamp"), str) or not regulatory_input.get("review_timestamp", "").strip():
            errors.append(_issue(
                "error",
                "required_when_human_reviewed",
                "regulatory.review_timestamp",
                "regulatory.review_timestamp is required when regulatory.human_reviewed is true",
            ))

    if (disclosure_required is True or disclosure_applied is True) and regulatory_input.get("label_type") is None:
        errors.append(_issue(
            "error",
            "required_when_disclosure_recorded",
            "regulatory.label_type",
            "regulatory.label_type is required when regulatory.disclosure_required or regulatory.disclosure_applied is true",
        ))

    if risk_context == "unknown":
        warnings.append(_issue(
            "warning",
            "unknown_risk_context",
            "regulatory.risk_context",
            "regulatory.risk_context is unknown; customers should classify risk through policy, backend workflow, or compliance review",
        ))

    if disclosure_required is True and disclosure_applied is False:
        warnings.append(_issue(
            "warning",
            "required_disclosure_not_applied",
            "regulatory.disclosure_applied",
            "regulatory.disclosure_required is true but regulatory.disclosure_applied is false",
        ))

    if errors:
        return {"valid": False, "errors": errors, "warnings": warnings}
    return {"valid": True, "regulatory": normalized, "errors": errors, "warnings": warnings}


def _unwrap_regulatory_metadata_input(input_value: Any, errors: list) -> Optional[Mapping[str, Any]]:
    if not _is_plain_object(input_value):
        errors.append(_issue("error", "invalid_type", "regulatory", "regulatory must be an object"))
        return None
    if "regulatory" in input_value:
        regulatory = input_value.get("regulatory")
        if not _is_plain_object(regulatory):
            errors.append(_issue("error", "invalid_type", "regulatory", "regulatory must be an object"))
            return None
        return regulatory
    return input_value


def _required_string(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
) -> Optional[str]:
    value = input_value.get(key)
    if not isinstance(value, str) or not value.strip():
        errors.append(_issue("error", "invalid_string", f"regulatory.{key}", f"regulatory.{key} must be a non-empty string"))
        return None
    normalized[key] = value.strip()
    return normalized[key]


def _optional_string_field(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
) -> Optional[str]:
    value = input_value.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        errors.append(_issue("error", "invalid_string", f"regulatory.{key}", f"regulatory.{key} must be a non-empty string"))
        return None
    normalized[key] = value.strip()
    return normalized[key]


def _optional_mapping_field(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
) -> Optional[Dict[str, Any]]:
    value = input_value.get(key)
    if value is None:
        return None
    if not _is_plain_object(value):
        errors.append(_issue("error", "invalid_object", f"regulatory.{key}", f"regulatory.{key} must be an object"))
        return None
    normalized[key] = dict(value)
    return normalized[key]


def _required_boolean(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
) -> Optional[bool]:
    value = input_value.get(key)
    if not isinstance(value, bool):
        errors.append(_issue("error", "invalid_boolean", f"regulatory.{key}", f"regulatory.{key} must be a boolean"))
        return None
    normalized[key] = value
    return value


def _normalize_enum(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
    values: tuple,
) -> Optional[str]:
    value = input_value.get(key)
    label = "|".join(values)
    if not isinstance(value, str) or value.strip() not in values:
        errors.append(_issue("error", "invalid_enum", f"regulatory.{key}", f"regulatory.{key} must be {label}"))
        return None
    normalized[key] = value.strip()
    return normalized[key]


def _normalize_optional_enum(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
    values: tuple,
) -> Optional[str]:
    value = input_value.get(key)
    if value is None:
        return None
    label = "|".join(values)
    if not isinstance(value, str) or value.strip() not in values:
        errors.append(_issue("error", "invalid_enum", f"regulatory.{key}", f"regulatory.{key} must be {label}"))
        return None
    normalized[key] = value.strip()
    return normalized[key]


def _normalize_regulatory_context(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
) -> None:
    value = input_value.get("regulatory_context")
    if not isinstance(value, list) or not value:
        errors.append(_issue(
            "error",
            "invalid_string_array",
            "regulatory.regulatory_context",
            "regulatory.regulatory_context must be a non-empty string array",
        ))
        return
    items = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            errors.append(_issue(
                "error",
                "invalid_string_array",
                "regulatory.regulatory_context",
                "regulatory.regulatory_context must be a non-empty string array",
            ))
            return
        items.append(item.strip())
    normalized["regulatory_context"] = items


def _normalize_iso_timestamp_field(
    input_value: Mapping[str, Any],
    normalized: Dict[str, Any],
    errors: list,
    key: str,
) -> Optional[str]:
    value = input_value.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        errors.append(_issue("error", "invalid_timestamp", f"regulatory.{key}", f"regulatory.{key} must be a valid ISO timestamp"))
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        errors.append(_issue("error", "invalid_timestamp", f"regulatory.{key}", f"regulatory.{key} must be a valid ISO timestamp"))
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    normalized[key] = parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return normalized[key]


def _issue(severity: str, code: str, path: str, message: str) -> Dict[str, str]:
    return {"severity": severity, "code": code, "path": path, "message": message}


def _serialize_regulated_output(output: Any, serializer: Optional[Callable[[Any], str]], context: str) -> str:
    if serializer is not None:
        serialized = serializer(output)
        if not isinstance(serialized, str):
            raise AuthenChainValidationError(f"{context} serialize_output must return a string", code="INVALID_SERIALIZER_OUTPUT")
        return serialized
    if isinstance(output, str):
        return output
    try:
        return json.dumps(output, sort_keys=True, separators=(",", ":"))
    except TypeError as exc:
        raise AuthenChainValidationError(
            f"{context} could not serialize the regulated output",
            code="INVALID_REGULATED_OUTPUT",
            details={"outputType": type(output).__name__},
        ) from exc


def _resolve_regulatory_verification_scope(
    requested_scope: Optional[str],
    provenance: Optional[Mapping[str, Any]],
    evidence_pack: Optional[Any],
) -> str:
    if requested_scope is not None:
        if requested_scope not in REGULATORY_VERIFICATION_SCOPES:
            raise AuthenChainValidationError(
                "verify_regulatory_evidence verification_scope must be provenance, evidence_pack, or combined",
                code="INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT",
            )
        return requested_scope
    if provenance is not None and evidence_pack is not None:
        return "combined"
    if provenance is not None:
        return "provenance"
    if evidence_pack is not None:
        return "evidence_pack"
    raise AuthenChainValidationError(
        "AuthenChain.verify_regulatory_evidence requires provenance or evidence_pack",
        code="INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT",
    )


def _validate_regulatory_verification_inputs(
    scope: str,
    content: Optional[str],
    content_hash: Optional[str],
    provenance: Optional[Mapping[str, Any]],
    evidence_pack: Optional[Any],
) -> None:
    if _should_verify_provenance(scope):
        if provenance is None:
            raise AuthenChainValidationError(
                "AuthenChain.verify_regulatory_evidence requires provenance for provenance verification",
                code="INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT",
            )
        if not content and not content_hash:
            raise AuthenChainValidationError(
                "AuthenChain.verify_regulatory_evidence requires content or content_hash for provenance verification",
                code="INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT",
                details={"hasContent": bool(content), "hasContentHash": bool(content_hash)},
            )
    if _should_verify_evidence_pack(scope) and evidence_pack is None:
        raise AuthenChainValidationError(
            "AuthenChain.verify_regulatory_evidence requires evidence_pack for Evidence Pack verification",
            code="INVALID_VERIFY_REGULATORY_EVIDENCE_INPUT",
        )


def _should_verify_provenance(scope: str) -> bool:
    return scope in {"provenance", "combined"}


def _should_verify_evidence_pack(scope: str) -> bool:
    return scope in {"evidence_pack", "combined"}


def _resolve_regulatory_evidence_status(
    *,
    scope: str,
    provenance_metadata: Optional[Any],
    provenance_verification: Optional[Mapping[str, Any]],
    evidence_pack_verification: Optional[Mapping[str, Any]],
    provenance_verified: Optional[bool],
    evidence_pack_verified: Optional[bool],
) -> str:
    if provenance_verification is not None and provenance_verified is False:
        return "invalid"
    if evidence_pack_verification is not None:
        evidence_pack_status = _extract_evidence_pack_regulatory_status(evidence_pack_verification)
        if evidence_pack_verified is False and evidence_pack_status == "not_applicable":
            return "invalid"
        if evidence_pack_status:
            return evidence_pack_status
    if provenance_verification is not None:
        return _derive_provenance_regulatory_status(provenance_metadata)
    return "not_applicable"


def _derive_provenance_regulatory_status(provenance_metadata: Optional[Any]) -> str:
    metadata = provenance_metadata if _is_plain_object(provenance_metadata) else None
    regulatory = None if metadata is None else metadata.get("regulatory")
    if regulatory is None:
        return "not_applicable"
    validation = _validate_regulatory_metadata(regulatory)
    if not validation["valid"]:
        return "invalid"
    return "incomplete" if validation["warnings"] else "complete"


def _extract_evidence_pack_regulatory_status(evidence_pack_verification: Mapping[str, Any]) -> Optional[str]:
    conclusion = evidence_pack_verification.get("verificationConclusion")
    if _is_plain_object(conclusion):
        status = _status_value(conclusion.get("regulatoryEvidenceStatus"))
        if status:
            return status
    summary = evidence_pack_verification.get("regulatoryEvidenceSummary")
    if _is_plain_object(summary):
        status = _status_value(summary.get("status"))
        if status:
            return status
    return _status_value(evidence_pack_verification.get("regulatoryEvidenceStatus"))


def _status_value(value: Any) -> Optional[str]:
    return value if value in REGULATORY_EVIDENCE_STATUSES else None


def _resolve_regulatory_reason(
    provenance_verification: Optional[Mapping[str, Any]],
    evidence_pack_verification: Optional[Mapping[str, Any]],
    failures: list,
) -> Optional[str]:
    if failures:
        return "; ".join(failures)
    if provenance_verification and provenance_verification.get("reason"):
        return provenance_verification["reason"]
    conclusion = None if evidence_pack_verification is None else evidence_pack_verification.get("verificationConclusion")
    if _is_plain_object(conclusion) and isinstance(conclusion.get("reason"), str):
        return conclusion["reason"]
    return None


def _extract_string_array(value: Optional[Mapping[str, Any]], key: str) -> list:
    if value is None:
        return []
    field = value.get(key)
    return [item for item in field if isinstance(item, str)] if isinstance(field, list) else []


def _unique_strings(values: list) -> list:
    unique = []
    for value in values:
        if value not in unique:
            unique.append(value)
    return unique


def _mock_sign(
    *,
    content: Optional[str],
    content_hash: Optional[str],
    metadata: Mapping[str, Any],
    content_encoding: Optional[str],
) -> Dict[str, Any]:
    resolved_hash = _resolve_mock_content_hash(content=content, content_hash=content_hash, content_encoding=content_encoding)
    normalized_metadata = _normalize_mock_metadata(metadata, resolved_hash)
    signature = _mock_signature(resolved_hash, normalized_metadata)
    raw_response = {
        "trace_id": normalized_metadata["trace_id"],
        "content_hash": resolved_hash,
        "metadata": normalized_metadata,
        "signature": signature,
        "public_key_id": MOCK_KEY_ID,
        "kid": MOCK_KEY_ID,
        "algorithm": MOCK_ALGORITHM,
        "signed_at": MOCK_SIGNED_AT,
        "disclaimer": MOCK_WARNING,
        "environment": "mock",
        "mock": True,
    }
    return _map_sign_response(raw_response)


def _mock_verify(
    *,
    content: Optional[str],
    content_hash: Optional[str],
    metadata: Mapping[str, Any],
    signature: str,
    public_key_id: str,
    content_encoding: Optional[str],
) -> Dict[str, Any]:
    resolved_hash = _resolve_mock_content_hash(content=content, content_hash=content_hash, content_encoding=content_encoding)
    normalized_metadata = _normalize_mock_metadata(metadata, resolved_hash)
    expected = _mock_signature(resolved_hash, normalized_metadata)
    verified = signature == expected and public_key_id == MOCK_KEY_ID
    raw_response = {
        "trace_id": normalized_metadata["trace_id"],
        "verified": verified,
        "reason": None if verified else "Mock signature verification failed.",
        "content_hash": resolved_hash,
        "origin_verified": verified,
        "integrity": "intact" if verified else "modified",
        "issuer_verified": verified,
        "reason_codes": [] if verified else ["mock_signature_mismatch"],
        "verified_at": MOCK_SIGNED_AT,
        "disclaimer": MOCK_WARNING,
        "environment": "mock",
        "mock": True,
    }
    return _map_verify_response(raw_response)


def _mock_export_evidence_pack(*, trace_id: Optional[str], from_time: Optional[Any], to: Optional[Any]) -> Dict[str, Any]:
    trace_seed = f"{from_time or ''}:{to or ''}"
    resolved_trace_id = trace_id or f"mock_trace_{_digest(trace_seed)[:16]}"
    response = _mock_evidence_pack_response(
        trace_id=resolved_trace_id,
        source="export",
        status="incomplete",
        authenticity_status="not_authenchain_issued",
        trusted_status="incomplete",
        reason=MOCK_WARNING,
    )
    return {**response, "rawResponse": response}


def _mock_verify_evidence_pack(evidence_pack: Any) -> Dict[str, Any]:
    pack = evidence_pack if _is_plain_object(evidence_pack) else {}
    envelope = pack.get("evidenceEnvelope") if _is_plain_object(pack) else None
    tampered = pack.get("mockTampered") is True or (_is_plain_object(envelope) and envelope.get("tampered") is True)
    response = _mock_evidence_pack_response(
        trace_id=pack.get("traceId") if isinstance(pack.get("traceId"), str) else "mock_trace_evidence_pack",
        source="verify",
        status="failed" if tampered else "incomplete",
        authenticity_status="invalid_envelope" if tampered else "not_authenchain_issued",
        trusted_status="failed" if tampered else "incomplete",
        reason="Mock Evidence Pack envelope is invalid." if tampered else MOCK_WARNING,
        failures=["invalid_mock_evidence_pack_envelope"] if tampered else [],
        warnings=[] if tampered else [MOCK_WARNING],
    )
    return {**response, "rawResponse": response}


def _normalize_mock_metadata(input_value: Mapping[str, Any], content_hash: str) -> Dict[str, Any]:
    if not _is_plain_object(input_value) or not isinstance(input_value.get("issuer"), str) or not input_value.get("issuer", "").strip():
        raise AuthenChainValidationError("metadata.issuer must be a non-empty string", code="INVALID_METADATA")
    trace_id = input_value.get("trace_id")
    if not isinstance(trace_id, str) or not trace_id.strip():
        trace_seed = f"{input_value.get('issuer')}:{content_hash}"
        trace_id = f"mock_trace_{_digest(trace_seed)[:16]}"
    normalized = {
        "schema_version": input_value.get("schema_version") or "1.0",
        "issuer": input_value["issuer"].strip(),
        "content_type": input_value.get("content_type") or "text",
        "created_at": input_value.get("created_at") or MOCK_SIGNED_AT,
        "nonce": input_value.get("nonce") or _digest(f"nonce:{trace_id}")[:32],
        "trace_id": trace_id.strip() if isinstance(trace_id, str) else trace_id,
    }
    for key in ("model", "user_ref", "extra", "regulatory"):
        if input_value.get(key) is not None:
            normalized[key] = input_value[key]
    return normalized


def _resolve_mock_content_hash(
    *,
    content: Optional[str],
    content_hash: Optional[str],
    content_encoding: Optional[str],
) -> str:
    if content_hash:
        return content_hash
    if content is None:
        raise AuthenChainValidationError("AuthenChain mock mode requires content or content_hash", code="INVALID_MOCK_INPUT")
    if content_encoding == "base64":
        payload = base64.b64decode(content)
    else:
        payload = content.encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _mock_signature(content_hash: str, metadata: Mapping[str, Any]) -> str:
    return f"mock_sig_{_digest(f'{content_hash}:{_stable_json(metadata)}')[:48]}"


def _mock_evidence_pack_response(
    *,
    trace_id: str,
    source: str,
    status: str,
    authenticity_status: str,
    trusted_status: str,
    reason: str,
    warnings: Optional[list] = None,
    failures: Optional[list] = None,
) -> Dict[str, Any]:
    warnings = [MOCK_WARNING] if warnings is None else warnings
    failures = [] if failures is None else failures
    regulatory_status = "invalid" if failures else "not_applicable"
    return {
        "status": trusted_status,
        "internalProofStatus": status,
        "authenticityStatus": authenticity_status,
        "trustedStatus": trusted_status,
        "externallyTrustworthy": False,
        "verificationConclusion": {
            "internalProofStatus": status,
            "authenticityStatus": authenticity_status,
            "trustedStatus": trusted_status,
            "externallyTrustworthy": False,
            "regulatoryEvidenceStatus": regulatory_status,
            "reason": reason,
        },
        "regulatoryEvidenceSummary": {
            "status": regulatory_status,
            "warnings": warnings,
            "failures": failures,
        },
        "proofs": [
            {
                "proofId": f"mock_proof_{_digest(trace_id)[:12]}",
                "traceId": trace_id,
                "environment": "mock",
                "mock": True,
            }
        ],
        "evidenceEnvelope": {
            "signingKeyId": MOCK_KEY_ID,
            "environment": "mock",
            "mock": True,
        },
        "environment": "mock",
        "mock": True,
        "mockSource": source,
        "warnings": warnings,
        "failures": failures,
    }


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, Mapping)
