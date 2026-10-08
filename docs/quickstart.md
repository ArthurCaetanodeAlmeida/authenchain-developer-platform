# Regulatory Developer Quickstart

Last updated: 2026-05-28

Status: Phase 1 Step 7 developer quickstart aligned to current public,
customer, and developer documentation.
Audience: engineers integrating AuthenChain into regulated AI evidence workflows.
Estimated time: 5 minutes in mock mode for a prepared local repository.

AuthenChain supports regulatory evidence workflows by creating technical evidence
for AI output provenance, integrity, traceability, auditability, chain of
custody, and dispute handling.

AuthenChain provides technical evidence for AI output provenance, integrity,
traceability, audit, chain of custody, verification, and dispute workflows.
AuthenChain does not provide legal advice and does not determine legal
compliance. Legal interpretation remains the customer's responsibility.

## What This Quickstart Covers

This guide shows the shortest local path to:

- install the Node SDK surface;
- install the Python SDK surface;
- use the CLI;
- create `metadata.regulatory`;
- capture a regulated AI output;
- verify the original output;
- simulate tampering;
- export and verify an Evidence Pack;
- run everything in mock mode without network calls.

Mock mode is for tests, demos, local CI, examples, and harness simulations. It
must not be treated as externally trusted evidence.

## Prerequisites

From the repository root:

```bash
npm install
npm run build:sdk:node
npm run build:cli
cd sdks/python && python3 -m pip install -e . && cd ../..
```

For live API usage, configure credentials:

```bash
export AUTHENCHAIN_API_KEY="ac_test_..."
export AUTHENCHAIN_BASE_URL="https://api.authenchain.com"
```

Use `http://localhost:3000` only when the AuthenChain server is running locally:

```bash
export AUTHENCHAIN_BASE_URL="http://localhost:3000"
```

For a real software integration, provision the tenant and API key from a
software manifest before copying credentials into the downstream application.
Use `docs/software-tenant-integration-bootstrap.md` and run:

```bash
npm run tenant:bootstrap-software -- --manifest ./deploy/software-tenants/<software>.json
npm run tenant:bootstrap-software -- --manifest ./deploy/software-tenants/<software>.json --check-only
```

Do not manually copy tenant ids, user ids, or partial scope lists into scripts.
The bootstrap validates declared capabilities such as Control Mapping before the
integration is accepted.

For this quickstart, use mock mode:

```bash
export AUTHENCHAIN_MOCK_MODE=true
```

## Step 1: Create Regulatory Metadata

Create a local metadata file:

```bash
cat > /tmp/authenchain-regulatory-metadata.json <<'JSON'
{
  "schema_version": "regulatory.v1",
  "ai_generated": true,
  "jurisdiction": "EU",
  "regulatory_context": ["eu_ai_act_article_50", "developer_quickstart"],
  "content_type": "text",
  "model_provider": "internal",
  "model_name": "quickstart-assistant",
  "model_version": "2026-05-01",
  "system_purpose": "customer_support_response",
  "risk_context": "limited",
  "human_reviewed": false,
  "disclosure_required": true,
  "disclosure_applied": true,
  "label_type": "human_visible",
  "policy_version": "ai-disclosure-policy-v1"
}
JSON
```

Ownership rule: `risk_context`, jurisdiction, disclosure, labeling, human review,
and policy fields come from the customer policy workflow. AuthenChain validates
and signs the values; it does not infer legal risk from the model output.

## Step 2: Validate Metadata With The CLI

Build the CLI first if needed:

```bash
npm run build:cli
```

Validate the metadata locally:

```bash
node packages/cli/dist/index.js regulatory validate \
  --metadata @/tmp/authenchain-regulatory-metadata.json \
  --pretty
```

Expected result:

```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

If validation fails, fix the metadata before signing. Invalid regulatory metadata
should fail locally before a network request is made.

## Step 3: Sign A Regulated Output With The CLI

Create a sign request:

```bash
cat > /tmp/authenchain-sign-request.json <<'JSON'
{
  "content": "AI-generated support answer with a visible disclosure.",
  "metadata": {
    "issuer": "quickstart-support-service",
    "content_type": "text",
    "regulatory": {
      "schema_version": "regulatory.v1",
      "ai_generated": true,
      "jurisdiction": "EU",
      "regulatory_context": ["eu_ai_act_article_50", "developer_quickstart"],
      "content_type": "text",
      "model_provider": "internal",
      "model_name": "quickstart-assistant",
      "model_version": "2026-05-01",
      "system_purpose": "customer_support_response",
      "risk_context": "limited",
      "human_reviewed": false,
      "disclosure_required": true,
      "disclosure_applied": true,
      "label_type": "human_visible",
      "policy_version": "ai-disclosure-policy-v1"
    }
  }
}
JSON
```

Sign in mock mode:

```bash
node packages/cli/dist/index.js sign \
  --mock \
  --input /tmp/authenchain-sign-request.json \
  --output /tmp/authenchain-signed.json \
  --pretty
```

The command output includes a `provenance` object with `metadata.regulatory`,
`trace_id`, `signature`, `public_key_id`, `environment: "mock"`, and
`mock: true`.

Privacy note: this quickstart uses `content` so the flow is easy to inspect. In
sensitive workflows, compute a SHA-256 hash inside the customer environment and
use `contentHash` or `content_hash` when raw content does not need to leave that
environment. Do not put raw prompts, raw outputs, passwords, API keys, secrets,
or unnecessary personal data in signed metadata.

## Step 4: Verify The Original Output

Verify the original content:

```bash
node packages/cli/dist/index.js verify \
  --mock \
  --input /tmp/authenchain-signed.json \
  --content "AI-generated support answer with a visible disclosure." \
  --pretty
