from __future__ import annotations

import json

from authenchain import AuthenChain


def regulatory_metadata():
    return {
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "GLOBAL",
        "regulatory_context": ["tamper_verification_failure"],
        "content_type": "text",
        "model_provider": "internal",
        "model_name": "generic-output-assistant",
        "system_purpose": "regulated_output_integrity_test",
        "risk_context": "limited",
        "human_reviewed": False,
        "disclosure_required": True,
        "disclosure_applied": True,
        "label_type": "human_visible",
        "policy_version": "integrity-test-policy-v1",
    }


def main():
    client = AuthenChain(mock=True)
    output = "Synthetic regulated output captured for integrity verification."
    tampered_output = f"{output} Tampered addition: unsupported claim."

    captured = client.capture_regulated_output(
        output=output,
        issuer="integrity-test-service",
        content_type="text",
        regulatory=regulatory_metadata(),
        generate_metadata_defaults=True,
    )
    original = client.verify_regulatory_evidence(content=output, provenance=captured["provenance"])
    tampered = client.verify_regulatory_evidence(content=tampered_output, provenance=captured["provenance"])

    return {
        "useCase": "tamper_verification_failure",
        "traceId": captured["provenance"]["traceId"],
        "originalVerified": original["provenanceVerified"],
        "tamperedVerified": tampered["provenanceVerified"],
        "tamperedStatus": tampered["regulatoryEvidenceStatus"],
        "legalCompliance": tampered["legalCompliance"],
        "tamperFailures": tampered["failures"],
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
