import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthenChainMcpConfig } from '../src/config.js'
import { createAuthenChainMcpServer } from '../src/server.js'

const handles: Array<{ close(): Promise<void> }> = []

afterEach(async () => {
  await Promise.all(handles.splice(0).map((handle) => handle.close().catch(() => undefined)))
  vi.unstubAllGlobals()
})

function config(profile: 'read-only' | 'full'): AuthenChainMcpConfig {
  return {
    apiKey: 'test-key',
    baseUrl: 'https://api.authenchain.com',
    dashboardUrl: 'https://forgetechindustrial.cloud',
    expectedEnvironment: 'sandbox',
    credentialKind: 'oauth',
    profile,
    allowProductionWrites: false,
    governanceEnabled: true,
    allowedHosts: ['api.authenchain.com'],
    dangerouslyAllowLocalhost: false,
    timeoutMs: 5_000,
    logLevel: 'error',
    confirmationSecret: 'x'.repeat(32),
  }
}

async function connected(profile: 'read-only' | 'full', overrides: Partial<AuthenChainMcpConfig> = {}) {
  const server = createAuthenChainMcpServer({ ...config(profile), ...overrides })
  const client = new Client({ name: 'authenchain-mcp-test', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  handles.push(client, server)
  return client
}

describe('MCP advertised surface', () => {
  it.each([
    { signature: true, capture: undefined, expected: 'unknown' },
    { signature: true, capture: { authenticated: false, assurance_level: 'A4', capture_method: 'claimed' }, expected: 'unknown' },
    { signature: false, capture: { schema_version: 'authenchain.assurance.v1', authenticated: true, assurance_level: 'A1', capture_method: 'observe_submitted_content', content_observed: true }, expected: 'unknown' },
    { signature: true, capture: { authenticated: true, assurance_level: 'A4', capture_method: 'claimed' }, expected: 'unknown' },
    { signature: true, capture: { schema_version: 'unsupported.v9', authenticated: true, assurance_level: 'A0', capture_method: 'attest_submitted_hash', content_observed: false }, expected: 'unknown' },
    { signature: true, capture: { schema_version: 'authenchain.assurance.v1', authenticated: true, assurance_level: 'A0', capture_method: 'observe_submitted_content', content_observed: true }, expected: 'unknown' },
    { signature: true, capture: { schema_version: 'authenchain.assurance.v1', authenticated: true, assurance_level: 'A1' }, expected: 'unknown' },
    { signature: true, capture: { schema_version: 'authenchain.assurance.v1', authenticated: true, assurance_level: 'A0', capture_method: 'attest_submitted_hash', content_observed: false }, expected: 'A0' },
    { signature: true, capture: { schema_version: 'authenchain.assurance.v1', authenticated: true, assurance_level: 'A1', capture_method: 'observe_submitted_content', content_observed: true }, expected: 'A1' },
  ])('exposes only authenticated supported assurance: $expected', async ({ signature, capture, expected }) => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/api/mcp/context')
      ? Response.json({ ok: true, schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic', environment: 'sandbox' }, dashboardUrl: 'https://api.authenchain.com/dashboard', apiVersion: '1', scopes: ['provenance:verify'], capabilities: {}, limitations: [] })
      : Response.json({ trace_id: '4f1f9674-d2c3-411a-a4b9-3cb196fa2c9b', verified: signature, reason: signature ? null : 'invalid_signature', content_hash: 'a'.repeat(64), origin_verified: signature, integrity: signature ? 'intact' : 'modified', issuer_verified: signature, reason_codes: signature ? [] : ['invalid_signature'], verified_at: '2026-10-08T00:00:00Z', signature_valid: signature, capture_assurance: capture })))
    const client = await connected('read-only')
    const result = await client.callTool({ name: 'verify_provenance', arguments: { contentHash: 'a'.repeat(64), signature: 'synthetic-signature-only', publicKeyId: 'synthetic-public-id', metadata: { schema_version: expected === 'unknown' ? '1.0' : '1.1', issuer: 'fixture', content_type: 'text', created_at: '2026-10-08T00:00:00Z', nonce: 'fixture-nonce-original-0001', trace_id: '4f1f9674-d2c3-411a-a4b9-3cb196fa2c9b', extra: { assurance_level: 'A4', capture_method: 'claimed' }, ...(expected === 'unknown' ? {} : { assurance: { schemaVersion: 'authenchain.assurance.v1', assuranceLevel: expected, captureMethod: expected === 'A0' ? 'attest_submitted_hash' : 'observe_submitted_content', contentObserved: expected === 'A1', limitations: ['Original signed limitation'] } }) } } })
    expect(result.isError, JSON.stringify(result.structuredContent)).not.toBe(true)
    expect((result.structuredContent as any).data.verification.captureAssurance).toMatchObject({ assuranceLevel: expected, authenticated: expected !== 'unknown' })
  })
  it('advertises only read tools in the default profile', async () => {
    const client = await connected('read-only')
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      'connection_status',
      'get_ai_system',
      'get_readiness',
      'get_use_case',
      'list_ai_systems',
      'list_pending_governance',
      'list_use_cases',
      'lookup_evidence',
      'verify_provenance',
    ])
    expect(tools.tools.every((tool) => tool.outputSchema?.type === 'object')).toBe(true)
  })

  it('advertises mutation tool names only in the full profile', async () => {
    const client = await connected('full')
    const tools = await client.listTools()
    const names = tools.tools.map((tool) => tool.name)
    expect(names).toEqual(expect.arrayContaining([
      'register_ai_use_case',
      'register_ai_system',
      'classify_ai_use_case',
      'sign_provenance_hash',
    ]))
  })

  it('filters the advertised tools to the scopes resolved by the remote resource server', async () => {
    const client = await connected('full', { toolAllowlist: ['connection_status', 'lookup_evidence'] })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual(['connection_status', 'lookup_evidence'])
  })
  it('denies resource and prompt data reads after a consent is reduced to connection only, before HTTP', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const client = await connected('full', { toolAllowlist: ['connection_status'] })
    for (const uri of ['authenchain://use-cases/fixture', 'authenchain://ai-systems/fixture', 'authenchain://readiness']) {
      await expect(client.readResource({ uri })).rejects.toThrow()
    }
    await expect(client.getPrompt({ name: 'review_governance_readiness' })).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('can package provenance without the optional governance module', async () => {
    const client = await connected('read-only', { governanceEnabled: false })
    const [tools, resources, templates, prompts] = await Promise.all([
      client.listTools(),
      client.listResources(),
      client.listResourceTemplates(),
      client.listPrompts(),
    ])
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      'connection_status',
      'lookup_evidence',
      'verify_provenance',
    ])
    expect(resources.resources.map((resource) => resource.uri).sort()).toEqual([
      'authenchain://capabilities',
      'authenchain://limitations',
    ])
    expect(templates.resourceTemplates).toEqual([])
    expect(prompts.prompts).toEqual([])
  })

  it('fails closed when the selected environment does not match the credential', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      ok: true,
      schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic test organization', environment: 'production' }, dashboardUrl: 'https://forgetechindustrial.cloud', apiVersion: '1', scopes: ['mcp:connect'],
      capabilities: {},
      limitations: [],
    })))
    const client = await connected('read-only', { expectedEnvironment: 'sandbox' })
    const result = await client.callTool({ name: 'connection_status', arguments: {} })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({ ok: false, code: 'INTERNAL_ERROR' })
  })

  it('advertises resources and the governance review prompt', async () => {
    const client = await connected('read-only')
    const [resources, templates, prompts] = await Promise.all([
      client.listResources(),
      client.listResourceTemplates(),
      client.listPrompts(),
    ])
    expect(resources.resources.map((resource) => resource.uri)).toEqual(expect.arrayContaining([
      'authenchain://capabilities',
      'authenchain://limitations',
      'authenchain://readiness',
    ]))
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(expect.arrayContaining([
      'authenchain://use-cases/{id}',
      'authenchain://ai-systems/{id}',
    ]))
    expect(prompts.prompts.map((prompt) => prompt.name)).toContain('review_governance_readiness')
  })

  it('executes a sandbox mutation only after exact one-time preview confirmation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/api/mcp/context')) {
        return Response.json({
          ok: true,
          schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic test organization', environment: 'sandbox' }, dashboardUrl: 'https://forgetechindustrial.cloud', apiVersion: '1', scopes: ['mcp:connect', 'risk.usecase:write'],
          capabilities: {},
          limitations: [],
        })
      }
      if (path.endsWith('/api/regulatory/risk/use-cases')) {
        return Response.json({ ok: true, useCase: { id: 'uc_1', name: 'Sandbox assistant' } }, { status: 201 })
      }
      return Response.json({ error: 'unexpected_path' }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = await connected('full')
    const base = {
      idempotencyKey: 'mcp:use-case:test-01',
      reason: 'Approved sandbox onboarding',
      useCase: {
        name: 'Sandbox assistant',
        jurisdiction: 'BR',
        sector: 'financial_services',
        decisionType: 'recommendation',
      },
    }
    const preview = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'preview' },
    })
    const token = (((preview.structuredContent as Record<string, unknown>).data as Record<string, unknown>).preview as Record<string, unknown>).confirmationToken
    expect(token).toEqual(expect.any(String))

    const execute = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'execute', confirmationToken: token },
    })
    expect(execute.isError).not.toBe(true)
    expect(execute.structuredContent).toMatchObject({ ok: true, environment: 'sandbox' })

    const replay = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'execute', confirmationToken: token },
    })
    expect(replay.isError).toBe(true)
    expect(replay.structuredContent).toMatchObject({
      ok: false,
      code: 'CONFIRMATION_TOKEN_REPLAYED_OR_UNKNOWN',
    })
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/api/regulatory/risk/use-cases'))).toHaveLength(1)
  })

  it('requires a separate, one-time human approval for production mutations', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/api/mcp/context')) {
        return Response.json({
          ok: true,
          schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic test organization', environment: 'production' }, dashboardUrl: 'https://forgetechindustrial.cloud', apiVersion: '1', scopes: ['mcp:connect', 'risk.usecase:write'],
          capabilities: {},
          limitations: [],
        })
      }
      if (path.endsWith('/api/regulatory/risk/use-cases')) {
        return Response.json({ ok: true, useCase: { id: 'uc_prod_1', name: 'Production assistant' } }, { status: 201 })
      }
      return Response.json({ error: 'unexpected_path' }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)
    let available = true
    const approvalStore = {
      request: vi.fn(async () => ({
        approvalRequestId: 'approval_prod_1',
        approvalUrl: 'https://forgetechindustrial.cloud/dashboard/mcp/approvals/approval_prod_1',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      })),
      claim: vi.fn(async () => {
        if (!available) return false
        available = false
        return true
      }),
    }
    const client = await connected('full', {
      expectedEnvironment: 'production',
      allowProductionWrites: true,
      mutationApprovalStore: approvalStore,
    })
    const base = {
      idempotencyKey: 'mcp:use-case:production-01',
      reason: 'Human approved production onboarding',
      useCase: {
        name: 'Production assistant',
        jurisdiction: 'BR',
        sector: 'financial_services',
        decisionType: 'recommendation',
      },
    }
    const preview = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'preview' },
    })
    const previewData = (((preview.structuredContent as Record<string, unknown>).data as Record<string, unknown>).preview as Record<string, unknown>)
    expect(previewData).toMatchObject({ approvalRequestId: 'approval_prod_1' })
    expect(previewData).not.toHaveProperty('confirmationToken')

    const withoutHumanApproval = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'execute', confirmationToken: 'agent-self-confirmation-token' },
    })
    expect(withoutHumanApproval.isError).toBe(true)
    expect(withoutHumanApproval.structuredContent).toMatchObject({ ok: false, code: 'HUMAN_APPROVAL_REQUIRED' })

    const execute = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'execute', approvalRequestId: 'approval_prod_1' },
    })
    expect(execute.isError).not.toBe(true)
    expect(approvalStore.claim).toHaveBeenCalledTimes(1)

    const replay = await client.callTool({
      name: 'register_ai_use_case',
      arguments: { ...base, mode: 'execute', approvalRequestId: 'approval_prod_1' },
    })
    expect(replay.isError).toBe(true)
    expect(replay.structuredContent).toMatchObject({ ok: false, code: 'HUMAN_APPROVAL_INVALID_EXPIRED_OR_USED' })
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/api/regulatory/risk/use-cases'))).toHaveLength(1)
  })

  it('fails production preview closed when the human approval service is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      ok: true,
      schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic test organization', environment: 'production' }, dashboardUrl: 'https://forgetechindustrial.cloud', apiVersion: '1', scopes: ['mcp:connect', 'risk.usecase:write'],
      capabilities: {},
      limitations: [],
    })))
    const client = await connected('full', {
      expectedEnvironment: 'production',
      allowProductionWrites: true,
    })
    const result = await client.callTool({
      name: 'register_ai_use_case',
      arguments: {
        mode: 'preview',
        idempotencyKey: 'mcp:use-case:production-02',
        reason: 'Attempt without approval service',
        useCase: {
          name: 'Blocked assistant',
          jurisdiction: 'BR',
          sector: 'financial_services',
          decisionType: 'recommendation',
        },
      },
    })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({ ok: false, code: 'PRODUCTION_HUMAN_APPROVAL_UNAVAILABLE' })
  })

  it.each(['sign_provenance_hash', 'capture_sign_hash'].flatMap((name) => [{}, { aiUseCaseId: 'case-1' }, { riskClassificationId: 'risk-1' }, { aiUseCaseId: 'case-1', riskClassificationId: 'risk-1' }].map((ids) => ({ name, ids }))))('previews and executes $name with optional IDs $ids', async ({ name, ids }) => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/api/mcp/context')) return Response.json({ ok: true, schemaVersion: 'authenchain.mcp-context.v1', organization: { name: 'Synthetic test organization', environment: 'sandbox' }, dashboardUrl: 'https://forgetechindustrial.cloud', apiVersion: '1', scopes: ['provenance:sign'], capabilities: {}, limitations: [] })
      const body = JSON.parse(String(init?.body))
      return Response.json({ ...body, metadata: { ...body.metadata, schema_version: '1.0' }, signature: 'synthetic-test-signature', public_key_id: 'public-key', kid: 'public-key', algorithm: 'Ed25519', trace_id: body.metadata.trace_id, signed_at: '2026-10-06T00:00:00Z' })
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = await connected('full')
    const args = { ...ids, contentHash: 'a'.repeat(64), metadata: { issuer: 'test', content_type: 'text', created_at: '2026-10-06T00:00:00Z', nonce: '0123456789abcdef', trace_id: '4f1f9674-d2c3-411a-a4b9-3cb196fa2c9b' }, reason: 'Testing submitted hash', idempotencyKey: 'mcp:sign:optional-ids' }
    const preview = await client.callTool({ name, arguments: { ...args, mode: 'preview' } })
    expect(preview.isError).not.toBe(true)
    const data = preview.structuredContent as any
    expect(data.data.preview.input).toEqual(expect.objectContaining(ids))
    expect(Object.values(data.data.preview.input)).not.toContain(undefined)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/provenance/sign'))).toHaveLength(0)
    const executed = await client.callTool({ name, arguments: { ...args, mode: 'execute', confirmationToken: data.data.preview.confirmationToken } })
    expect(executed.isError).not.toBe(true)
    const requests = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/provenance/sign'))
    expect(requests).toHaveLength(1)
    const sent = JSON.parse(String(requests[0][1]?.body))
    for (const key of ['aiUseCaseId', 'riskClassificationId']) {
      if (key in ids) expect(sent[key]).toBe((ids as any)[key])
      else expect(sent).not.toHaveProperty(key)
    }
    expect(sent.metadata.extra.assurance_level).toBe('A0')
    const replay = await client.callTool({ name, arguments: { ...args, mode: 'execute', confirmationToken: data.data.preview.confirmationToken } })
    expect(replay.isError).toBe(true)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/provenance/sign'))).toHaveLength(1)
  })

})
