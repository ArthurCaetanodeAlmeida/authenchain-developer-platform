# AuthenChain Developer Platform

Public, Apache-2.0-licensed integration surface for AuthenChain:

- `@authenchain/node` — Node.js/TypeScript SDK;
- `@authenchain/mcp` — MCP stdio server;
- public OpenAPI, Postman collection, error catalog and cryptographic test vectors;
- examples and public integration documentation.

The supported transport is stdio. Documentation: `https://api.authenchain.com/docs/mcp`. The planned remote endpoint is `https://mcp.authenchain.com/mcp`; remote OAuth remains disabled until its production release gate passes.

This repository intentionally excludes the private application, infrastructure implementation, commercial rules, customer data and secrets.

## Development

```bash
npm install
npm run build
npm test
npm run pack:check
```

## Security

Do not open public issues containing tokens, API keys, customer payloads or vulnerability details. Follow [SECURITY.md](SECURITY.md).
