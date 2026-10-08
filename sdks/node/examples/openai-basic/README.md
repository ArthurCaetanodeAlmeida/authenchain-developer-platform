# OpenAI Basic

OpenAI Responses API example that uses `wrapGeneration` to generate text, sign it immediately, and verify it before returning or storing the result.

## Prerequisites

- `AUTHENCHAIN_API_KEY`
- Optional `AUTHENCHAIN_BASE_URL`
- `OPENAI_API_KEY`

## Install

```bash
npm install @authenchain/node openai
```

> **Closed beta:** `@authenchain/node` is not on the public npm registry yet. The package is distributed on request during the closed beta, and this command works unchanged once it is published.

## Run

```bash
npx tsx sdks/node/examples/openai-basic/index.ts
```

## What it shows

- idiomatic `wrapGeneration`
- useful metadata for demos and partner PoCs
- verification of the returned provenance
- logging `traceId`, `signature`, and verification result
