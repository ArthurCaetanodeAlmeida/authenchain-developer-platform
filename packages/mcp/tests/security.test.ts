import { describe, expect, it } from 'vitest'

import { ConfirmationTokenStore } from '../src/confirmation.js'
import { validateBoundedMetadata, validateMutationReason } from '../src/assurance.js'
import { loadMcpConfig, validateMcpBaseUrl } from '../src/config.js'
import { recordFrom } from '../src/results.js'

describe('MCP security primitives', () => {
  it('issues one-time confirmation tokens bound to tool, environment, key, and payload', async () => {
    const store = new ConfirmationTokenStore({ apiKey: 'test-key', explicitSecret: 'x'.repeat(32) })
    const issued = await store.issue({ tool: 'write', environment: 'sandbox', payload: { id: 'a' }, now: new Date(0) })
    await store.claim({ token: issued.token, tool: 'write', environment: 'sandbox', payload: { id: 'a' }, now: new Date(1) })
    await expect(store.claim({ token: issued.token, tool: 'write', environment: 'sandbox', payload: { id: 'a' }, now: new Date(2) }))
      .rejects.toThrow('confirmation_token_replayed_or_unknown')
  })

  it('rejects mismatched and expired confirmation tokens', async () => {
    const store = new ConfirmationTokenStore({ apiKey: 'test-key', explicitSecret: 'x'.repeat(32) })
    const issued = await store.issue({ tool: 'write', environment: 'sandbox', payload: { id: 'a' }, now: new Date(0) })
    await expect(store.claim({ token: issued.token, tool: 'write', environment: 'production', payload: { id: 'a' }, now: new Date(1) }))
      .rejects.toThrow('confirmation_token_mismatch_or_expired')
    await expect(store.claim({ token: issued.token, tool: 'write', environment: 'sandbox', payload: { id: 'a' }, now: new Date(300_001) }))
      .rejects.toThrow('confirmation_token_mismatch_or_expired')
  })

  it('allows exactly one atomic claim when two workers execute concurrently', async () => {
    const pending = new Map<string, number>()
    const replayStore = {
      async put(nonce: string, expiresAt: number) {
        if (pending.has(nonce)) throw new Error('collision')
        pending.set(nonce, expiresAt)
      },
      async claim(nonce: string, expiresAt: number) {
        if (pending.get(nonce) !== expiresAt) return false
        pending.delete(nonce)
        return true
      },
    }
    const store = new ConfirmationTokenStore({
      apiKey: 'internal-key',
      explicitSecret: 'x'.repeat(32),
      subject: 'user:client:organization',
      replayStore,
    })
    const issued = await store.issue({ tool: 'write', environment: 'production', payload: { id: 'a' } })
    const claims = await Promise.allSettled([
      store.claim({ token: issued.token, tool: 'write', environment: 'production', payload: { id: 'a' } }),
      store.claim({ token: issued.token, tool: 'write', environment: 'production', payload: { id: 'a' } }),
    ])
    expect(claims.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(claims.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })

  it('binds confirmation tokens to the OAuth subject, not only the derived credential', async () => {
    const issuer = new ConfirmationTokenStore({ apiKey: 'same-key', explicitSecret: 'x'.repeat(32), subject: 'user-a:client:org' })
    const other = new ConfirmationTokenStore({ apiKey: 'same-key', explicitSecret: 'x'.repeat(32), subject: 'user-b:client:org' })
    const issued = await issuer.issue({ tool: 'write', environment: 'sandbox', payload: { id: 'a' } })
    await expect(other.claim({ token: issued.token, tool: 'write', environment: 'sandbox', payload: { id: 'a' } }))
      .rejects.toThrow('confirmation_token_mismatch_or_expired')
  })

  it('enforces HTTPS and an explicit host allowlist', () => {
    expect(validateMcpBaseUrl({
      baseUrl: 'https://api.authenchain.com',
      allowedHosts: ['api.authenchain.com'],
      dangerouslyAllowLocalhost: false,
    })).toBe('https://api.authenchain.com')
    expect(() => validateMcpBaseUrl({
      baseUrl: 'https://attacker.example',
      allowedHosts: ['api.authenchain.com'],
      dangerouslyAllowLocalhost: false,
    })).toThrow('not allowlisted')
    expect(() => validateMcpBaseUrl({
      baseUrl: 'http://localhost:3000',
      allowedHosts: ['localhost'],
      dangerouslyAllowLocalhost: false,
    })).toThrow('must use HTTPS')
  })

  it('loads read-only defaults and the canonical API origin', () => {
    const config = loadMcpConfig({ AUTHENCHAIN_API_KEY: 'key', AUTHENCHAIN_MCP_ENVIRONMENT: 'sandbox', NODE_ENV: 'test', PATH: process.env.PATH })
    expect(config.profile).toBe('read-only')
    expect(config.allowProductionWrites).toBe(false)
    expect(config.baseUrl).toBe('https://api.authenchain.com')
  })

  it('cannot turn a headless API key into a writer through environment flags', () => {
    const config = loadMcpConfig({
      AUTHENCHAIN_API_KEY: 'headless-key',
      AUTHENCHAIN_MCP_ENVIRONMENT: 'production',
      AUTHENCHAIN_MCP_PROFILE: 'full',
      AUTHENCHAIN_MCP_ALLOW_PRODUCTION_WRITES: 'true',
      NODE_ENV: 'test',
    })
    expect(config.credentialKind).toBe('api-key')
    expect(config.profile).toBe('read-only')
    expect(config.allowProductionWrites).toBe(false)
  })

  it('redacts tenant and credential identifiers recursively from MCP output', () => {
    expect(recordFrom({
      tenantId: 'tenant',
      orgId: 'org',
      organization_id: 'organization',
      companyId: 'company',
      nested: { apiKeyId: 'key', api_key_id: 'snake-key', publicKeyId: 'public-kid', name: 'visible' },
    })).toEqual({ nested: { publicKeyId: 'public-kid', name: 'visible' } })
  })

  it('rejects credentials in mutation reasons and sensitive or oversized metadata', () => {
    expect(validateMutationReason('Approved governance registration')).toBe(true)
    // Construct the same synthetic negative fixture in memory so public-export
    // scanning does not mistake this test vector for a checked-in credential.
    expect(validateMutationReason(['api_key = ac', 'live', 'abcdefghijklmnopqrstuvwxyz'].join('_'))).toBe(false)
    expect(validateBoundedMetadata({ businessContext: 'bounded and safe' })).toEqual([])
    expect(validateBoundedMetadata({ raw_content: 'secret source material' })).toContain(
      'metadata.raw_content is a sensitive or raw-content field',
    )
    expect(validateBoundedMetadata({ note: 'x'.repeat(2_049) })).toContain(
      'metadata.note exceeds 2048 characters',
    )
  })
})
