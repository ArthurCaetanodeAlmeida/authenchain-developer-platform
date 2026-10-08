from __future__ import annotations

import json

from authenchain import AuthenChain


def regulatory_metadata():
    return {
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "EU",
        "regulatory_context": ["eu_ai_act_article_50", "regulated_text_output"],
        "content_type": "text",
        "model_provider": "internal",
        "model_name": "support-response-assistant",
        "model_version": "2026-05-01",
        "system_purpose": "customer_support_response",
        "risk_context": "limited",
        "human_reviewed": False,
        "disclosure_required": True,
        "disclosure_applied": True,
        "label_type": "human_visible",
        "policy_version": "ai-disclosure-policy-v1",
        # Sprint 3B-3: lawful basis so the metadata_legal_basis_recommended warning
        # does not fire and regulatoryEvidenceStatus stays complete.
        "legal_basis": "legitimate_interest",
        "legal_basis_reference": "lia-doc-ref",
    }


def main():
    client = AuthenChain(mock=True)
    output = "Synthetic AI-generated support response with a visible AI disclosure."

    captured = client.capture_regulated_output(
        output=output,
        issuer="support-response-service",
        content_type="text",
        model="support-response-assistant",
        user_ref="synthetic-ticket-001",
        regulatory=regulatory_metadata(),
        extra={"useCase": "regulated_text_output", "source": "python-sdk-example"},
        generate_metadata_defaults=True,
    )
    verification = client.verify_regulatory_evidence(
        content=output,
        provenance=captured["provenance"],
    )

    return {
        "useCase": "regulated_text_output",
        "traceId": captured["provenance"]["traceId"],
        "regulatoryStatus": verification["regulatoryEvidenceStatus"],
        "legalCompliance": verification["legalCompliance"],
        "verified": verification["provenanceVerified"],
        "environment": verification["environment"],
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
