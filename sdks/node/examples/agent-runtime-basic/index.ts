import { AuthenChain } from '@authenchain/node'

const authenchainApiKey = process.env.AUTHENCHAIN_API_KEY

if (!authenchainApiKey) {
  throw new Error('AUTHENCHAIN_API_KEY is required')
}

const ac = new AuthenChain({
  apiKey: authenchainApiKey,
  baseUrl: process.env.AUTHENCHAIN_BASE_URL,
  timeoutMs: 10_000,
})

type ToolResult = {
  name: string
  summary: string
}

async function loadAccountProfile(customerId: string): Promise<ToolResult> {
  return {
    name: 'account-profile',
    summary: `Customer ${customerId} is on the enterprise plan with premium support enabled.`,
  }
}

async function loadRecentCaseHistory(customerId: string): Promise<ToolResult> {
  return {
    name: 'case-history',
    summary: `Customer ${customerId} had one latency incident in the last 30 days and no unresolved security escalations.`,
  }
}

async function main() {
  const customerId = 'cust_enterprise_42'
  const toolResults = await Promise.all([
    loadAccountProfile(customerId),
    loadRecentCaseHistory(customerId),
  ])

  const run = await ac.wrapGeneration({
    issuer: 'agent-runtime-demo',
    model: 'custom-agent-runtime-v1',
    requestId: 'demo-agent-runtime',
    correlationId: 'partner-poc-agent-runtime',
    generateMetadataDefaults: true,
    extra: {
      pipeline: 'customer-success-agent',
      source: 'custom-agent-runtime',
      notes: `Demo tenant: demo_enterprise; tool count: ${toolResults.length}`,
    },
    generate: async () => {
      const output = [
        'Customer support summary:',
        ...toolResults.map((result) => `- ${result.name}: ${result.summary}`),
        'Recommended action: route the account to the reliability specialist and attach the provenance record to the CRM note.',
      ].join('\n')

      return {
        output,
        model: 'custom-agent-runtime-v1',
        provider: 'custom-agent-runtime',
        raw: { toolResults },
      }
    },
  })

  const verification = await ac.verify({
    content: run.output,
    provenance: run.provenance,
    requestId: 'demo-agent-runtime-verify',
    correlationId: 'partner-poc-agent-runtime',
  })

  console.log(
    JSON.stringify(
      {
        output: run.output,
        traceId: run.provenance.traceId,
        signature: run.provenance.signature,
        verified: verification.verified,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
