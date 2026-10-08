from __future__ import annotations

import json
from datetime import datetime, timezone

from authenchain import AuthenChain


def regulatory_metadata(policy_version):
    return {
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "EU",
        "regulatory_context": ["eu_ai_act_high_risk_support", "credit_decision_audit"],
        "content_type": "text",
        "model_provider": "internal",
        "model_name": "credit-decision-assistant",
        "model_version": "2026-05-01",
        "system_purpose": "credit_decision_support",
        "risk_context": "high",
        "human_reviewed": True,
        "reviewer_role": "credit_risk_reviewer",
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
        "applicationId": "synthetic-credit-application-001",
        "requestedAmountUsd": 12500,
        "syntheticApplicantSegment": "thin_file",
        "policyVersion": "credit-risk-policy-v1",
    }
    output = (
        "Synthetic credit review: approve for manual underwriting follow-up. "
        "Primary reasons: stable repayment indicators and incomplete income documentation. "
        "This is decision-support evidence and not a final legal or credit decision."
    )

    captured = client.capture_regulated_output(
        output=output,
        issuer="credit-decision-service",
        content_type="text",
        model="credit-decision-assistant",
        user_ref=sample_input["applicationId"],
        regulatory=regulatory_metadata(sample_input["policyVersion"]),
        extra={"useCase": "credit_decision_audit", "sampleInput": sample_input, "source": "python-sdk-example"},
        generate_metadata_defaults=True,
    )
    verification = client.verify_regulatory_evidence(content=output, provenance=captured["provenance"])
    tampered = client.verify_regulatory_evidence(
        content=f"{output} Tampered final decision: automatically approved.",
        provenance=captured["provenance"],
    )

    return {
        "useCase": "credit_decision_audit",
        "traceId": captured["provenance"]["traceId"],
        "regulatoryStatus": verification["regulatoryEvidenceStatus"],
        "legalCompliance": verification["legalCompliance"],
        "verified": verification["provenanceVerified"],
        "tamperedVerified": tampered["provenanceVerified"],
        "tamperFailures": tampered["failures"],
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
