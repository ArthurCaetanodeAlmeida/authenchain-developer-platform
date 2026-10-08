# Sign Basic

Direct `sign` example for teams that want explicit control over when provenance is issued.

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
npx tsx sdks/node/examples/sign-basic/index.ts
```

## What it shows

- low-level `sign`
- useful metadata for backend pipelines
- how to inspect the returned provenance payload