```

Expected result:

- `verified` is `true`;
- `integrity` is `intact`;
- `verificationScope` is `provenance`;
- external trust is not available from provenance-only verification.

## Step 5: Simulate Tampering

Verify modified content against the same provenance:

```bash
node packages/cli/dist/index.js verify \
  --mock \
  --input /tmp/authenchain-signed.json \
  --content "AI-generated support answer with a visible disclosure. Tampered claim." \
  --pretty || test "$?" -eq 2
```

Expected result:

- verification completes;
- `verified` is `false`;
- `integrity` is `modified`;
- the process exits with code `2` because verification failed as expected.

This demonstrates technical integrity failure. It does not prove whether the
original or tampered text is true, lawful, or compliant.

## Step 6: Run The Same Flow With Node

Use the Node SDK in mock mode:

```ts
import { AuthenChain, type RegulatoryMetadataV1 } from '@authenchain/node'

const ac = new AuthenChain({ mock: true })

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'EU',
  regulatory_context: ['eu_ai_act_article_50', 'developer_quickstart'],
  content_type: 'text',
  model_provider: 'internal',
  model_name: 'quickstart-assistant',
  system_purpose: 'customer_support_response',
  risk_context: 'limited',
  human_reviewed: false,
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'human_visible',
  policy_version: 'ai-disclosure-policy-v1',
}

const output = 'AI-generated support answer with a visible disclosure.'

const captured = await ac.captureRegulatedOutput({
  output,
  issuer: 'quickstart-support-service',
  content_type: 'text',
  regulatory,
  generateMetadataDefaults: true,
})

const verification = await ac.verifyRegulatoryEvidence({
  content: output,
  provenance: captured.provenance,
})

console.log({
  traceId: captured.provenance.traceId,
  regulatoryEvidenceStatus: verification.regulatoryEvidenceStatus,
  legalCompliance: verification.legalCompliance,
})
```

`legalCompliance` remains `not_determined`.

Runnable Node examples are available in
[sdks/node/examples](../sdks/node/examples/README.md).

## Step 7: Run The Same Flow With Python

From the Python SDK directory:

```bash
cd sdks/python
python3 examples/regulated-text-output/example.py
cd ../..
```

The example uses:

- `AuthenChain(mock=True)`;
- `capture_regulated_output(...)`;
- `verify_regulatory_evidence(...)`;
- complete `metadata.regulatory`;
- `legalCompliance: "not_determined"`.

Additional Python examples are available in
[sdks/python/examples](../sdks/python/examples/README.md).

## Step 8: Export And Verify An Evidence Pack

Mock Evidence Packs are never externally trustworthy, but they let developers
test the workflow shape locally.

Export:

```bash
node packages/cli/dist/index.js evidence-pack export \
  --mock \
  --trace-id trace_quickstart \
  --output /tmp/authenchain-evidence-pack.json \
  --pretty
```

Verify:

```bash
node packages/cli/dist/index.js evidence-pack verify \
  --mock \
  --input /tmp/authenchain-evidence-pack.json \
  --pretty || test "$?" -eq 2
```

Expected mock properties:

- `environment` is `mock`;
- `externallyTrustworthy` is `false`;
- Evidence Pack verification exits with code `2` because mock packs are not
  externally trustworthy;
- `legalCompliance` remains `not_determined` when a regulatory conclusion is
  present.

For production trust, use live mode and the public verifier against an
AuthenChain-issued Evidence Pack. The production public verifier is
`https://api.authenchain.com/verify`.

## Step 9: Run The Regulatory Harness

Run all local scenarios:

```bash
node packages/cli/dist/index.js harness run --pretty
```

Run the tamper scenario only:

```bash
node packages/cli/dist/index.js harness run \
  --scenario tampered_output \
  --pretty
```

The harness uses mock mode by design. It is useful for CI smoke checks and local
integration validation.

## Live Mode Checklist

Before switching from mock mode to live mode:

- set `AUTHENCHAIN_API_KEY`;
- set `AUTHENCHAIN_BASE_URL` for local or non-default deployments;
- remove `--mock`;
- unset `AUTHENCHAIN_MOCK_MODE`;
- confirm `metadata.regulatory` values come from customer policy, backend
  workflow, or compliance review;
- store returned provenance with the output or with the customer record;
- export Evidence Packs only for records that need audit, dispute, or review.

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `api_key` error | Live mode is enabled without credentials. | Use `--mock` or set `AUTHENCHAIN_API_KEY`. |
| `invalid_enum` for `risk_context` | Unsupported risk value. | Use `low`, `limited`, `high`, or `unknown`. |
| `label_type` required | Disclosure is required or applied. | Set `label_type` to `machine_readable`, `human_visible`, `both`, or `none`. |
| Verification exits with code `2` | Verification completed and failed. | Treat this as expected for tamper tests; investigate for live records. |
| Evidence Pack is not externally trustworthy | Mock mode or invalid envelope. | Use live mode and an AuthenChain-issued Evidence Pack for public trust. |

## Related Documents

- [Customer server implementation guide](./customer-server-implementation-guide.md)
- [Regulatory Coverage Matrix](./regulatory-coverage-matrix.md)
- [Regulatory developer experience contracts](./regulatory-developer-experience-contracts.md)
- [Regulatory metadata developer guide](./regulatory-metadata-developer-guide.md)
- [Regulatory Evidence Pack developer guide](./regulatory-evidence-pack-developer-guide.md)
- [Phase 6 security checklist](./regulatory-developer-experience-security-checklist.md)
- [Regulatory claims policy](./regulatory-claims-policy.md)
- [Shared responsibility model](./shared-responsibility-model.md)
- [Python SDK examples](../sdks/python/examples/README.md)
- [Node SDK examples](../sdks/node/examples/README.md)
