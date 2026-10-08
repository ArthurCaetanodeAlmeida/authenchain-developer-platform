# Changelog
## 0.1.1-rc.2 - 2026-10-08

- Preserve signed legacy 1.0 envelopes and support authenticated A0/A1 in the 1.1 contract.
- Headless MCP credentials are read-only in sandbox and production; ordinary integration credentials retain their authorized scopes.
- Bound JSON request bodies and preserve nonce replay protection.
- Use canonical API documentation and the com.authenchain/authenchain Registry namespace.
- Depend on @authenchain/node ^0.4.0; retain stdio until the remote gateway is validated.


## 0.1.1-rc.1 - 2026-10-06

Candidate for the existing VPS. Not published to registries. Preserves `capture_sign_hash` as a deprecated alias of `sign_provenance_hash` through the next major release; both use the same approval binding. Fixes absent optional IDs, headless authorization, webhook replay retention, fenced encrypted idempotency, versioned A0/A1 assurance and full Evidence Pack verification. Separates server embedding from native CLI credential storage. Remote OAuth and production MCP writes remain disabled pending their own activation gates.


All notable changes follow [Semantic Versioning](https://semver.org/).

## 0.1.0-rc.1 - 2026-08-30

- Add the official local stdio AuthenChain MCP server.
- Add nine tenant-scoped read tools for connection context, governed AI use cases, AI inventory, readiness, pending corrections, public evidence lookup, and hash-only provenance verification.
- Add four optional mutation tools protected by read-only defaults, stable idempotency keys, bounded metadata, a written reason, preview, one-time sandbox confirmation, and separate dashboard/MFA approval for production.
- Add live MCP resources and the `review_governance_readiness` prompt.
- Reject raw content, tenant identifiers, arbitrary hosts, insecure non-local HTTP, shell access, and filesystem access.
- Add OAuth/PKCE login, secure credential storage, explicit environment binding, refresh and revocation.
- Add the public Streamable HTTP endpoint with hashed 30-minute sessions and Auth0 scope filtering.
- Add stateless MCP 2026-07-28 with an isolated 2025-11-25 compatibility adapter, CIMD client metadata, RFC 9207 issuer validation, and legacy DCR/public-signup kill switches.
- Make API-key/headless credentials unconditionally read-only and add optional governance-tool packaging.
- Rename the honest hash-only signing tool to `sign_provenance_hash` and attach explicit A0 assurance limitations.
