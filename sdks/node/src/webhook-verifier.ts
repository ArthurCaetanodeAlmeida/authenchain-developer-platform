// R7T-015 (Sprint 3D): standalone AuthenChain webhook signature verifier.
//
// This is a self-contained COPY of the server-side validation logic in
// src/lib/webhooks/crypto.ts (verifyWebhookSignature). It has NO AuthenChain SDK
// imports so customers can drop it into a webhook receiver that does not (and should
// not need to) depend on the rest of the SDK. It uses only the Node built-in crypto
// module.
//
// Wire shape (must match the AuthenChain delivery): the HMAC-SHA256 is computed over
//   v1.${timestamp}.${nonce}.${eventId}.${rawBody}
// using the per-endpoint webhook secret. The headers carry:
//   x-authenchain-signature: v1=<hex>
//   x-authenchain-timestamp, x-authenchain-nonce, x-authenchain-event-id
// Pass the hex digest (without the "v1=" prefix) as `signature`.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS = 300 as const

export type WebhookVerifierSeenNonces = {
  has(nonce: string): boolean
  add(nonce: string): void
}

export type VerifyAuthenChainWebhookParams = {
  secret: string
  rawBody: string
  signature: string
  timestamp: string
  nonce: string
  eventId: string
  seenNonces: WebhookVerifierSeenNonces
  maxAgeSeconds?: number
  now?: Date
}

export type VerifyAuthenChainWebhookResult =
  | { valid: true }
  | {
      valid: false
      reason:
        | 'invalid_timestamp'
        | 'timestamp_outside_window'
        | 'replay_detected'
        | 'signature_length_mismatch'
        | 'signature_invalid'
    }

export type AuthenChainWebhookHeaders =
  | Headers
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>

export type AuthenChainWebhookReplayStore = {
  /** Atomically reserves a nonce. Return true only for the first claimant. */
  claim(nonce: string, expiresAt: Date): boolean | Promise<boolean>
}

export type VerifyAuthenChainWebhookRequestParams = {
  secret: string
  rawBody: string | Uint8Array
  headers: AuthenChainWebhookHeaders
  replayStore: AuthenChainWebhookReplayStore
  maxAgeSeconds?: number
  now?: Date
}

export type VerifyAuthenChainWebhookRequestResult =
  | { valid: true; eventId: string; timestamp: string; nonce: string }
  | {
      valid: false
      reason:
        | 'missing_header'
        | 'invalid_signature_header'
        | 'invalid_timestamp'
        | 'invalid_max_age'
        | 'timestamp_outside_window'
        | 'invalid_nonce'
        | 'invalid_event_id'
        | 'signature_invalid'
        | 'replay_detected'
    }

function hmacBase(params: { timestamp: string; nonce: string; eventId: string; rawBody: string }) {
  return `v1.${params.timestamp}.${params.nonce}.${params.eventId}.${params.rawBody}`
}

function readHeader(headers: AuthenChainWebhookHeaders, name: string): string | null {
  if (typeof (headers as { get?: unknown }).get === 'function') {
    return (headers as { get(name: string): string | null }).get(name)?.trim() || null
  }
  const entry = Object.entries(headers as Record<string, string | string[] | undefined>)
    .find(([key]) => key.toLowerCase() === name)
  const value = entry?.[1]
  return (Array.isArray(value) ? value[0] : value)?.trim() || null
}

function signedWebhookBytes(params: {
  timestamp: string
  nonce: string
  eventId: string
  rawBody: string | Uint8Array
}) {
  const prefix = Buffer.from(`v1.${params.timestamp}.${params.nonce}.${params.eventId}.`, 'utf8')
  const body = typeof params.rawBody === 'string'
    ? Buffer.from(params.rawBody, 'utf8')
    : Buffer.from(params.rawBody)
  return Buffer.concat([prefix, body])
}

/**
 * Verifies an HTTP webhook directly from its raw body and headers.
 *
 * Replay protection is intentionally delegated to an atomic `claim` operation
 * (for example Redis SET NX EX or a unique database insert). Never parse and
 * reserialize JSON before calling this function.
 */
