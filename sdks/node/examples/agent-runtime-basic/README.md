# Agent Runtime Basic

Generic multi-step agent example showing where AuthenChain fits when your runtime orchestrates tools, retrieval, and a final model-backed answer.

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
npx tsx sdks/node/examples/agent-runtime-basic/index.ts
```

## What it shows

- a simple agent-style orchestration flow
- signed final output after multiple internal steps
- metadata for workflow, tool usage, and tenant context
