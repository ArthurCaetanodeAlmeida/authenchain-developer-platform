import runpy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
EXAMPLES = ROOT / "examples"

sys.path.insert(0, str(SRC))


class AuthenChainPythonExamplesTest(unittest.TestCase):
    def test_example_files_exist(self) -> None:
        example_names = [
            "regulated-text-output",
            "credit-decision-audit",
            "medical-ai-traceability",
            "tamper-verification-failure",
            "evidence-pack-export-verify",
        ]

        self.assertTrue((EXAMPLES / "README.md").exists())
        for name in example_names:
            self.assertTrue((EXAMPLES / name / "README.md").exists())
            self.assertTrue((EXAMPLES / name / "example.py").exists())

    def test_regulated_text_output_example_runs(self) -> None:
        result = run_example("regulated-text-output")

        self.assertEqual(result["useCase"], "regulated_text_output")
        self.assertEqual(result["regulatoryStatus"], "complete")
        self.assertEqual(result["legalCompliance"], "not_determined")
        self.assertTrue(result["verified"])
        self.assertEqual(result["environment"], "mock")

    def test_credit_decision_audit_example_runs(self) -> None:
        result = run_example("credit-decision-audit")

        self.assertEqual(result["useCase"], "credit_decision_audit")
        self.assertEqual(result["regulatoryStatus"], "complete")
        self.assertEqual(result["legalCompliance"], "not_determined")
        self.assertTrue(result["verified"])
        self.assertFalse(result["tamperedVerified"])
        self.assertIn("provenance_verification_failed", result["tamperFailures"])

    def test_medical_ai_traceability_example_runs(self) -> None:
        result = run_example("medical-ai-traceability")

        self.assertEqual(result["useCase"], "medical_ai_traceability")
        self.assertEqual(result["regulatoryStatus"], "complete")
        self.assertEqual(result["legalCompliance"], "not_determined")
        self.assertTrue(result["verified"])
        self.assertFalse(result["tamperedVerified"])

    def test_tamper_verification_failure_example_runs(self) -> None:
        result = run_example("tamper-verification-failure")

        self.assertEqual(result["useCase"], "tamper_verification_failure")
        self.assertTrue(result["originalVerified"])
        self.assertFalse(result["tamperedVerified"])
        self.assertEqual(result["tamperedStatus"], "invalid")
        self.assertEqual(result["legalCompliance"], "not_determined")

    def test_evidence_pack_export_verify_example_runs(self) -> None:
        result = run_example("evidence-pack-export-verify")

        self.assertEqual(result["useCase"], "evidence_pack_export_verify")
        self.assertEqual(result["packTrustedStatus"], "incomplete")
        self.assertFalse(result["packExternallyTrustworthy"])
        self.assertEqual(result["verifiedPackStatus"], "incomplete")
        self.assertEqual(result["legalCompliance"], "not_determined")
        self.assertEqual(result["environment"], "mock")


def run_example(name: str):
    namespace = runpy.run_path(str(EXAMPLES / name / "example.py"))
    return namespace["main"]()


if __name__ == "__main__":
    unittest.main()
