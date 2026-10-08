import hashlib
import hmac
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from authenchain import verify_authenchain_webhook, verify_authenchain_webhook_signature

VECTOR_PATH = Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "webhook-signature-v1.json"
if not VECTOR_PATH.exists():
    VECTOR_PATH = Path(__file__).resolve().parents[3] / "contracts" / "test-vectors" / "webhook-signature-v1.json"
VECTOR = json.loads(VECTOR_PATH.read_text())

SECRET = "whsec_test_secret"
NOW_MS = 1_700_000_000_000
NOW_SECONDS = NOW_MS / 1000.0


def sign(timestamp, nonce, event_id, raw_body):
    return hmac.new(
        SECRET.encode("utf-8"),
        f"v1.{timestamp}.{nonce}.{event_id}.{raw_body}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


class SeenNonceSet:
    def __init__(self):
        self._seen = set()

    def has(self, nonce):
        return nonce in self._seen

    def add(self, nonce):
        self._seen.add(nonce)


def valid_kwargs(**overrides):
    timestamp = str(NOW_MS)
    nonce = "nonce_1"
    event_id = "evt_1"
    raw_body = '{"hello":"world"}'
    base = {
        "secret": SECRET,
        "raw_body": raw_body,
        "signature": sign(timestamp, nonce, event_id, raw_body),
        "timestamp": timestamp,
        "nonce": nonce,
        "event_id": event_id,
        "seen_nonces": SeenNonceSet(),
        "now": NOW_SECONDS,
    }
    base.update(overrides)
    return base


class WebhookVerifierTest(unittest.TestCase):
    def test_valid_signature_verifies(self):
        result = verify_authenchain_webhook_signature(**valid_kwargs())
        self.assertTrue(result.valid)

    def test_invalid_timestamp_rejected_first(self):
        result = verify_authenchain_webhook_signature(**valid_kwargs(timestamp="not-a-number"))
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "invalid_timestamp")


class AtomicReplayStore:
    def __init__(self):
        self.claimed = set()

    def claim(self, nonce, _expires_at):
        if nonce in self.claimed:
            return False
        self.claimed.add(nonce)
        return True


