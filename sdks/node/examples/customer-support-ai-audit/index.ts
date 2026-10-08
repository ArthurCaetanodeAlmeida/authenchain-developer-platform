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
  ticketId: 'synthetic-ticket-001',
  channel: 'web_chat',
  policyVersion: 'support-ai-disclosure-policy-v1',
}

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'EU',
  regulatory_context: ['eu_ai_act_article_50', 'customer_support_ai_audit'],
  content_type: 'text',
  model_provider: 'openai',
  model_name: 'gpt-4.1-mini',
  system_purpose: 'customer_support_response',
  risk_context: 'limited',
  human_reviewed: false,
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'human_visible',
  policy_version: sampleInput.policyVersion,
}

async function main() {
  const output = [
    'AI-assisted response: your replacement request has been received.',
    'A support specialist may review the case if additional account verification is needed.',
  ].join(' ')

  const captured = await ac.captureRegulatedOutput({
    output,
    issuer: 'customer-support-service',
    content_type: 'text',
    model: regulatory.model_name,
    user_ref: sampleInput.ticketId,
    regulatory,
    extra: {
      useCase: 'customer_support_ai_audit',
      sampleInput,
      source: 'node-sdk-example',
    },
    generateMetadataDefaults: true,
    idempotencyKey: `customer-support-ai-audit:${sampleInput.ticketId}`,
    requestId: 'example-customer-support-ai-audit-capture',
    correlationId: 'example-regulatory-dx',
  })

  const verification = await ac.verifyRegulatoryEvidence({
    content: output,
    provenance: captured.provenance,
    requestId: 'example-customer-support-ai-audit-verify',
    correlationId: 'example-regulatory-dx',
  })

  const tamperedVerification = await ac.verifyRegulatoryEvidence({
    content: `${output} Tampered statement: refund guaranteed today.`,
    provenance: captured.provenance,
    requestId: 'example-customer-support-ai-audit-tamper',
    correlationId: 'example-regulatory-dx',
  })

  let evidencePackSummary = null
  try {
    const evidencePack = await ac.exportEvidencePack({
      traceId: captured.provenance.traceId,
      requestId: 'example-customer-support-ai-audit-evidence-pack',
      correlationId: 'example-regulatory-dx',
    })
    evidencePackSummary = summarizeRegulatoryEvidencePack(evidencePack)
  } catch {
    evidencePackSummary = { status: 'not_available_in_this_environment' }
  }

  console.log(JSON.stringify({
    useCase: 'customer_support_ai_audit',
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
