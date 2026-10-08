import os
import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from authenchain import (
    AuthenChain,
    AuthenChainApiError,
    AuthenChainConfig,
    AuthenChainValidationError,
    __version__,
)


class AuthenChainClientSetupTest(unittest.TestCase):
    def test_import_and_version(self) -> None:
        self.assertEqual(__version__, "0.3.0")
        self.assertTrue(callable(AuthenChain))

    def test_default_base_url_is_hosted_api(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            client = AuthenChain(api_key="ac_test_123")
        self.assertEqual(client.config.base_url, "https://api.authenchain.com")

    def test_client_config_with_explicit_values(self) -> None:
        client = AuthenChain(
            api_key="ac_test_123",
            base_url="http://localhost:3000/",
            timeout=5.0,
        )

        self.assertIsInstance(client.config, AuthenChainConfig)
        self.assertEqual(client.config.api_key, "ac_test_123")
        self.assertEqual(client.config.base_url, "http://localhost:3000")
        self.assertEqual(client.config.timeout, 5.0)
        self.assertFalse(client.config.mock)
        self.assertFalse(client.is_mock)

    def test_client_reads_environment_config(self) -> None:
        with patch.dict(
            os.environ,
            {
                "AUTHENCHAIN_API_KEY": "env_key",
                "AUTHENCHAIN_BASE_URL": "https://api.example.test/",
            },
            clear=True,
        ):
            client = AuthenChain()

        self.assertEqual(client.config.api_key, "env_key")
        self.assertEqual(client.config.base_url, "https://api.example.test")
        self.assertFalse(client.config.mock)

    def test_mock_mode_allows_missing_api_key(self) -> None:
        client = AuthenChain(mock=True)

        self.assertIsNone(client.config.api_key)
        self.assertTrue(client.config.mock)
        self.assertTrue(client.is_mock)

    def test_mock_mode_can_use_environment_flag(self) -> None:
        with patch.dict(os.environ, {"AUTHENCHAIN_MOCK_MODE": "true"}, clear=True):
            client = AuthenChain()

        self.assertIsNone(client.config.api_key)
        self.assertTrue(client.config.mock)

    def test_live_mode_requires_api_key(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(AuthenChainValidationError) as error:
                AuthenChain()

        self.assertIn("api_key", str(error.exception))

    def test_timeout_must_be_positive(self) -> None:
        with self.assertRaises(AuthenChainValidationError):
            AuthenChain(api_key="ac_test_123", timeout=0)

    def test_config_repr_redacts_api_key(self) -> None:
        client = AuthenChain(api_key="ac_secret_python", base_url="http://localhost:3000")

        self.assertNotIn("ac_secret_python", repr(client.config))
        self.assertIn("base_url='http://localhost:3000'", repr(client.config))


class AuthenChainCoreMethodsTest(unittest.TestCase):
    def test_versioned_assurance_roundtrip_and_invalid_contracts(self):
        import copy
        assurance = {"schemaVersion": "authenchain.assurance.v1", "assuranceLevel": "A0", "captureMethod": "attest_submitted_hash", "contentObserved": False, "limitations": ["Original content not observed"]}
        fixture = sign_response()
        fixture["metadata"] = {**fixture["metadata"], "schema_version": "1.1", "assurance": assurance}
        client = AuthenChain(api_key="synthetic-python-assurance", transport=lambda *args: copy.deepcopy(fixture))
        response = client.sign(content_hash="a" * 64, metadata={"issuer": "synthetic"})
        self.assertEqual(response["metadata"]["assurance"], assurance)
        self.assertEqual(response["rawResponse"]["metadata"]["assurance"], assurance)
        for invalid in [None, {**assurance, "assuranceLevel": "A4"}, {**assurance, "contentObserved": True}, {**assurance, "limitations": []}, {**assurance, "unexpected": True}]:
            with self.subTest(invalid=invalid):
                fixture["metadata"]["assurance"] = invalid
                with self.assertRaises(AuthenChainValidationError):
                    client.sign(content_hash="a" * 64, metadata={"issuer": "synthetic"})
        fixture["metadata"] = {**sign_response()["metadata"], "schema_version": "1.0"}
        self.assertNotIn("assurance", client.sign(content_hash="a" * 64, metadata={"issuer": "synthetic"})["metadata"])
        fixture["metadata"]["schema_version"] = "99"
        with self.assertRaises(AuthenChainValidationError):
            client.sign(content_hash="a" * 64, metadata={"issuer": "synthetic"})

    def test_sign_posts_wire_payload_and_maps_response(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return sign_response()

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        signed = client.sign(
            content="hello world",
            metadata={"issuer": "python-test", "content_type": "text"},
        )

        self.assertEqual(calls, [
            (
                "POST",
                "/api/provenance/sign",
                {
                    "content": "hello world",
                    "metadata": {"issuer": "python-test", "content_type": "text"},
                },
                None,
            )
        ])
        self.assertEqual(signed["traceId"], "trace_python")
        self.assertEqual(signed["contentHash"], "a" * 64)
        self.assertEqual(signed["publicKeyId"], "kid_python")
        self.assertEqual(signed["signedAt"], "2026-03-06T12:00:01.000Z")
        self.assertEqual(signed["rawResponse"]["trace_id"], "trace_python")

    def test_verify_accepts_provenance_and_maps_response(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return verify_response(True)

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        verification = client.verify(
            content="hello world",
            provenance={
                "metadata": sign_response()["metadata"],
                "signature": "sig_python",
                "publicKeyId": "kid_python",
            },
        )

        self.assertEqual(calls[0][0], "POST")
        self.assertEqual(calls[0][1], "/api/provenance/verify")
        self.assertEqual(calls[0][2]["public_key_id"], "kid_python")
        self.assertTrue(verification["verified"])
        self.assertEqual(verification["verificationScope"], "provenance")
        self.assertFalse(verification["externalTrustAvailable"])
        self.assertEqual(verification["traceId"], "trace_verify")
        self.assertEqual(verification["reasonCodes"], [])

    def test_verify_accepts_explicit_fields(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return verify_response(False)

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        verification = client.verify(
            content_hash="b" * 64,
            metadata=sign_response()["metadata"],
            signature="sig_python",
            public_key_id="kid_python",
        )

        self.assertEqual(calls[0][2]["content_hash"], "b" * 64)
        self.assertFalse(verification["verified"])
        self.assertEqual(verification["integrity"], "modified")

    def test_export_evidence_pack_gets_with_filters(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return evidence_pack_response()

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        pack = client.export_evidence_pack(trace_id="trace_python", limit=10)

        self.assertEqual(calls, [
            (
                "GET",
                "/api/provenance/evidence-pack",
                None,
                {"traceId": "trace_python", "limit": 10},
            )
        ])
        self.assertEqual(pack["trustedStatus"], "trusted")
        self.assertEqual(pack["rawResponse"]["trustedStatus"], "trusted")

    def test_verify_evidence_pack_posts_public_verifier_payload(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return evidence_pack_response()

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        verified = client.verify_evidence_pack(
            evidence_pack={"proofs": [], "evidenceEnvelope": {"signingKeyId": "evk"}},
            content_evidence_by_proof_index={"0": {"output": {"content_hash": "a" * 64}}},
        )

        self.assertEqual(calls[0][0], "POST")
        self.assertEqual(calls[0][1], "/api/public/evidence/verify")
        self.assertEqual(calls[0][2]["evidencePack"]["proofs"], [])
        self.assertEqual(calls[0][2]["contentEvidenceByProofIndex"]["0"]["output"]["content_hash"], "a" * 64)
        self.assertEqual(verified["authenticityStatus"], "authenchain_issued")

    def test_core_methods_validate_required_input(self) -> None:
        client = AuthenChain(api_key="ac_test_123", transport=lambda *_args: {})

        with self.assertRaises(AuthenChainValidationError):
            client.sign(metadata={"issuer": "python-test"})
        with self.assertRaises(AuthenChainValidationError):
            client.verify(content="hello")
        with self.assertRaises(AuthenChainValidationError):
            client.export_evidence_pack()
        with self.assertRaises(AuthenChainValidationError):
            client.verify_evidence_pack(evidence_pack=None)

    def test_risk_classification_helpers_call_formal_endpoints(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            if path.endswith("/history"):
                return {"ok": True, "history": []}
            if path.endswith("/classify"):
                return {"ok": True, "classification": {"id": "rc_python"}}
            return {"ok": True, "useCase": {"id": "uc_python"}}

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        client.create_ai_use_case(
            name="Loan assistant",
            jurisdiction="EU",
            sector="financial_services",
            decision_type="recommendation",
            context_flags={"affects_credit_access": True},
        )
        client.classify_ai_use_case("uc_python")
        client.get_ai_use_case("uc_python")
        client.get_risk_classification_history("uc_python", page_size=10)

        self.assertEqual(calls[0][0], "POST")
        self.assertEqual(calls[0][1], "/api/regulatory/risk/use-cases")
        self.assertEqual(calls[0][2]["decisionType"], "recommendation")
        self.assertEqual(calls[1][1], "/api/regulatory/risk/use-cases/uc_python/classify")
        self.assertEqual(calls[2][1], "/api/regulatory/risk/use-cases/uc_python")
        self.assertEqual(calls[3][1], "/api/regulatory/risk/use-cases/uc_python/history")
        self.assertEqual(calls[3][3]["pageSize"], 10)

    def test_sign_with_risk_context_binds_ids(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return sign_response()

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        client.sign_with_risk_context(
            content="hello world",
            metadata={"issuer": "python-test"},
            ai_use_case_id="uc_python",
            risk_classification_id="rc_python",
            impact_assessment_id="ia_python",
            impact_assessment_hash="sha256:" + "a" * 64,
            impact_assessment_gate={"requireImpactAssessment": True, "impactAssessmentEnforcementMode": "enforce"},
        )

        self.assertEqual(calls[0][1], "/api/provenance/sign")
        self.assertEqual(calls[0][2]["aiUseCaseId"], "uc_python")
        self.assertEqual(calls[0][2]["riskClassificationId"], "rc_python")
        self.assertEqual(calls[0][2]["impactAssessmentId"], "ia_python")
        self.assertEqual(calls[0][2]["impactAssessmentHash"], "sha256:" + "a" * 64)
        self.assertEqual(calls[0][2]["impactAssessmentGate"]["impactAssessmentEnforcementMode"], "enforce")

    def test_api_error_is_exposed(self) -> None:
        def transport(_method, _path, _body, _query):
            raise AuthenChainApiError("invalid api key", code="UNAUTHORIZED", status=401)

        client = AuthenChain(api_key="ac_test_123", transport=transport)

        with self.assertRaises(AuthenChainApiError) as error:
            client.sign(content="hello", metadata={"issuer": "python-test"})

        self.assertEqual(error.exception.code, "UNAUTHORIZED")
        self.assertEqual(error.exception.status, 401)

    def test_http_api_error_redacts_credentials_and_payload_details(self) -> None:
        body = (
            b'{"message":"invalid ac_secret_python","code":"UNAUTHORIZED",'
            b'"api_key":"ac_secret_python","content":"sensitive output",'
            b'"nested":{"authorization":"Bearer ac_secret_python","safe":"value"}}'
        )
        http_error = HTTPError(
            "http://localhost:3000/api/provenance/sign",
            401,
            "Unauthorized",
            {},
            BytesIO(body),
        )

        with patch("authenchain.client.request.urlopen", side_effect=http_error):
            client = AuthenChain(api_key="ac_secret_python", base_url="http://localhost:3000")

            with self.assertRaises(AuthenChainApiError) as error:
                client.sign(content="sensitive output", metadata={"issuer": "python-test"})

        serialized_details = str(error.exception.details)
        self.assertEqual(str(error.exception), "invalid [REDACTED]")
        self.assertNotIn("ac_secret_python", serialized_details)
        self.assertNotIn("sensitive output", serialized_details)
        self.assertNotIn("Bearer ac_secret_python", serialized_details)
        self.assertEqual(error.exception.details["api_key"], "[REDACTED]")
        self.assertEqual(error.exception.details["content"], "[REDACTED]")

    def test_automatic_idempotency_key_is_reused_for_http_retries(self) -> None:
        requests = []

        class SuccessfulResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                import json
                return json.dumps(sign_response()).encode("utf-8")

        retry_error = HTTPError(
            "https://api.authenchain.com/api/provenance/sign",
            503,
            "Unavailable",
            {},
            BytesIO(b'{"error":"unavailable"}'),
        )

        def urlopen(req, timeout):
            requests.append((req, timeout))
            if len(requests) == 1:
                raise retry_error
            return SuccessfulResponse()

        with patch("authenchain.client.request.urlopen", side_effect=urlopen), patch("authenchain.client.time.sleep"):
            client = AuthenChain(api_key="ac_test_123", max_retries=1)
            client.sign(content="hello", metadata={"issuer": "python-test"})

        keys = [req.get_header("Idempotency-key") for req, _timeout in requests]
        self.assertEqual(len(keys), 2)
        self.assertRegex(keys[0], r"^sign:[0-9a-f-]{36}$")
        self.assertEqual(keys[0], keys[1])


class AuthenChainRegulatoryHelpersTest(unittest.TestCase):
    def test_validate_regulatory_metadata_accepts_valid_input(self) -> None:
        client = AuthenChain(mock=True)
        result = client.validate_regulatory_metadata(valid_regulatory_metadata())

        self.assertTrue(result["valid"])
        self.assertEqual(result["regulatory"]["schema_version"], "regulatory.v1")
        self.assertEqual(result["regulatory"]["risk_context"], "limited")
        self.assertEqual(result["regulatory"]["riskContext"]["riskTier"], "limited_risk")
        self.assertEqual(result["regulatory"]["impactAssessmentId"], "ia_python_test")
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["warnings"], [])

    def test_validate_regulatory_metadata_returns_errors_and_warnings(self) -> None:
        client = AuthenChain(mock=True)
        metadata = valid_regulatory_metadata()
        metadata["risk_context"] = "unknown"
        metadata["disclosure_applied"] = False
        metadata.pop("label_type")
        metadata["unknown"] = True

        result = client.validate_regulatory_metadata(metadata)

        self.assertFalse(result["valid"])
        self.assertIn("unknown_field", [error["code"] for error in result["errors"]])
        self.assertIn("required_when_disclosure_recorded", [error["code"] for error in result["errors"]])
        self.assertIn("unknown_risk_context", [warning["code"] for warning in result["warnings"]])
        self.assertIn("required_disclosure_not_applied", [warning["code"] for warning in result["warnings"]])

    def test_capture_regulated_output_uses_live_sign_endpoint(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            response = sign_response()
            response["metadata"]["regulatory"] = body["metadata"]["regulatory"]
            return response

        client = AuthenChain(api_key="ac_test_123", transport=transport)
        captured = client.capture_regulated_output(
            output={"answer": "approved"},
            issuer="python-regulatory-test",
            content_type="text",
            regulatory=valid_regulatory_metadata(),
            generate_metadata_defaults=True,
        )

        self.assertEqual(calls[0][0], "POST")
        self.assertEqual(calls[0][1], "/api/provenance/sign")
        self.assertEqual(calls[0][2]["metadata"]["issuer"], "python-regulatory-test")
        self.assertEqual(calls[0][2]["metadata"]["regulatory"]["schema_version"], "regulatory.v1")
        self.assertTrue(calls[0][2]["generateMetadataDefaults"])
        self.assertEqual(captured["output"], {"answer": "approved"})
        self.assertEqual(captured["regulatory"]["regulatoryEvidenceStatus"], "complete")
        self.assertEqual(captured["regulatory"]["legalCompliance"], "not_determined")

    def test_capture_regulated_output_rejects_invalid_metadata_before_network(self) -> None:
        calls = []
        client = AuthenChain(api_key="ac_test_123", transport=lambda *args: calls.append(args))
        metadata = valid_regulatory_metadata()
        metadata["risk_context"] = "critical"

        with self.assertRaises(AuthenChainValidationError) as error:
            client.capture_regulated_output(
                output="regulated output",
                issuer="python-regulatory-test",
                regulatory=metadata,
            )

        self.assertEqual(calls, [])
        self.assertEqual(error.exception.code, "INVALID_REGULATORY_METADATA")

    def test_mock_capture_and_verify_regulatory_evidence(self) -> None:
        client = AuthenChain(mock=True)
        captured = client.capture_regulated_output(
            output="regulated output",
            issuer="python-regulatory-test",
            content_type="text",
            regulatory=valid_regulatory_metadata(),
        )

        verification = client.verify_regulatory_evidence(
            content="regulated output",
            provenance=captured["provenance"],
        )

        self.assertTrue(captured["provenance"]["mock"])
        self.assertTrue(verification["mock"])
        self.assertEqual(verification["environment"], "mock")
        self.assertTrue(verification["provenanceVerified"])
        self.assertIsNone(verification["evidencePackVerified"])
        self.assertEqual(verification["regulatoryEvidenceStatus"], "complete")
        self.assertEqual(verification["legalCompliance"], "not_determined")

    def test_mock_verify_regulatory_evidence_detects_tampering(self) -> None:
        client = AuthenChain(mock=True)
        captured = client.capture_regulated_output(
            output="original output",
            issuer="python-regulatory-test",
            regulatory=valid_regulatory_metadata(),
        )

        verification = client.verify_regulatory_evidence(
            content="tampered output",
            provenance=captured["provenance"],
        )

        self.assertFalse(verification["provenanceVerified"])
        self.assertEqual(verification["regulatoryEvidenceStatus"], "invalid")
        self.assertIn("provenance_verification_failed", verification["failures"])

    def test_verify_regulatory_evidence_combined_scope(self) -> None:
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            if path == "/api/provenance/verify":
                return verify_response(True)
            return evidence_pack_response()

        provenance = sign_response()
        provenance["metadata"]["regulatory"] = valid_regulatory_metadata()
        client = AuthenChain(api_key="ac_test_123", transport=transport)

        verification = client.verify_regulatory_evidence(
            content="hello world",
            provenance=provenance,
            evidence_pack={"proofs": []},
            verification_scope="combined",
        )

        self.assertEqual([call[1] for call in calls], ["/api/provenance/verify", "/api/public/evidence/verify"])
        self.assertTrue(verification["provenanceVerified"])
        self.assertTrue(verification["evidencePackVerified"])
        self.assertEqual(verification["regulatoryEvidenceStatus"], "complete")
        self.assertEqual(verification["legalCompliance"], "not_determined")


def sign_response():
    return {
        "trace_id": "trace_python",
        "content_hash": "a" * 64,
        "metadata": {
            "schema_version": "1.0",
            "issuer": "python-test",
            "content_type": "text",
            "created_at": "2026-03-06T12:00:00.000Z",
            "nonce": "abcdef1234567890abcdef1234567890",
            "trace_id": "trace_python",
        },
        "signature": "sig_python",
        "public_key_id": "kid_python",
        "kid": "kid_python",
        "algorithm": "Ed25519",
        "signed_at": "2026-03-06T12:00:01.000Z",
    }


def verify_response(verified):
    return {
        "trace_id": "trace_verify",
        "verified": verified,
        "reason": None if verified else "signature mismatch",
        "content_hash": "a" * 64 if verified else None,
        "origin_verified": verified,
        "integrity": "intact" if verified else "modified",
        "issuer_verified": verified,
        "reason_codes": [] if verified else ["signature_mismatch"],
        "verified_at": "2026-03-06T12:00:02.000Z",
    }


def evidence_pack_response():
    return {
        "status": "trusted",
        "internalProofStatus": "complete",
        "authenticityStatus": "authenchain_issued",
        "trustedStatus": "trusted",
        "externallyTrustworthy": True,
        "verificationConclusion": {
            "internalProofStatus": "complete",
            "authenticityStatus": "authenchain_issued",
            "trustedStatus": "trusted",
            "externallyTrustworthy": True,
            "reason": "Evidence Pack is complete and AuthenChain-issued.",
        },
        "proofs": [{"proofId": "proof_1"}],
    }


def valid_regulatory_metadata():
    return {
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "EU",
        "regulatory_context": ["eu_ai_act_article_50"],
        "content_type": "text",
        "model_provider": "example-provider",
        "model_name": "example-model",
        "system_purpose": "customer_support_response",
        "risk_context": "limited",
        "human_reviewed": False,
        "disclosure_required": True,
        "disclosure_applied": True,
        "label_type": "human_visible",
        "policy_version": "ai-disclosure-policy-v1",
        # Sprint 3B-3: include a lawful basis so the metadata_legal_basis_recommended
        # recommendation warning does not fire for this complete fixture (mirrors the
        # Node SDK fixture completion in tests/sdk-node*.test.ts).
        "legal_basis": "legitimate_interest",
        "legal_basis_reference": "lia-doc-ref",
        "riskContext": {
            "schemaVersion": "authenchain.regulatory.v2",
            "jurisdiction": "EU",
            "sector": "customer_support",
            "decisionType": "informative",
            "useCaseId": "uc_python_test",
            "riskClassificationId": "rc_python_test",
            "riskTier": "limited_risk",
            "riskPolicyVersion": "ai-disclosure-policy-v1",
            "riskRulesetHash": "sha256:" + "a" * 64,
            "riskContextHash": "sha256:" + "a" * 64,
            "reviewStatus": "approved",
            "humanReviewRequired": False,
            "disclosureRequired": True,
        },
        "impactAssessmentId": "ia_python_test",
        "impactAssessmentHash": "sha256:" + "b" * 64,
        "impactAssessmentStatus": "approved_for_production",
        "impactAssessmentApprovedAt": "2026-06-01T00:00:00.000Z",
    }


if __name__ == "__main__":
    unittest.main()
