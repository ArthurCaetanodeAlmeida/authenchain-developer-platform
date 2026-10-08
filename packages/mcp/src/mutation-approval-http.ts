import type { MutationApprovalStore } from './config.js'

type HttpApprovalStoreOptions = {
  baseUrl: string
  accessToken: string
  timeoutMs: number
}

async function approvalRequest<T>(options: HttpApprovalStoreOptions, body: Record<string, unknown>) {
  const response = await fetch(new URL('/api/mcp/mutation-approvals', options.baseUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs),
  })
  const payload = await response.json().catch(() => null) as (T & { code?: string }) | null
  if (!response.ok || !payload) {
    throw new Error(payload?.code || `MUTATION_APPROVAL_HTTP_${response.status}`)
  }
  return payload
}

export function createHttpMutationApprovalStore(options: HttpApprovalStoreOptions): MutationApprovalStore {
  return {
    async request(params) {
      const result = await approvalRequest<{
        approvalRequestId: string
        approvalUrl: string
        expiresAt: string
      }>(options, { action: 'request', ...params })
      return {
        approvalRequestId: result.approvalRequestId,
        approvalUrl: result.approvalUrl,
        expiresAt: result.expiresAt,
      }
    },
    async claim(params) {
      const result = await approvalRequest<{ claimed: boolean }>(options, { action: 'claim', ...params })
      return result.claimed === true
    },
  }
}
