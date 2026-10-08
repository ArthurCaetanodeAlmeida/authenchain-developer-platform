import crypto from 'node:crypto'

import type { ConfirmationReplayStore } from './config.js'

const TOKEN_TTL_MS = 5 * 60 * 1_000

type ConfirmationClaims = {
  v: 1
  tool: string
  environment: string
  keyFingerprint: string
  payloadHash: string
  nonce: string
  exp: number
}

function canonical(value: unknown, ancestors = new Set<object>(), depth = 0): string {
  if (depth > 64 || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('confirmation_payload_not_json')
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (!value || typeof value !== 'object') throw new Error('confirmation_payload_not_json')
  if (ancestors.has(value) || (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))) throw new Error('confirmation_payload_not_json')
  ancestors.add(value)
  const record = value as Record<string, unknown>
  try {
    if (Array.isArray(value)) return `[${Array.from(value, (item) => canonical(item === undefined ? null : item, ancestors, depth + 1)).join(',')}]`
    return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(record[key], ancestors, depth + 1)}`).join(',')}}`
  } finally { ancestors.delete(value) }
}

function digest(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function encode(value: Buffer | string) {
  return Buffer.from(value).toString('base64url')
}

function decode(value: string) {
  return Buffer.from(value, 'base64url')
}

export class ConfirmationTokenStore {
  private readonly secret: Buffer
  private readonly issued = new Map<string, number>()
  private readonly replayStore?: ConfirmationReplayStore

  constructor(params: { apiKey: string; explicitSecret?: string; subject?: string; replayStore?: ConfirmationReplayStore }) {
    this.secret = params.explicitSecret
      ? crypto.createHash('sha256').update(params.explicitSecret, 'utf8').digest()
      : crypto.randomBytes(32)
    this.keyFingerprint = digest(params.subject || params.apiKey).slice(0, 16)
    this.replayStore = params.replayStore
  }

  readonly keyFingerprint: string

  async issue(params: { tool: string; environment: string; payload: unknown; now?: Date }) {
    const now = params.now ?? new Date()
    const claims: ConfirmationClaims = {
      v: 1,
      tool: params.tool,
      environment: params.environment,
      keyFingerprint: this.keyFingerprint,
      payloadHash: digest(canonical(params.payload)),
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: now.getTime() + TOKEN_TTL_MS,
    }
    const body = encode(canonical(claims))
    const signature = crypto.createHmac('sha256', this.secret).update(body).digest('base64url')
    this.issued.set(claims.nonce, claims.exp)
    await this.replayStore?.put(claims.nonce, claims.exp)
    this.prune(now.getTime())
    return { token: `${body}.${signature}`, expiresAt: new Date(claims.exp).toISOString() }
  }

  async claim(params: { token: string; tool: string; environment: string; payload: unknown; now?: Date }) {
    const now = params.now ?? new Date()
    const [body, signature, extra] = params.token.split('.')
    if (!body || !signature || extra) throw new Error('confirmation_token_invalid')
    const expected = crypto.createHmac('sha256', this.secret).update(body).digest()
    const supplied = decode(signature)
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
      throw new Error('confirmation_token_invalid')
    }
    let claims: ConfirmationClaims
    try {
      claims = JSON.parse(decode(body).toString('utf8')) as ConfirmationClaims
    } catch {
      throw new Error('confirmation_token_invalid')
    }
    if (
      claims.v !== 1 ||
      claims.tool !== params.tool ||
      claims.environment !== params.environment ||
      claims.keyFingerprint !== this.keyFingerprint ||
      claims.payloadHash !== digest(canonical(params.payload)) ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= now.getTime()
    ) {
      throw new Error('confirmation_token_mismatch_or_expired')
    }
    if (this.replayStore) {
      const claimed = await this.replayStore.claim(claims.nonce, claims.exp)
      if (!claimed) throw new Error('confirmation_token_replayed_or_unknown')
    } else {
      const storedExpiry = this.issued.get(claims.nonce)
      if (!storedExpiry || storedExpiry !== claims.exp) throw new Error('confirmation_token_replayed_or_unknown')
      this.issued.delete(claims.nonce)
    }
    this.prune(now.getTime())
  }

  private prune(now: number) {
    for (const [nonce, expiry] of this.issued) {
      if (expiry <= now) this.issued.delete(nonce)
    }
  }
}
