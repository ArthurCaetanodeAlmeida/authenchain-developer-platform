# Changelog
## 0.4.0 - 2026-10-08

- Preserve signed legacy 1.0 envelopes and support authenticated A0/A1 in the 1.1 contract.
- Headless MCP credentials are read-only in sandbox and production; ordinary integration credentials retain their authorized scopes.
- Bound JSON request bodies and preserve nonce replay protection.
- Use canonical API documentation and the com.authenchain/authenchain Registry namespace.


All notable changes follow [Semantic Versioning](https://semver.org/).

## 0.3.0 - 2026-08-30

- Add MCP context, governance readiness, pending-governance, AI use-case listing, AI inventory lookup, and public evidence lookup methods.
- Propagate caller `AbortSignal` cancellation through HTTP requests and retries.
- Add optional mutation reasons to AI use-case creation and classification.
- Keep idempotency keys available on regulatory mutations used by the official MCP server.

## 0.2.0 - 2026-08-24

- Default the hosted API to `https://api.authenchain.com`.
- Generate and reuse a `sign:<UUID>` idempotency key for every sign operation.
- Add `verifyAuthenChainWebhook` with raw-body verification and atomic replay claims.
- Keep `verifyAuthenChainWebhookSignature` for backwards compatibility.

## 0.1.0

- Initial private preview.
