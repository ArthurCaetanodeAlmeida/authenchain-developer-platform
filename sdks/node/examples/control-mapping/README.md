# Control Mapping Example

This example shows how to use the Node SDK for regulatory control mapping:

- list regulatory control frameworks;
- list EU AI Act Article 50 controls;
- list a NIST AI RMF governance summary;
- preview coverage without storing a snapshot;
- generate and fetch a stored snapshot;
- read maturity scores;
- export a control mapping Evidence Pack section.

## Configuration

```bash
AUTHENCHAIN_API_KEY=ac_test_...
AUTHENCHAIN_BASE_URL=http://localhost:3000
```

Use `https://api.authenchain.com` for production.

## Run

```bash
npx tsx sdks/node/examples/control-mapping/index.ts
```

The example only sends safe hashes and safe summaries. It does not upload raw
prompts, raw model outputs, personal identifiers, privileged legal notes,
artifact URLs, API keys, or unredacted evidence bodies.

The output is technical evidence for audit review and customer control
tracking. It does not determine legal compliance, does not provide legal
advice, and does not state that EU AI Act Article 50 or NIST AI RMF controls
are legally satisfied.
