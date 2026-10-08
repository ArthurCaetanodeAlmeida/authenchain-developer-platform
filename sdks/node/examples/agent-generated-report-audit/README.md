# Agent-Generated Report Audit Example

This example shows how to capture and verify signed evidence for an agent-generated report.

AuthenChain provides technical evidence for provenance, integrity, traceability, audit, and dispute workflows. It does not guarantee legal compliance or determine whether a report review process is legally sufficient.

## Install

```bash
npm install @authenchain/node
```

> **Closed beta:** `@authenchain/node` is not on the public npm registry yet. The package is distributed on request during the closed beta, and this command works unchanged once it is published.

## Environment

```bash
export AUTHENCHAIN_API_KEY="ac_test_..."
export AUTHENCHAIN_BASE_URL="http://localhost:3000"
```

`AUTHENCHAIN_BASE_URL` is optional when using the default AuthenChain endpoint.

## Run

```bash
npx tsx sdks/node/examples/agent-generated-report-audit/index.ts
```

The example captures an agent-generated report draft, verifies the original output, verifies a tampered output, and attempts to summarize an Evidence Pack when available.
