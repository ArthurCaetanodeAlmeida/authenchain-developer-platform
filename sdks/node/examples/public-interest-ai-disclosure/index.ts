import { AuthenChain, summarizeRegulatoryEvidencePack, type RegulatoryMetadataV1 } from '@authenchain/node'

const authenchainApiKey = process.env.AUTHENCHAIN_API_KEY

if (!authenchainApiKey) {
  throw new Error('AUTHENCHAIN_API_KEY is required')
}

const ac = new AuthenChain({
  apiKey: authenchainApiKey,
  baseUrl: process.env.AUTHENCHAIN_BASE_URL,
  timeoutMs: 10_000,
})

const sampleInput = {
  publicationId: 'synthetic-public-interest-001',
  channel: 'public_notice',
  policyVersion: 'public-interest-disclosure-policy-v1',
}

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'EU',
  regulatory_context: ['eu_ai_act_article_50', 'public_interest_ai_text_disclosure'],
  content_type: 'text',
  model_provider: 'internal',
  model_name: 'public-notice-drafting-assistant',
  model_version: '2026-05-01',
  system_purpose: 'public_interest_text_drafting',
  risk_context: 'limited',
  human_reviewed: true,
  reviewer_role: 'communications_reviewer',
  review_timestamp: new Date().toISOString(),
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'both',
  policy_version: sampleInput.policyVersion,
}

async function main() {
  const output = [
    'AI-assisted public notice draft: scheduled maintenance may affect access to the online permit portal.',
    'The notice was reviewed before publication and includes an AI-assistance disclosure.',
  ].join(' ')

  const captured = await ac.captureRegulatedOutput({
    output,
    issuer: 'public-interest-content-service',
    content_type: 'text',
    model: regulatory.model_name,
    user_ref: sampleInput.publicationId,
    regulatory,
    extra: {
      useCase: 'public_interest_ai_disclosure',
      sampleInput,
      source: 'node-sdk-example',
    },
    generateMetadataDefaults: true,
    idempotencyKey: `public-interest-ai-disclosure:${sampleInput.publicationId}`,
    requestId: 'example-public-interest-ai-disclosure-capture',
    correlationId: 'example-regulatory-dx',
  })

  const verification = await ac.verifyRegulatoryEvidence({
    content: output,
    provenance: captured.provenance,
    requestId: 'example-public-interest-ai-disclosure-verify',
    correlationId: 'example-regulatory-dx',
  })

  const tamperedVerification = await ac.verifyRegulatoryEvidence({
    content: `${output} Tampered statement: emergency closure is confirmed.`,
    provenance: captured.provenance,
    requestId: 'example-public-interest-ai-disclosure-tamper',
    correlationId: 'example-regulatory-dx',
  })

  let evidencePackSummary = null
  try {
    const evidencePack = await ac.exportEvidencePack({
      traceId: captured.provenance.traceId,
      requestId: 'example-public-interest-ai-disclosure-evidence-pack',
      correlationId: 'example-regulatory-dx',
    })
    evidencePackSummary = summarizeRegulatoryEvidencePack(evidencePack)
  } catch {
    evidencePackSummary = { status: 'not_available_in_this_environment' }
  }

  console.log(JSON.stringify({
    useCase: 'public_interest_ai_disclosure',
    traceId: captured.provenance.traceId,
    regulatoryStatus: verification.regulatoryEvidenceStatus,
    legalCompliance: verification.legalCompliance,
    verified: verification.provenanceVerified,
    tamperedVerified: tamperedVerification.provenanceVerified,
    tamperFailures: tamperedVerification.failures,
    evidencePackSummary,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