export async function verifyAuthenChainWebhook(
  params: VerifyAuthenChainWebhookRequestParams
): Promise<VerifyAuthenChainWebhookRequestResult> {
  if (!params.replayStore || typeof params.replayStore.claim !== 'function') {
    throw new Error('replayStore.claim_required')
  }

  const signatureHeader = readHeader(params.headers, 'x-authenchain-signature')
  const timestamp = readHeader(params.headers, 'x-authenchain-timestamp')
  const nonce = readHeader(params.headers, 'x-authenchain-nonce')
  const eventId = readHeader(params.headers, 'x-authenchain-event-id')
  const maxAgeHeader = readHeader(params.headers, 'x-authenchain-max-age')
  if (!signatureHeader || !timestamp || !nonce || !eventId || !maxAgeHeader) {
    return { valid: false, reason: 'missing_header' }
  }

  const signatureMatch = /^v1=([0-9a-f]{64})$/i.exec(signatureHeader)
  if (!signatureMatch) return { valid: false, reason: 'invalid_signature_header' }
  if (!/^\d{13}$/.test(timestamp)) return { valid: false, reason: 'invalid_timestamp' }

  const timestampMs = Number(timestamp)
  if (!Number.isSafeInteger(timestampMs)) return { valid: false, reason: 'invalid_timestamp' }
  if (!/^[1-9]\d*$/.test(maxAgeHeader)) return { valid: false, reason: 'invalid_max_age' }
  const headerMaxAgeSeconds = Number(maxAgeHeader)
  if (!Number.isSafeInteger(headerMaxAgeSeconds) || headerMaxAgeSeconds <= 0) {
    return { valid: false, reason: 'invalid_max_age' }
  }
  const configuredMaxAge = params.maxAgeSeconds ?? AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS
  if (!Number.isFinite(configuredMaxAge) || configuredMaxAge <= 0) {
    throw new Error('maxAgeSeconds_must_be_positive')
  }
  // The sender may narrow a delivery's validity window, but it can never
  // enlarge the receiver's local policy or the v1 protocol ceiling.
  const maxAgeSeconds = Math.min(
    configuredMaxAge,
    headerMaxAgeSeconds,
    AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS
  )
  const nowMs = (params.now ?? new Date()).getTime()
  if (!Number.isFinite(nowMs)) throw new Error('now_must_be_valid')
  if (Math.abs(nowMs - timestampMs) > maxAgeSeconds * 1000) {
    return { valid: false, reason: 'timestamp_outside_window' }
  }
  if (!/^[0-9a-f]{32}$/i.test(nonce)) return { valid: false, reason: 'invalid_nonce' }
  if (eventId.length > 256 || /[\r\n]/.test(eventId)) return { valid: false, reason: 'invalid_event_id' }

  const expected = createHmac('sha256', params.secret)
    .update(signedWebhookBytes({ timestamp, nonce, eventId, rawBody: params.rawBody }))
    .digest()
  const supplied = Buffer.from(signatureMatch[1], 'hex')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { valid: false, reason: 'signature_invalid' }
  }

  const claimed = await params.replayStore.claim(
    nonce,
    new Date(timestampMs + AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS * 1000)
  )
  if (!claimed) return { valid: false, reason: 'replay_detected' }
  return { valid: true, eventId, timestamp, nonce }
}

/**
 * Verify an AuthenChain webhook signature. Fails closed in this exact order
 * (matching the server): invalid_timestamp -> timestamp_outside_window ->
 * replay_detected -> signature_length_mismatch -> signature_invalid.
 *
 * `seenNonces` is a mandatory replay cache (a Set for tests; Redis SET NX EX or a
 * persistent table in production). Constant-time comparison via timingSafeEqual.
 */
export function verifyAuthenChainWebhookSignature(
  params: VerifyAuthenChainWebhookParams
): VerifyAuthenChainWebhookResult {
  if (!params.seenNonces) {
    throw new Error('seenNonces_required')
  }

  const ts = Number.parseInt(params.timestamp, 10)
  if (!Number.isFinite(ts)) return { valid: false, reason: 'invalid_timestamp' }

  const now = (params.now ?? new Date()).getTime()
  const maxAgeMs = (params.maxAgeSeconds ?? AUTHENCHAIN_WEBHOOK_MAX_AGE_SECONDS) * 1000
  if (Math.abs(now - ts) > maxAgeMs) {
    return { valid: false, reason: 'timestamp_outside_window' }
  }

  if (params.seenNonces.has(params.nonce)) {
    return { valid: false, reason: 'replay_detected' }
  }

  const expected = createHmac('sha256', params.secret)
    .update(
      hmacBase({
        timestamp: params.timestamp,
        nonce: params.nonce,
        eventId: params.eventId,
        rawBody: params.rawBody,
      }),
      'utf8'
    )
    .digest('hex')

  const sigBuf = Buffer.from(params.signature, 'utf8')
  const expBuf = Buffer.from(expected, 'utf8')
  if (sigBuf.length !== expBuf.length) {
    return { valid: false, reason: 'signature_length_mismatch' }
  }
  if (!timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'signature_invalid' }
  }

  params.seenNonces.add(params.nonce)
  return { valid: true }
}
