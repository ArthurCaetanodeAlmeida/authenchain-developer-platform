from __future__ import annotations

import json

from authenchain import AuthenChain


def regulatory_metadata():
    return {
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "EU",
        "regulatory_context": ["evidence_pack_export_verify"],
        "content_type": "text",
        "model_provider": "internal",
        "model_name": "evidence-pack-demo-assistant",
        "system_purpose": "evidence_pack_demo",
        "risk_context": "limited",
        "human_reviewed": False,
        "disclosure_required": True,
        "disclosure_applied": True,
        "label_type": "human_visible",
        "policy_version": "evidence-pack-demo-policy-v1",
    }


def main():
    client = AuthenChain(mock=True)
    output = "Synthetic regulated output used to demonstrate Evidence Pack export and verification."

    captured = client.capture_regulated_output(
        output=output,
        issuer="evidence-pack-demo-service",
        content_type="text",
        regulatory=regulatory_metadata(),
        generate_metadata_defaults=True,
    )
    pack = client.export_evidence_pack(trace_id=captured["provenance"]["traceId"])
    verified_pack = client.verify_evidence_pack(evidence_pack=pack)
    regulatory_verification = client.verify_regulatory_evidence(
        content=output,
        provenance=captured["provenance"],
        evidence_pack=pack,
        verification_scope="combined",
    )

    return {
        "useCase": "evidence_pack_export_verify",
        "traceId": captured["provenance"]["traceId"],
        "packTrustedStatus": pack["trustedStatus"],
        "packExternallyTrustworthy": pack["externallyTrustworthy"],
        "verifiedPackStatus": verified_pack["trustedStatus"],
        "regulatoryStatus": regulatory_verification["regulatoryEvidenceStatus"],
        "legalCompliance": regulatory_verification["legalCompliance"],
        "environment": regulatory_verification["environment"],
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