class HttpWebhookVerifierTest(unittest.TestCase):
    def headers(self):
        return {
            "X-AuthenChain-Signature": f"v1={VECTOR['signature']}",
            "x-authenchain-timestamp": VECTOR["timestamp"],
            "X-AuthenChain-Nonce": VECTOR["nonce"],
            "x-authenchain-event-id": VECTOR["eventId"],
            "X-AuthenChain-Max-Age": "300",
        }

    def test_exact_local_boundary_and_future_skew(self):
        timestamp = int(VECTOR["timestamp"]) / 1000.0
        for offset in [-30.001, -30, -29.999, 29.999, 30, 30.001]:
            with self.subTest(offset=offset):
                store = AtomicReplayStore()
                result = verify_authenchain_webhook(secret=VECTOR["secret"], raw_body=VECTOR["rawBody"], headers=self.headers(), replay_store=store, max_age_seconds=30, now=timestamp + offset)
                self.assertEqual(result.valid, abs(offset) <= 30)
                self.assertEqual(len(store.claimed), 1 if abs(offset) <= 30 else 0)

    def test_invalid_policy_and_clock_fail_without_claim(self):
        for policy in [float("nan"), float("inf"), -1, 0]:
            store = AtomicReplayStore()
            with self.assertRaises(ValueError):
                verify_authenchain_webhook(secret=VECTOR["secret"], raw_body=VECTOR["rawBody"], headers=self.headers(), replay_store=store, max_age_seconds=policy)
            self.assertEqual(store.claimed, set())
        with self.assertRaises(ValueError):
            verify_authenchain_webhook(secret=VECTOR["secret"], raw_body=VECTOR["rawBody"], headers=self.headers(), replay_store=AtomicReplayStore(), now=float("nan"))

    def test_event_and_nonce_tampering_rejected_without_claim(self):
        for header, value in [("x-authenchain-event-id", "changed"), ("X-AuthenChain-Nonce", "b" * 32)]:
            store = AtomicReplayStore()
            result = verify_authenchain_webhook(secret=VECTOR["secret"], raw_body=VECTOR["rawBody"], headers={**self.headers(), header: value}, replay_store=store, now=int(VECTOR["timestamp"]) / 1000.0)
            self.assertEqual(result.reason, "signature_invalid")
            self.assertEqual(store.claimed, set())

    def test_shared_cross_language_vector(self):
        result = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"].encode("utf-8"),
            headers=self.headers(),
            replay_store=AtomicReplayStore(),
            now=int(VECTOR["timestamp"]) / 1000.0,
        )
        self.assertTrue(result.valid)
        self.assertEqual(result.event_id, VECTOR["eventId"])

    def test_replay_claim_has_one_winner(self):
        store = AtomicReplayStore()
        kwargs = {
            "secret": VECTOR["secret"],
            "raw_body": VECTOR["rawBody"],
            "headers": self.headers(),
            "replay_store": store,
            "now": int(VECTOR["timestamp"]) / 1000.0,
        }
        first = verify_authenchain_webhook(**kwargs)
        second = verify_authenchain_webhook(**kwargs)
        self.assertTrue(first.valid)
        self.assertFalse(second.valid)
        self.assertEqual(second.reason, "replay_detected")

    def test_tampered_body_does_not_consume_nonce(self):
        store = AtomicReplayStore()
        result = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"] + " ",
            headers=self.headers(),
            replay_store=store,
            now=int(VECTOR["timestamp"]) / 1000.0,
        )
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "signature_invalid")
        self.assertEqual(store.claimed, set())

    def test_max_age_is_capped_at_protocol_limit(self):
        result = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"],
            headers=self.headers(),
            replay_store=AtomicReplayStore(),
            max_age_seconds=3600,
            now=int(VECTOR["timestamp"]) / 1000.0 + 301,
        )
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "timestamp_outside_window")

    def test_max_age_header_is_required_and_validated(self):
        missing = self.headers()
        del missing["X-AuthenChain-Max-Age"]
        store = AtomicReplayStore()
        result = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"],
            headers=missing,
            replay_store=store,
            now=int(VECTOR["timestamp"]) / 1000.0,
        )
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "missing_header")
        invalid = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"],
            headers={**self.headers(), "X-AuthenChain-Max-Age": "0"},
            replay_store=store,
            now=int(VECTOR["timestamp"]) / 1000.0,
        )
        self.assertFalse(invalid.valid)
        self.assertEqual(invalid.reason, "invalid_max_age")
        self.assertEqual(store.claimed, set())

    def test_header_can_narrow_but_not_widen_local_window(self):
        now = int(VECTOR["timestamp"]) / 1000.0 + 31
        narrowed = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"],
            headers={**self.headers(), "X-AuthenChain-Max-Age": "30"},
            replay_store=AtomicReplayStore(),
            max_age_seconds=120,
            now=now,
        )
        widened = verify_authenchain_webhook(
            secret=VECTOR["secret"],
            raw_body=VECTOR["rawBody"],
            headers={**self.headers(), "X-AuthenChain-Max-Age": "3600"},
            replay_store=AtomicReplayStore(),
            max_age_seconds=30,
            now=now,
        )
        self.assertEqual(narrowed.reason, "timestamp_outside_window")
        self.assertEqual(widened.reason, "timestamp_outside_window")

    def test_unsigned_header_expansion_does_not_release_nonce(self):
        now = [int(VECTOR["timestamp"]) / 1000.0]
        expiries = {}
        class ExpiringStore:
            def claim(self, nonce, expiry):
                if expiries.get(nonce, 0) > now[0]:
                    return False
                expiries[nonce] = expiry
                return True
        kwargs = dict(secret=VECTOR["secret"], raw_body=VECTOR["rawBody"], replay_store=ExpiringStore())
        first = verify_authenchain_webhook(**kwargs, headers={**self.headers(), "X-AuthenChain-Max-Age": "30"}, now=now[0])
        self.assertTrue(first.valid)
        self.assertEqual(expiries[VECTOR["nonce"]], now[0] + 300)
        now[0] += 31
        replay = verify_authenchain_webhook(**kwargs, headers=self.headers(), now=now[0])
        self.assertFalse(replay.valid)
        self.assertEqual(replay.reason, "replay_detected")

    def test_timestamp_outside_window_rejected(self):
        old_ts = str(NOW_MS - 10 * 60 * 1000)
        result = verify_authenchain_webhook_signature(
            **valid_kwargs(
                timestamp=old_ts,
                signature=sign(old_ts, "nonce_1", "evt_1", '{"hello":"world"}'),
            )
        )
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "timestamp_outside_window")

    def test_replayed_nonce_rejected(self):
        seen = SeenNonceSet()
        seen.add("nonce_1")
        result = verify_authenchain_webhook_signature(**valid_kwargs(seen_nonces=seen))
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "replay_detected")

    def test_length_mismatch_rejected(self):
        result = verify_authenchain_webhook_signature(**valid_kwargs(signature="tooshort"))
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "signature_length_mismatch")

    def test_invalid_signature_rejected(self):
        result = verify_authenchain_webhook_signature(**valid_kwargs(signature="a" * 64))
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "signature_invalid")

    def test_rejection_order_timestamp_before_replay_before_signature(self):
        seen = SeenNonceSet()
        seen.add("nonce_1")
        result = verify_authenchain_webhook_signature(
            **valid_kwargs(timestamp="bad", signature="x", seen_nonces=seen)
        )
        self.assertFalse(result.valid)
        self.assertEqual(result.reason, "invalid_timestamp")


if __name__ == "__main__":
    unittest.main()
