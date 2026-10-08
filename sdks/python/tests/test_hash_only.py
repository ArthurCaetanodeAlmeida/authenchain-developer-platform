import hashlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from authenchain import AuthenChain, AuthenChainValidationError


def sign_response():
    return {
        "trace_id": "trace_python",
        "content_hash": "a" * 64,
        "metadata": {
            "schema_version": "1.0",
            "issuer": "unit-test",
            "content_type": "text",
            "created_at": "2026-06-05T12:00:00.000Z",
            "nonce": "abcdef1234567890abcdef1234567890",
            "trace_id": "trace_python",
        },
        "signature": "sig_python",
        "public_key_id": "kid_python",
        "kid": "kid_python",
        "algorithm": "Ed25519",
        "signed_at": "2026-06-05T12:00:01.000Z",
    }


class HashOnlySigningTest(unittest.TestCase):
    def _capturing_client(self):
        calls = []

        def transport(method, path, body, query):
            calls.append((method, path, body, query))
            return sign_response()

        return AuthenChain(api_key="ac_test_123", transport=transport), calls

    def test_hash_only_sends_only_the_hash(self):
        client, calls = self._capturing_client()
        client.sign(content="hello world", hash_only=True, metadata={"issuer": "unit-test"})
        body = calls[0][2]
        expected = hashlib.sha256("hello world".encode("utf-8")).hexdigest()
        self.assertEqual(body["content_hash"], expected)
        self.assertNotIn("content", body)

    def test_sign_with_content_hash_sends_hash_only(self):
        client, calls = self._capturing_client()
        client.sign_with_content_hash(content_hash="b" * 64, metadata={"issuer": "unit-test"})
        body = calls[0][2]
        self.assertEqual(body["content_hash"], "b" * 64)
        self.assertNotIn("content", body)

    def test_sign_with_content_hash_rejects_invalid_hash(self):
        client, calls = self._capturing_client()
        with self.assertRaises(AuthenChainValidationError) as ctx:
            client.sign_with_content_hash(content_hash="not-a-valid-hash", metadata={"issuer": "x"})
        self.assertEqual(ctx.exception.code, "INVALID_CONTENT_HASH")
        self.assertEqual(calls, [])

    def test_capture_mode_guard_rejects_plaintext_without_mode(self):
        client, _ = self._capturing_client()
        with self.assertRaises(AuthenChainValidationError) as ctx:
            client.sign(
                content="output",
                metadata={"issuer": "x"},
                content_evidence={"input": {"content": "plaintext input"}},
            )
        self.assertEqual(ctx.exception.code, "CONTENT_EVIDENCE_MODE_REQUIRED")

    def test_sign_raw_content_backward_compat(self):
        client, calls = self._capturing_client()
        client.sign(content="hello world", metadata={"issuer": "unit-test"})
        body = calls[0][2]
        self.assertEqual(body["content"], "hello world")
        self.assertNotIn("content_hash", body)


if __name__ == "__main__":
    unittest.main()
