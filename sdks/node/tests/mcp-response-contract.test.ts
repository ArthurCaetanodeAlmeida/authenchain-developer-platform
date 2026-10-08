import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthenChain } from '../src/index.js'

const context = { ok: true, schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Contract fixture', environment: 'sandbox' }, dashboardUrl: 'https://dashboard.example.test', apiVersion: '1', scopes: ['mcp:connect'], capabilities: { verification: true }, limitations: ['technical evidence only'] }
const requirement = { id: 'owner', label: 'Owner', detail: 'An owner is required', met: false, correction: { href: '/dashboard/use-cases/one', url: 'https://dashboard.example.test/dashboard/use-cases/one', actionLabel: 'Assign owner' } }
const readiness = { ok: true, readiness: { schemaVersion: 'authenchain.governance-readiness.v1', generatedAt: '2026-10-06T00:00:00Z', dashboardUrl: 'https://dashboard.example.test', summary: {}, limitations: [], useCases: [{ id: 'one', key: 'one', name: 'Fixture', readiness: 'blocked', productionEligible: false, signingBlockedReason: 'owner_missing', score: { met: 0, total: 1 }, requirements: [requirement], notEvaluated: [], blockers: ['owner_missing'], warnings: [], links: {} }] } }
const pending = { ok: true, pending: { schemaVersion: 'authenchain.governance-pending.v1', generatedAt: '2026-10-06T00:00:00Z', limitations: [], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, items: [{ id: 'one:owner', useCase: { id: 'one', key: 'one', name: 'Fixture' }, readiness: 'blocked', productionEligible: false, requirement }] } }
const lookup = { ok: true, hash: 'a'.repeat(64), found: true, evidencePacks: [{ id: 'pack' }], policies: [], verificationScope: 'public_hash_registry', cryptographicEvidencePackVerified: false, limitation: 'Registry match is not complete verification.' }
const cases = [ ['getMcpContext', {}, context, 'organization'], ['getGovernanceReadiness', {}, readiness, 'readiness'], ['listPendingGovernance', {}, pending, 'pending'], ['lookupPublicEvidence', { hash: 'a'.repeat(64) }, lookup, 'found'] ] as const

afterEach(() => vi.unstubAllGlobals())
describe('SDK validates actual MCP HTTP response contracts', () => {
  it.each(cases)('preserves a populated valid %s response', async (method, input, fixture) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(fixture)))
    const client = new AuthenChain({ apiKey: 'synthetic-sdk-contract' })
    const result = await (client[method] as any)(input)
    expect(result).toEqual(fixture)
  })
  for (const [method, input, fixture, required] of cases) {
    it.each([{}, [], null, 'wrong', { ...fixture, [required]: undefined }, { ...fixture, [required]: 12 }])(`${method} rejects malformed response %j`, async (value) => {
      vi.stubGlobal('fetch', vi.fn(async () => Response.json(value)))
      const client = new AuthenChain({ apiKey: 'synthetic-sdk-contract' })
      await expect((client[method] as any)(input)).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
    })
  }
  it('rejects lookup pretending to verify cryptographic evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...lookup, cryptographicEvidencePackVerified: true })))
    await expect(new AuthenChain({ apiKey: 'synthetic' }).lookupPublicEvidence({ hash: lookup.hash })).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
  })
  it('rejects invalid environment and pagination counts', async () => {
    const client = new AuthenChain({ apiKey: 'synthetic' })
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...context, organization: { name: 'Fixture', environment: 'unknown' } })))
    await expect(client.getMcpContext()).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...pending, pending: { ...pending.pending, pagination: { ...pending.pending.pagination, total: -1 } } })))
    await expect(client.listPendingGovernance()).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
  })
})
