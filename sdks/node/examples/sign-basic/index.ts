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

async function main() {
  const provenance = await ac.sign({
    content: 'This answer was generated inside a backend workflow.',
    requestId: 'demo-sign-basic',
    correlationId: 'partner-poc-sign-basic',
    generateMetadataDefaults: true,
    metadata: {
      issuer: 'sign-basic-demo',
      model: 'backend-pipeline-v1',
      extra: {
        pipeline: 'document-processing',
        source: 'server-backend',
        notes: 'Demo document id: doc_123',
      },
    },
  })

  console.log(
    JSON.stringify(
      {
        traceId: provenance.traceId,
        contentHash: provenance.contentHash,
        signature: provenance.signature,
        publicKeyId: provenance.publicKeyId,
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
