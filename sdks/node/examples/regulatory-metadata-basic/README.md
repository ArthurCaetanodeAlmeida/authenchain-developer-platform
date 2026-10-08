# Regulatory Metadata Basic

Direct `sign`, `verify`, and passive Evidence Pack example using `metadata.regulatory`.

This example shows how to attach regulatory metadata to a signed AI output without using future regulatory-specific helpers.

## Prerequisites

- `AUTHENCHAIN_API_KEY`
- Optional `AUTHENCHAIN_BASE_URL`

## Install

```bash
npm install @authenchain/node
```

> **Closed beta:** `@authenchain/node` is not on the public npm registry yet. The package is distributed on request during the closed beta, and this command works unchanged once it is published.

## Run

```bash
npx tsx sdks/node/examples/regulatory-metadata-basic/index.ts
```

## What it shows

- how to place the regulatory object at `metadata.regulatory`
- how to sign an AI output with `schema_version: "regulatory.v1"`
- how to verify the signed output through the existing `verify()` method
- how the existing Evidence Pack export can preserve signed regulatory metadata passively
- how to keep the demo runnable when Evidence Pack export is unavailable in the current environment
- why `risk_context` should come from customer policy or backend classification, not from the model output alone

## Boundary

AuthenChain records, signs, verifies, and exports technical evidence. It does not determine legal compliance, does not provide legal advice, and does not guarantee that a workflow satisfies any law or regulation.
