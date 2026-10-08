# AuthenChain Python SDK

Official Python SDK for AuthenChain provenance and regulatory evidence workflows.

The public SDK provides client configuration, typed exceptions, provenance methods, regulatory metadata validation, regulated output capture, regulatory evidence verification, safe webhook verification, and local mock mode.

AuthenChain supports technical evidence workflows. It does not guarantee legal compliance.

## Install

```bash
python -m pip install authenchain
```

> **Closed beta:** `authenchain` is not on PyPI yet. The package is distributed on request during the closed beta, and this command works unchanged once it is published.

For local SDK development only, use `python -m pip install -e .` from this directory.

## Minimal Usage

```py
from authenchain import AuthenChain

client = AuthenChain(
    api_key="ac_test_123",
    timeout=10.0,
    mock=False,
)

print(client.config.base_url)
```

## Sign Provenance

```py
from authenchain import AuthenChain

client = AuthenChain(api_key="ac_test_123")

signed = client.sign(
    content="AI output text",
    metadata={
        "issuer": "example-service",
        "content_type": "text",
        "regulatory": {
            "schema_version": "regulatory.v1",
            "ai_generated": True,
            "jurisdiction": "EU",
            "regulatory_context": ["EU_AI_ACT_ARTICLE_50"],
            "content_type": "text",
            "model_provider": "example-provider",
            "model_name": "example-model",
            "system_purpose": "Customer support response generation",
            "risk_context": "limited",
            "human_reviewed": False,
            "disclosure_required": True,
            "disclosure_applied": True,
            "label_type": "human_visible",
            "policy_version": "policy-2026-01",
        },
    },
)

print(signed["traceId"])
```

The hosted API defaults to `https://api.authenchain.com`. Set `AUTHENCHAIN_BASE_URL` or pass `base_url` explicitly for another environment; localhost is an explicit development override only.

Each sign operation automatically generates a `sign:<UUID>` idempotency key and reuses it across internal retries. For a retry that can happen in another process or job, pass a stable `idempotency_key`. Successful results remain replayable for 24 hours.

## Verify Webhooks

Pass the original request bytes, case-insensitive headers, the endpoint secret, and a replay store whose `claim` is atomic:

```py
from authenchain import verify_authenchain_webhook

result = verify_authenchain_webhook(
    secret=webhook_secret,
    raw_body=request.get_data(cache=False),
    headers=dict(request.headers),
    replay_store=redis_nonce_store,
)

if not result.valid:
    raise ValueError(f"Rejected webhook: {result.reason}")
```

The replay store should implement `claim(nonce, expires_at) -> bool` with one atomic operation. The maximum accepted signature age is always capped at 300 seconds.

## Verify Provenance

```py
verification = client.verify(
    content="AI output text",
    provenance=signed,
)

print(verification["verified"])
print(verification["verificationScope"])
```

`verify(...)` validates provenance integrity only. Use `verify_evidence_pack(...)` when you need to verify externally trusted AuthenChain Evidence Packs.

## Evidence Packs

```py
pack = client.export_evidence_pack(trace_id=signed["traceId"])

verified_pack = client.verify_evidence_pack(evidence_pack=pack)

print(verified_pack["trustedStatus"])
print(verified_pack["externallyTrustworthy"])
```

## Examples

Runnable Python examples are available in `examples/`:

- `regulated-text-output`
- `credit-decision-audit`
- `medical-ai-traceability`
- `tamper-verification-failure`
- `evidence-pack-export-verify`

Run one locally from the Python SDK directory:

```bash
python examples/regulated-text-output/example.py
```

The examples use mock mode by default, require no real customer data, and do not make legal compliance claims.

## Mock Setup

Mock mode can be initialized without a real API key:

```py
from authenchain import AuthenChain

client = AuthenChain(mock=True)
```

You can also enable mock mode with:

```bash
AUTHENCHAIN_MOCK_MODE=true
```

Mock mode is for tests, demos, local CI, examples, and harness simulations. It must not be treated as externally trusted evidence.

## Privacy And Data Minimization

Use raw `content` only when AuthenChain must compute or verify the content hash.
For sensitive customer data, compute a SHA-256 hash in your environment and send
`content_hash` when raw content does not need to leave that environment.

Do not place API keys, authorization headers, private keys, customer secrets, or
raw regulated records in `metadata["extra"]`, `metadata["regulatory"]`, request
IDs, correlation IDs, or example fixtures.

## Regulatory Metadata Validation

```py
result = client.validate_regulatory_metadata({
    "schema_version": "regulatory.v1",
    "ai_generated": True,
    "jurisdiction": "EU",
    "regulatory_context": ["EU_AI_ACT_ARTICLE_50"],
    "content_type": "text",
    "model_provider": "example-provider",
    "model_name": "example-model",
    "system_purpose": "Customer support response generation",
    "risk_context": "limited",
    "human_reviewed": False,
    "disclosure_required": True,
    "disclosure_applied": True,
    "label_type": "human_visible",
    "policy_version": "policy-2026-01",
})

print(result["valid"])
```

## Capture Regulated Output

```py
captured = client.capture_regulated_output(
    output="Final AI answer shown to the user.",
    issuer="support-answer-service",
    content_type="text",
    regulatory={
        "schema_version": "regulatory.v1",
        "ai_generated": True,
        "jurisdiction": "EU",
        "regulatory_context": ["EU_AI_ACT_ARTICLE_50"],
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
    },
    generate_metadata_defaults=True,
)

print(captured["provenance"]["traceId"])
print(captured["regulatory"]["legalCompliance"])
```

`legalCompliance` remains `not_determined`. AuthenChain records and verifies technical evidence; customer legal interpretation remains outside the SDK.

## Verify Regulatory Evidence

```py
verification = client.verify_regulatory_evidence(
    content="Final AI answer shown to the user.",
    provenance=captured["provenance"],
)

print(verification["regulatoryEvidenceStatus"])
print(verification["legalCompliance"])
```

For combined provenance and Evidence Pack verification:

```py
verification = client.verify_regulatory_evidence(
    content="Final AI answer shown to the user.",
    provenance=captured["provenance"],
    evidence_pack=pack,
    verification_scope="combined",
)
```

## Reserved Methods

There are no reserved regulatory helper methods in this step. The following public methods are available:

- `validate_regulatory_metadata`
- `capture_regulated_output`
- `verify_regulatory_evidence`

Python method names use `snake_case`; AuthenChain JSON wire keys remain unchanged.

## Tests

```bash
python -m unittest discover -s tests
```

## Webhook v1 replay retention

X-AuthenChain-Max-Age is an unsigned acceptance hint. It can shorten but cannot enlarge local acceptance or the 300-second protocol ceiling. The HMAC bytes remain v1.timestamp.nonce.eventId.rawBody. Reserve each valid nonce atomically until timestamp + 300 seconds regardless of the hint, using an integration/secret-version namespace and persistent SET NX plus TTL. Store failure must reject delivery. Verify the original raw bytes before JSON parsing.

## Capture assurance

Schema 1.1 includes signed authenchain.assurance.v1 metadata: A0 attests a submitted hash without observing original content; A1 observes only submitted bytes. A2-A4 are reserved and never emitted by this API. Legacy 1.0 remains verifiable without inferred assurance. These levels do not prove authorship, creation time, model identity, truth or legal compliance.
