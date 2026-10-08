from __future__ import annotations

import json
from datetime import datetime, timezone

from authenchain import AuthenChain


def regulatory_metadata(policy_version):
    return {
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "EU",
        "regulatory_context": ["eu_ai_act_high_risk_support", "medical_ai_traceability"],
        "content_type": "text",
        "model_provider": "internal",
        "model_name": "clinical-summary-assistant",
        "model_version": "2026-05-01",
        "system_purpose": "clinical_summary_drafting",
        "risk_context": "high",
        "human_reviewed": True,
        "reviewer_role": "licensed_clinician",
        "review_timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "disclosure_required": True,
        "disclosure_applied": True,
        "label_type": "human_visible",
        "policy_version": policy_version,
        # Sprint 3B-3: lawful basis so the metadata_legal_basis_recommended warning
        # does not fire and regulatoryEvidenceStatus stays complete.
        "legal_basis": "legitimate_interest",
        "legal_basis_reference": "lia-doc-ref",
    }


def main():
    client = AuthenChain(mock=True)
    sample_input = {
        "encounterId": "synthetic-encounter-001",
        "workflow": "post_visit_summary_draft",
        "policyVersion": "clinical-ai-review-policy-v1",
    }
    output = (
        "Synthetic clinical summary draft: patient reported improved sleep and mild residual cough. "
        "Clinician review is required before this text is used in a care record or patient communication."
    )

    captured = client.capture_regulated_output(
        output=output,
        issuer="clinical-summary-service",
        content_type="text",
        model="clinical-summary-assistant",
        user_ref=sample_input["encounterId"],
        regulatory=regulatory_metadata(sample_input["policyVersion"]),
        extra={"useCase": "medical_ai_traceability", "sampleInput": sample_input, "source": "python-sdk-example"},
        generate_metadata_defaults=True,
    )
    verification = client.verify_regulatory_evidence(content=output, provenance=captured["provenance"])
    tampered = client.verify_regulatory_evidence(
        content=f"{output} Tampered diagnosis: urgent condition confirmed.",
        provenance=captured["provenance"],
    )

    return {
        "useCase": "medical_ai_traceability",
        "traceId": captured["provenance"]["traceId"],
        "regulatoryStatus": verification["regulatoryEvidenceStatus"],
        "legalCompliance": verification["legalCompliance"],
        "verified": verification["provenanceVerified"],
        "tamperedVerified": tampered["provenanceVerified"],
        "tamperFailures": tampered["failures"],
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
