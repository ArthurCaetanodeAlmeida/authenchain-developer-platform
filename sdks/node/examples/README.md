# Official SDK Examples

These examples show how to integrate `@authenchain/node` into modern AI application flows without changing your interface between local development and production.

## Shared prerequisites

- Node.js 18+
- `AUTHENCHAIN_API_KEY`
- Optional `AUTHENCHAIN_BASE_URL` for local or non-default environments

Examples that talk to a real model provider also require their own provider credentials.

## Examples

- `openai-basic/`: OpenAI Responses API + `wrapGeneration`
- `langchain-basic/`: LangChain chat flow + AuthenChain provenance
- `agent-runtime-basic/`: multi-step agent orchestration with signed final output
- `next-route-example/`: Next.js route handler using AuthenChain server-side
- `sign-basic/`: direct `sign` call for low-level provenance issuance
- `verify-basic/`: direct `verify` call against a stored provenance record
- `regulatory-metadata-basic/`: direct `sign`, `verify`, and passive Evidence Pack flow with `metadata.regulatory`
- `credit-decision-audit/`: regulated credit decision-support evidence with tamper verification
- `medical-ai-traceability/`: reviewed medical AI draft traceability with tamper verification
- `insurance-claim-review/`: JSON insurance claim review evidence with tamper verification
- `customer-support-ai-audit/`: Article 50-style customer support disclosure evidence
- `public-interest-ai-disclosure/`: public-interest AI text disclosure evidence
- `disclosure-transparency/`: disclosure notice, signing binding, synthetic status, and marking evidence
- `control-mapping/`: regulatory control mapping preview, snapshot, maturity, and Evidence Pack section export
- `incident-governance/`: incident creation, evidence linkage, corrective action, Evidence Pack export, and metadata-only webhook boundary
- `agent-generated-report-audit/`: agent-generated report audit evidence

## Install patterns

Base SDK only:

```bash
npm install @authenchain/node
```

OpenAI example:

```bash
npm install @authenchain/node openai
```

LangChain example:

```bash
npm install @authenchain/node @langchain/openai @langchain/core openai
```

> **Closed beta:** `@authenchain/node` is not on the public npm registry yet. The package is distributed on request during the closed beta, and these commands work unchanged once it is published.

## Run

Use `tsx` or your preferred TypeScript runner:

```bash
npx tsx sdks/node/examples/openai-basic/index.ts
```

Each example directory contains a short README with the exact env vars and commands.

The regulatory examples use `captureRegulatedOutput`, `verifyRegulatoryEvidence`, and `summarizeRegulatoryEvidencePack` where applicable. They generate technical evidence for audit and dispute workflows. They do not guarantee legal compliance.

For partner-facing business-risk demos that show broader product flows, see the PoC kit in `poc/`.
