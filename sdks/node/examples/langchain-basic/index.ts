import { HumanMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
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

const model = new ChatOpenAI({
  apiKey: openaiApiKey,
  model: 'gpt-4.1-mini',
  temperature: 0.2,
})

function normalizeLangChainContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  return JSON.stringify(content)
}

async function main() {
  const run = await ac.wrapGeneration({
    issuer: 'langchain-basic-demo',
    model: 'gpt-4.1-mini',
    requestId: 'demo-langchain-basic',
    correlationId: 'partner-poc-langchain-basic',
    generateMetadataDefaults: true,
    extra: {
      pipeline: 'langchain_summary_demo',
      source: 'langchain',
      notes: 'Demo tenant: demo_enterprise; chain: single-invoke',
    },
    generate: async () => {
      const response = await model.invoke([
        new HumanMessage('Explain in two sentences how provenance helps enterprises trust LLM outputs.'),
      ])

      return {
        output: normalizeLangChainContent(response.content),
        model: 'gpt-4.1-mini',
        provider: 'langchain',
        raw: response,
      }
    },
  })

  const verification = await ac.verify({
    content: run.output,
    provenance: run.provenance,
    requestId: 'demo-langchain-basic-verify',
    correlationId: 'partner-poc-langchain-basic',
  })

  console.log(
    JSON.stringify(
      {
        output: run.output,
        traceId: run.provenance.traceId,
        publicKeyId: run.provenance.publicKeyId,
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
