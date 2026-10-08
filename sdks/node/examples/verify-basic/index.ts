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
    content: 'Verifiable output example',
    requestId: 'demo-verify-basic-sign',
    correlationId: 'partner-poc-verify-basic',
    generateMetadataDefaults: true,
    metadata: {
      issuer: 'verify-basic-demo',
      model: 'verification-demo-v1',
      extra: {
        pipeline: 'trust-check',
        source: 'demo-script',
      },
    },
  })

  const verification = await ac.verify({
    content: 'Verifiable output example',
    provenance,
    requestId: 'demo-verify-basic',
    correlationId: 'partner-poc-verify-basic',
  })

  console.log(
    JSON.stringify(
      {
        traceId: verification.traceId,
        verified: verification.verified,
        integrity: verification.integrity,
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
