import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { verifyAuthenChainWebhook, verifyAuthenChainWebhookSignature } from '../src/index.js'
import vector from './fixtures/webhook-signature-v1.json'

// R7T-015 (Sprint 3D): standalone webhook verifier (Node). Mirrors the server-side
// verifyWebhookSignature fail-closed order and HMAC wire shape.

const SECRET = 'whsec_test_secret'
const NOW = 1_700_000_000_000 // fixed epoch ms

function sign(params: { timestamp: string; nonce: string; eventId: string; rawBody: string }) {
  return createHmac('sha256', SECRET)
    .update(`v1.${params.timestamp}.${params.nonce}.${params.eventId}.${params.rawBody}`, 'utf8')
    .digest('hex')
}

function freshNonces() {
  const set = new Set<string>()
  return { has: (n: string) => set.has(n), add: (n: string) => set.add(n) }
}

function validParams(overrides: Record<string, unknown> = {}) {
  const timestamp = String(NOW)
  const nonce = 'nonce_1'
  const eventId = 'evt_1'
  const rawBody = '{"hello":"world"}'
  return {
    secret: SECRET,
    rawBody,
    signature: sign({ timestamp, nonce, eventId, rawBody }),
    timestamp,
    nonce,
    eventId,
    seenNonces: freshNonces(),
    now: new Date(NOW),
    ...overrides,
  }
}

describe('R7T-015 standalone webhook verifier (Node)', () => {
  it('verifies a valid HMAC + nonce + timestamp', () => {
    const result = verifyAuthenChainWebhookSignature(validParams())
    expect(result.valid).toBe(true)
  })

  it('rejects an invalid (non-numeric) timestamp (fail-closed first)', () => {
    const result = verifyAuthenChainWebhookSignature(validParams({ timestamp: 'not-a-number' }))
    expect(result).toEqual({ valid: false, reason: 'invalid_timestamp' })
  })

  it('rejects a timestamp outside the window', () => {
    const oldTs = String(NOW - 10 * 60 * 1000) // 10 minutes old
    const result = verifyAuthenChainWebhookSignature(
      validParams({ timestamp: oldTs, signature: sign({ timestamp: oldTs, nonce: 'nonce_1', eventId: 'evt_1', rawBody: '{"hello":"world"}' }) })
    )
    expect(result).toEqual({ valid: false, reason: 'timestamp_outside_window' })
  })

  it('rejects a replayed nonce', () => {
    const seen = freshNonces()
    seen.add('nonce_1')
    const result = verifyAuthenChainWebhookSignature(validParams({ seenNonces: seen }))
    expect(result).toEqual({ valid: false, reason: 'replay_detected' })
  })

  it('rejects a signature with a length mismatch', () => {
    const result = verifyAuthenChainWebhookSignature(validParams({ signature: 'tooshort' }))
    expect(result).toEqual({ valid: false, reason: 'signature_length_mismatch' })
  })

  it('rejects an invalid signature of correct length', () => {
    const result = verifyAuthenChainWebhookSignature(validParams({ signature: 'a'.repeat(64) }))
    expect(result).toEqual({ valid: false, reason: 'signature_invalid' })
  })

  it('enforces the documented rejection order (timestamp before replay before signature)', () => {
    // bad timestamp AND replayed nonce AND bad signature -> invalid_timestamp wins
    const seen = freshNonces()
    seen.add('nonce_1')
    const result = verifyAuthenChainWebhookSignature(
      validParams({ timestamp: 'bad', signature: 'x', seenNonces: seen })
    )
    expect(result).toEqual({ valid: false, reason: 'invalid_timestamp' })
  })
})

