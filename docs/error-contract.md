# Regulatory API Validation And Error Contract

Last updated: 2026-05-31

Status: implemented technical validation contract for regulatory API audit.

Invalid input must fail before persistence. AuthenChain APIs must reject invalid
regulatory input before persistence, workflow transition, evidence resolution,
export generation, or external delivery. AuthenChain does not provide legal
advice, certification, regulator approval, or legal-compliance determinations.

## Validation Boundary

Regulatory APIs must validate at the earliest safe boundary:

- route handlers validate request body, query string, path parameters, size
  limits, and enum values before calling write services;
- services validate workflow transitions, tenant scope, evidence references,
  dates, hashes, required acknowledgements, and unsafe raw fields before
  persistence;
- public verifier APIs validate JSON shape, body size, schema version, envelope
  status, evidence hashes, and forbidden public fields before returning a
  verification result;
- SDK, CLI, and backfill tools validate regulatory metadata locally before
  making network calls or writing inferred records.

## Error Response Contract

Error responses must be actionable and safe:

- use bounded status codes such as `400`, `403`, `404`, `409`, `413`, `422`,
  `429`, and `503`;
- use stable machine-readable error codes such as `invalid_request`,
  `INVALID_REQUEST`, `payload_too_large`, `invalid_json`, `not_found`,
  `forbidden`, `rate_limited`, and domain-specific validation codes;
- include trace identifiers when the route has request context support;
- never echo raw uploaded payloads, raw prompts, raw outputs, secrets, API keys,
  tokens, private URLs, KMS material, patient identifiers, tenant-private
  records, or internal review notes;
- return not-found or forbidden responses without revealing whether a
  cross-tenant record exists.

## Required Validation Classes

| Class | Required behavior | Evidence |
| --- | --- | --- |
| Size limits | Oversized public verifier payloads fail before parsing or verification. | Public verifier route tests. |
| Enum validation | Framework IDs, evidence types, statuses, sectors, jurisdictions, and share modes are schema-enforced. | Zod route schemas and contract tests. |
| Date validation | Invalid timestamps and inverted reporting/control periods fail before write services. | API validation audit tests and phase service tests. |
| Tenant scope | Cross-tenant references are rejected or returned as safe not-found/forbidden responses. | API, resolver, and dashboard tests. |
| Workflow transitions | Invalid lifecycle transitions fail before persistence or history/audit writes. | Incident, assessment, disclosure, and inventory service tests. |
| Evidence references | Unknown, unsafe, cross-tenant, or hashless public/share-safe evidence references are rejected. | Control mapping resolver tests. |
| Error redaction | Error responses contain safe codes and do not echo private input. | Public verifier and privacy audit tests. |

## Release Gate

Before production release, run:

```bash
npx vitest run tests/regulatory-api-validation-audit.test.ts
npm run test:regulatory:risk-classification
npm run test:regulatory:impact-assessment
npm run test:regulatory:ai-inventory
npm run test:regulatory:disclosure-transparency
npm run test:regulatory:incident-governance
npm run test:regulatory:control-mapping
npm run test:enterprise:readiness
npm test
npm audit --omit=dev
```

The validation audit passes only when invalid input is rejected before state
changes, public/share-safe errors remain redacted, API contracts are documented,
and the dependency audit is either clean or formally accepted.

## Corpos de mutação após revisão PR129/130

Handlers de escrita autenticados por API key usam leitor JSON limitado, com
Content-Length decimal obrigatório. Ausência: 411 CONTENT_LENGTH_REQUIRED;
valor inválido: 400 INVALID_CONTENT_LENGTH; divergência de bytes: 400
CONTENT_LENGTH_MISMATCH; tamanho declarado ou recebido acima do limite do endpoint:
413 PAYLOAD_TOO_LARGE; JSON/UTF-8 inválido: 400 INVALID_JSON. Erros mantêm trace e
não reservam operação de negócio nem geram efeito/outbox. Verificações semânticas
limitam o stream e podem aceitar ausência de Content-Length. SDKs com JSON serializado
calculam tamanho em bytes UTF-8; não usar comprimento de caracteres. A matriz
revisada está em scripts/security/api-key-handlers.json. Aprovações/canais que
negam API key podem retornar sua negação 403 antes de ler o corpo.
