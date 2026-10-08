# Changelog
## 0.4.0 - 2026-10-08

- Preserve signed legacy 1.0 envelopes and support authenticated A0/A1 in the 1.1 contract.
- Headless MCP credentials are read-only in sandbox and production; ordinary integration credentials retain their authorized scopes.
- Bound JSON request bodies and preserve nonce replay protection.
- Use canonical API documentation and the com.authenchain/authenchain Registry namespace.


All notable changes follow [Semantic Versioning](https://semver.org/).

## 0.3.0 - 2026-08-30

- Align the public Python package release with the Node SDK 0.3 and MCP release train.
- Preserve the existing Python API and secure webhook verification contract without breaking changes.

## 0.2.0 - 2026-08-24

- Default the hosted API to `https://api.authenchain.com`.
- Generate and reuse a `sign:<UUID>` idempotency key for every sign operation.
- Add `verify_authenchain_webhook` with raw-body verification and atomic replay claims.
- Keep `verify_authenchain_webhook_signature` for backwards compatibility.

## 0.1.0

- Initial private preview.
