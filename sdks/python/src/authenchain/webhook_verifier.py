"""R7T-015 (Sprint 3D): standalone AuthenChain webhook signature verifier.

This is a self-contained COPY of the server-side validation logic in
src/lib/webhooks/crypto.ts (verifyWebhookSignature). It has NO AuthenChain SDK
imports so customers can drop it into a webhook receiver without depending on the
rest of the SDK. It uses only the Python standard library.

Wire shape (must match the AuthenChain delivery): the HMAC-SHA256 is computed over
    v1.{timestamp}.{nonce}.{event_id}.{raw_body}
using the per-endpoint webhook secret. The headers carry:
    x-authenchain-signature: v1=<hex>
    x-authenchain-timestamp, x-authenchain-nonce, x-authenchain-event-id
Pass the hex digest (without the "v1=" prefix) as ``signature``.
"""

from __future__ import annotations

import math

import hmac
import re
import time
from dataclasses import dataclass
from hashlib import sha256
from typing import Mapping, Optional, Protocol, Union

AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS = 300


class SeenNonces(Protocol):
    def has(self, nonce: str) -> bool: ...

    def add(self, nonce: str) -> None: ...


class ReplayStore(Protocol):
    def claim(self, nonce: str, expires_at: float) -> bool: ...


@dataclass(frozen=True)
class WebhookVerifyResult:
    valid: bool
    reason: Optional[str] = None
    event_id: Optional[str] = None
    timestamp: Optional[str] = None
    nonce: Optional[str] = None


def _hmac_base(timestamp: str, nonce: str, event_id: str, raw_body: str) -> str:
    return f"v1.{timestamp}.{nonce}.{event_id}.{raw_body}"


def _read_header(headers: Mapping[str, Union[str, list[str]]], name: str) -> Optional[str]:
    for key, value in headers.items():
        if str(key).lower() != name:
            continue
        selected = value[0] if isinstance(value, list) and value else value
        normalized = str(selected).strip() if selected is not None else ""
        return normalized or None
    return None


def verify_authenchain_webhook(
    *,
    secret: str,
    raw_body: Union[bytes, str],
    headers: Mapping[str, Union[str, list[str]]],
    replay_store: ReplayStore,
    max_age_seconds: int = AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS,
    now: Optional[float] = None,
) -> WebhookVerifyResult:
    """Verify raw webhook bytes and atomically claim its replay nonce.

    ``ReplayStore.claim`` must be a single atomic operation (for example Redis
    SET NX EX or a database unique insert). ``expires_at`` is epoch seconds.
    """
    if replay_store is None or not callable(getattr(replay_store, "claim", None)):
        raise ValueError("replay_store.claim_required")

    signature_header = _read_header(headers, "x-authenchain-signature")
    timestamp = _read_header(headers, "x-authenchain-timestamp")
    nonce = _read_header(headers, "x-authenchain-nonce")
    event_id = _read_header(headers, "x-authenchain-event-id")
    max_age_header = _read_header(headers, "x-authenchain-max-age")
    if not signature_header or not timestamp or not nonce or not event_id or not max_age_header:
        return WebhookVerifyResult(valid=False, reason="missing_header")

    match = re.fullmatch(r"v1=([0-9a-fA-F]{64})", signature_header)
    if not match:
        return WebhookVerifyResult(valid=False, reason="invalid_signature_header")
    if not re.fullmatch(r"\d{13}", timestamp):
        return WebhookVerifyResult(valid=False, reason="invalid_timestamp")
    if not re.fullmatch(r"[1-9]\d*", max_age_header):
        return WebhookVerifyResult(valid=False, reason="invalid_max_age")

    timestamp_ms = int(timestamp)
    header_max_age = int(max_age_header)
    if not math.isfinite(max_age_seconds) or max_age_seconds <= 0:
        raise ValueError("max_age_seconds_must_be_positive")
    # A delivery can narrow, never widen, the receiver's policy or the v1 cap.
    local_max_age = min(
        max_age_seconds, header_max_age, AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS
    )
    now_seconds = now if now is not None else time.time()
    if not math.isfinite(now_seconds):
        raise ValueError("now_must_be_valid")
    if abs(now_seconds * 1000.0 - timestamp_ms) > local_max_age * 1000:
        return WebhookVerifyResult(valid=False, reason="timestamp_outside_window")
    if not re.fullmatch(r"[0-9a-fA-F]{32}", nonce):
        return WebhookVerifyResult(valid=False, reason="invalid_nonce")
    if len(event_id) > 256 or "\r" in event_id or "\n" in event_id:
        return WebhookVerifyResult(valid=False, reason="invalid_event_id")

    body_bytes = raw_body.encode("utf-8") if isinstance(raw_body, str) else bytes(raw_body)
    signed = f"v1.{timestamp}.{nonce}.{event_id}.".encode("utf-8") + body_bytes
    expected = hmac.new(secret.encode("utf-8"), signed, sha256).hexdigest()
    if not hmac.compare_digest(match.group(1).lower(), expected):
        return WebhookVerifyResult(valid=False, reason="signature_invalid")
    if not replay_store.claim(nonce, timestamp_ms / 1000.0 + AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS):
        return WebhookVerifyResult(valid=False, reason="replay_detected")
    return WebhookVerifyResult(
        valid=True, event_id=event_id, timestamp=timestamp, nonce=nonce
    )


def verify_authenchain_webhook_signature(
    *,
    secret: str,
    raw_body: str,
    signature: str,
    timestamp: str,
    nonce: str,
    event_id: str,
    seen_nonces: SeenNonces,
    max_age_seconds: int = AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS,
    now: Optional[float] = None,
) -> WebhookVerifyResult:
    """Verify an AuthenChain webhook signature.

    Fails closed in this exact order (matching the server): invalid_timestamp ->
    timestamp_outside_window -> replay_detected -> signature_length_mismatch ->
    signature_invalid. ``seen_nonces`` is a mandatory replay cache. Uses
    ``hmac.compare_digest`` for constant-time comparison. ``now`` is epoch seconds.
    """
    if seen_nonces is None:
        raise ValueError("seen_nonces_required")

    try:
        ts = int(str(timestamp).strip())
    except (TypeError, ValueError):
        return WebhookVerifyResult(valid=False, reason="invalid_timestamp")

    now_seconds = now if now is not None else time.time()
    if not math.isfinite(now_seconds):
        raise ValueError("now_must_be_valid")
    # timestamp is milliseconds on the wire (matches the server Date.now()); compare
    # in milliseconds.
    now_ms = now_seconds * 1000.0
    if abs(now_ms - ts) > max_age_seconds * 1000:
        return WebhookVerifyResult(valid=False, reason="timestamp_outside_window")

    if seen_nonces.has(nonce):
        return WebhookVerifyResult(valid=False, reason="replay_detected")

    expected = hmac.new(
        secret.encode("utf-8"),
        _hmac_base(timestamp, nonce, event_id, raw_body).encode("utf-8"),
        sha256,
    ).hexdigest()

    sig_bytes = signature.encode("utf-8")
    exp_bytes = expected.encode("utf-8")
    if len(sig_bytes) != len(exp_bytes):
        return WebhookVerifyResult(valid=False, reason="signature_length_mismatch")
    if not hmac.compare_digest(sig_bytes, exp_bytes):
        return WebhookVerifyResult(valid=False, reason="signature_invalid")

    seen_nonces.add(nonce)
    return WebhookVerifyResult(valid=True)
