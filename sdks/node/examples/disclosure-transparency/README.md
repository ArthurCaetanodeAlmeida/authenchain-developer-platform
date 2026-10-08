# Disclosure Transparency Example

This example shows how to bind customer-controlled disclosure evidence to
AuthenChain signing metadata.

It covers:

- web chat disclosure;
- API response disclosure header;
- synthetic image visible label;
- content credential reference hash.

## Configuration

Production defaults:

```bash
AUTHENCHAIN_API_KEY=ac_live_...
AUTHENCHAIN_BASE_URL=https://api.authenchain.com
```

Local development boundary:

```bash
AUTHENCHAIN_API_KEY=ac_test_...
AUTHENCHAIN_BASE_URL=http://localhost:3000
```

The example records hashes and safe references. It does not upload raw prompts,
raw outputs, screenshots with personal data, or content credential manifests.

## Run

```bash
npx tsx sdks/node/examples/disclosure-transparency/index.ts
```

AuthenChain records technical transparency evidence. Customers own notice UX,
accessibility, legal applicability, watermarking, content credential generation,
and final legal interpretation.
