# Verify Basic

Direct `verify` example for validating a stored provenance record against content later in your pipeline.

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
npx tsx sdks/node/examples/verify-basic/index.ts
```

## What it shows

- sign once, verify later
- the minimum provenance fields needed for verification
- how to inspect verification state and reason codes
