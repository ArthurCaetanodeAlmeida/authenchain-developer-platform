import OpenAI from 'openai'
import { AuthenChain } from '@authenchain/node'

const authenchainApiKey = process.env.AUTHENCHAIN_API_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

if (!authenchainApiKey) {
  throw new Error('AUTHENCHAIN_API_KEY is required')
}

if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY is required')
}

const ac = new AuthenChain({
  apiKey: authenchainApiKey,
  baseUrl: process.env.AUTHENCHAIN_BASE_URL,
  timeoutMs: 10_000,
})

const openai = new OpenAI({ apiKey: openaiApiKey })

async function main() {
  const run = await ac.wrapGeneration({
    issuer: 'openai-basic-demo',
    model: 'gpt-4.1-mini',
    requestId: 'demo-openai-basic',
    correlationId: 'partner-poc-openai-basic',
    generateMetadataDefaults: true,
    extra: {
      pipeline: 'sales_assistant_demo',
      prompt_id: 'prompt_demo_sales_summary_v1',
      source: 'openai',
      notes: 'Demo customer id: demo_customer_123',
    },
    generate: async () => {
      const response = await openai.responses.create({
        model: 'gpt-4.1-mini',
        input: 'Write a two-sentence executive summary about why provenance matters for AI outputs.',
      })

      const output = response.output_text.trim()
      if (!output) {
        throw new Error('OpenAI returned an empty output_text')
      }

      return {
        output,
        model: response.model,
        provider: 'openai',
        raw: response,
      }
    },
  })

  const verification = await ac.verify({
    content: run.output,
    provenance: run.provenance,
    requestId: 'demo-openai-basic-verify',
    correlationId: 'partner-poc-openai-basic',
  })

  console.log(
    JSON.stringify(
      {
        output: run.output,
        traceId: run.provenance.traceId,
        signature: run.provenance.signature,
        verified: verification.verified,
        reasonCodes: verification.reasonCodes,
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
