import type { AuthenChainMcpConfig } from './config.js'
import type { ConfirmationTokenStore } from './confirmation.js'

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

export type MutationControl = {
  mode: 'preview' | 'execute'
  idempotencyKey: string
  reason: string
  confirmationToken?: string
  approvalRequestId?: string
}

export async function prepareMutation(params: {
  config: AuthenChainMcpConfig
  confirmations: ConfirmationTokenStore
  tool: string
  environment: string
  control: MutationControl
  payload: unknown
}) {
  if (params.config.profile !== 'full') throw new Error('READ_ONLY_PROFILE')
  if (params.config.credentialKind !== 'oauth') throw new Error('HEADLESS_CREDENTIAL_READ_ONLY')
  if (!IDEMPOTENCY_KEY_PATTERN.test(params.control.idempotencyKey)) {
    throw new Error('INVALID_IDEMPOTENCY_KEY')
  }
  if (!params.control.reason.trim()) throw new Error('MUTATION_REASON_REQUIRED')
  const confirmationPayload = {
    operation: params.tool,
    environment: params.environment,
    idempotencyKey: params.control.idempotencyKey,
    reason: params.control.reason.trim(),
    input: params.payload,
  }
  if (params.control.mode === 'preview') {
    if (params.environment === 'production') {
      if (!params.config.mutationApprovalStore) {
        throw new Error('PRODUCTION_HUMAN_APPROVAL_UNAVAILABLE')
      }
      const approval = await params.config.mutationApprovalStore.request({
        tool: params.tool,
        environment: params.environment,
        idempotencyKey: params.control.idempotencyKey,
        reason: params.control.reason.trim(),
        payload: confirmationPayload,
        expiresAt: Date.now() + 5 * 60 * 1_000,
      })
      return {
        execute: false as const,
        preview: {
          operation: params.tool,
          environment: params.environment,
          idempotencyKey: params.control.idempotencyKey,
          reason: params.control.reason.trim(),
          input: params.payload,
          ...approval,
          warning: 'Production execution is blocked until the authenticated user approves this exact request in the AuthenChain dashboard with recent MFA.',
        },
      }
    }
    const issued = await params.confirmations.issue({
      tool: params.tool,
      environment: params.environment,
      payload: confirmationPayload,
    })
    return {
      execute: false as const,
      preview: {
        operation: params.tool,
        environment: params.environment,
        idempotencyKey: params.control.idempotencyKey,
        reason: params.control.reason.trim(),
        input: params.payload,
        confirmationToken: issued.token,
        confirmationExpiresAt: issued.expiresAt,
        warning: params.environment === 'production'
          ? 'This mutation targets production and requires server-side production write opt-in.'
          : 'This mutation targets sandbox.',
      },
    }
  }
  if (params.environment === 'production' && !params.config.allowProductionWrites) {
    throw new Error('PRODUCTION_WRITES_DISABLED')
  }
  if (params.environment === 'production') {
    if (!params.config.mutationApprovalStore) {
      throw new Error('PRODUCTION_HUMAN_APPROVAL_UNAVAILABLE')
    }
    if (!params.control.approvalRequestId) throw new Error('HUMAN_APPROVAL_REQUIRED')
    const claimed = await params.config.mutationApprovalStore.claim({
      approvalRequestId: params.control.approvalRequestId,
      tool: params.tool,
      environment: params.environment,
      idempotencyKey: params.control.idempotencyKey,
      reason: params.control.reason.trim(),
      payload: confirmationPayload,
      now: Date.now(),
    })
    if (!claimed) throw new Error('HUMAN_APPROVAL_INVALID_EXPIRED_OR_USED')
    return { execute: true as const }
  }
  if (!params.control.confirmationToken) throw new Error('CONFIRMATION_REQUIRED')
  await params.confirmations.claim({
    token: params.control.confirmationToken,
    tool: params.tool,
    environment: params.environment,
    payload: confirmationPayload,
  })
  return { execute: true as const }
}