describe('AuthenChain HTTP webhook verifier', () => {
  it.each([-30_001, -30_000, -29_999, 29_999, 30_000, 30_001])('enforces the local 30-second boundary including future skew at %sms', async (offset) => {
    const claim = vi.fn(async () => true)
    const result = await verifyAuthenChainWebhook({ secret: vector.secret, rawBody: vector.rawBody, headers: headers(), replayStore: { claim }, maxAgeSeconds: 30, now: new Date(Number(vector.timestamp) + offset) })
    expect(result.valid).toBe(Math.abs(offset) <= 30_000)
    expect(claim).toHaveBeenCalledTimes(Math.abs(offset) <= 30_000 ? 1 : 0)
    if (result.valid) expect(claim).toHaveBeenCalledWith(vector.nonce, new Date(Number(vector.timestamp) + 300_000))
  })
  it.each([NaN, Infinity, -1, 0])('rejects invalid local policy %s without a nonce claim', async (maxAgeSeconds) => {
    const claim = vi.fn(async () => true)
    await expect(verifyAuthenChainWebhook({ secret: vector.secret, rawBody: vector.rawBody, headers: headers(), replayStore: { claim }, maxAgeSeconds })).rejects.toThrow('maxAgeSeconds')
    expect(claim).not.toHaveBeenCalled()
  })
  it.each(['x-authenchain-event-id', 'x-authenchain-nonce'])('rejects tampering of signed %s before nonce claim', async (name) => {
    const claim = vi.fn(async () => true)
    const original = new Headers(headers())
    original.set(name, name.endsWith('nonce') ? 'b'.repeat(32) : 'different-event')
    expect(await verifyAuthenChainWebhook({ secret: vector.secret, rawBody: vector.rawBody, headers: original, replayStore: { claim }, now: new Date(Number(vector.timestamp)) })).toMatchObject({ valid: false, reason: 'signature_invalid' })
    expect(claim).not.toHaveBeenCalled()
  })
  function headers(overrides: Record<string, string> = {}) {
    return {
      'X-AuthenChain-Signature': `v1=${vector.signature}`,
      'x-authenchain-timestamp': vector.timestamp,
      'X-AuthenChain-Nonce': vector.nonce,
      'x-authenchain-event-id': vector.eventId,
      'X-AuthenChain-Max-Age': '300',
      ...overrides,
    }
  }

  it('verifies the shared cross-language vector from raw bytes', async () => {
    const claimed = new Set<string>()
    expect(createHmac('sha256', vector.secret).update(`v1.${vector.timestamp}.${vector.nonce}.${vector.eventId}.${vector.rawBody}`).digest('hex')).toBe(vector.signature)
    const result = await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: new TextEncoder().encode(vector.rawBody),
      headers: headers(),
      replayStore: { claim: async (nonce) => !claimed.has(nonce) && Boolean(claimed.add(nonce)) },
      now: new Date(Number(vector.timestamp)),
    })
    expect(result).toEqual({
      valid: true,
      eventId: vector.eventId,
      timestamp: vector.timestamp,
      nonce: vector.nonce,
    })
  })

  it('claims a valid nonce atomically so simultaneous deliveries have one winner', async () => {
    let reserved = false
    const replayStore = {
      claim: async () => {
        if (reserved) return false
        reserved = true
        return true
      },
    }
    const params = {
      secret: vector.secret,
      rawBody: vector.rawBody,
      headers: headers(),
      replayStore,
      now: new Date(Number(vector.timestamp)),
    }
    const [first, second] = await Promise.all([
      verifyAuthenChainWebhook(params),
      verifyAuthenChainWebhook(params),
    ])
    expect([first.valid, second.valid].sort()).toEqual([false, true])
    expect([first, second].find((item) => !item.valid)).toEqual({ valid: false, reason: 'replay_detected' })
  })

  it('rejects a tampered body before consuming the nonce', async () => {
    const claim = vi.fn(async () => true)
    const result = await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: `${vector.rawBody} `,
      headers: headers(),
      replayStore: { claim },
      now: new Date(Number(vector.timestamp)),
    })
    expect(result).toEqual({ valid: false, reason: 'signature_invalid' })
    expect(claim).not.toHaveBeenCalled()
  })

  it('does not allow a caller window above the protocol maximum', async () => {
    const result = await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: vector.rawBody,
      headers: headers(),
      replayStore: { claim: async () => true },
      maxAgeSeconds: 3_600,
      now: new Date(Number(vector.timestamp) + 301_000),
    })
    expect(result).toEqual({ valid: false, reason: 'timestamp_outside_window' })
  })

  it('requires and validates the unsigned v1 max-age acceptance header', async () => {
    const missing: Record<string, string> = headers()
    delete missing['X-AuthenChain-Max-Age']
    const replayStore = { claim: vi.fn(async () => true) }
    expect(await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: vector.rawBody,
      headers: missing,
      replayStore,
      now: new Date(Number(vector.timestamp)),
    })).toEqual({ valid: false, reason: 'missing_header' })
    expect(await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: vector.rawBody,
      headers: headers({ 'X-AuthenChain-Max-Age': '0' }),
      replayStore,
      now: new Date(Number(vector.timestamp)),
    })).toEqual({ valid: false, reason: 'invalid_max_age' })
    expect(replayStore.claim).not.toHaveBeenCalled()
  })

  it('lets the header narrow but never widen the local replay window', async () => {
    const replayStore = { claim: vi.fn(async () => true) }
    expect(await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: vector.rawBody,
      headers: headers({ 'X-AuthenChain-Max-Age': '30' }),
      replayStore,
      maxAgeSeconds: 120,
      now: new Date(Number(vector.timestamp) + 31_000),
    })).toEqual({ valid: false, reason: 'timestamp_outside_window' })
    expect(await verifyAuthenChainWebhook({
      secret: vector.secret,
      rawBody: vector.rawBody,
      headers: headers({ 'X-AuthenChain-Max-Age': '3600' }),
      replayStore,
      maxAgeSeconds: 30,
      now: new Date(Number(vector.timestamp) + 31_000),
    })).toEqual({ valid: false, reason: 'timestamp_outside_window' })
    expect(replayStore.claim).not.toHaveBeenCalled()
  })
  it('retains a nonce for the protocol ceiling when an unsigned hint is expanded after 31 seconds', async () => {
    let now = Number(vector.timestamp)
    const entries = new Map<string, number>()
    const claim = vi.fn(async (nonce: string, expiresAt: Date) => {
      if ((entries.get(nonce) ?? 0) > now) return false
      entries.set(nonce, expiresAt.getTime())
      return true
    })
    const params = { secret: vector.secret, rawBody: vector.rawBody, replayStore: { claim } }
    expect((await verifyAuthenChainWebhook({ ...params, headers: headers({ 'X-AuthenChain-Max-Age': '30' }), now: new Date(now) })).valid).toBe(true)
    expect(entries.get(vector.nonce)).toBe(now + 300_000)
    now += 31_000
    expect(await verifyAuthenChainWebhook({ ...params, headers: headers(), now: new Date(now) })).toEqual({ valid: false, reason: 'replay_detected' })
  })

  it('propagates replay-store failure and never accepts a message without its claim', async () => {
    await expect(verifyAuthenChainWebhook({ secret: vector.secret, rawBody: vector.rawBody, headers: headers(), now: new Date(Number(vector.timestamp)), replayStore: { claim: async () => { throw new Error('store_unavailable') } } })).rejects.toThrow('store_unavailable')
  })

})
