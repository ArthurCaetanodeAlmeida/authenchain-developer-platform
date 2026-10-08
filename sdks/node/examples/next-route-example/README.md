# Next Route Example

Server-side Next.js route handler example using AuthenChain as part of a backend API response.

## Prerequisites

- `AUTHENCHAIN_API_KEY`
- Optional `AUTHENCHAIN_BASE_URL`

## Install

```bash
npm install @authenchain/node
```

> **Closed beta:** `@authenchain/node` is not on the public npm registry yet. The package is distributed on request during the closed beta, and this command works unchanged once it is published.

## Use

Copy `route.ts` into your own `app/api/.../route.ts` and replace the placeholder generation function with your preferred provider call.

## What it shows

- safe server-side AuthenChain usage
- `wrapGeneration` inside a route handler
- how to return output plus provenance and verification metadata
