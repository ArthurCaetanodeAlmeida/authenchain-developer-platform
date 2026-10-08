# LangChain Basic

Simple LangChain example that generates a model response, signs it with AuthenChain, and verifies the resulting provenance.

## Prerequisites

- `AUTHENCHAIN_API_KEY`
- Optional `AUTHENCHAIN_BASE_URL`
- `OPENAI_API_KEY`

## Install

```bash
npm install @authenchain/node @langchain/core @langchain/openai openai
```

> **Closed beta:** `@authenchain/node` is not on the public npm registry yet. The package is distributed on request during the closed beta, and this command works unchanged once it is published.

## Run

```bash
npx tsx sdks/node/examples/langchain-basic/index.ts
```

## What it shows

- AuthenChain with a LangChain chat model
- `wrapGeneration` around a LangChain `invoke`
- metadata that is useful for backend observability and partner demos
