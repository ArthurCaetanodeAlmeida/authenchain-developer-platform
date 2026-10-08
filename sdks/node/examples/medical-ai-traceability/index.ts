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
  encounterId: 'synthetic-encounter-001',
  workflow: 'post_visit_summary_draft',
  policyVersion: 'clinical-ai-review-policy-v1',
}

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'EU',
  regulatory_context: ['eu_ai_act_high_risk_support', 'medical_ai_traceability'],
  content_type: 'text',
  model_provider: 'internal',
  model_name: 'clinical-summary-assistant',
  model_version: '2026-05-01',
  system_purpose: 'clinical_summary_drafting',
  risk_context: 'high',
  human_reviewed: true,
  reviewer_role: 'licensed_clinician',
  review_timestamp: new Date().toISOString(),
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'human_visible',
  policy_version: sampleInput.policyVersion,
}

async function main() {
  const output = [
    'Synthetic clinical summary draft: patient reported improved sleep and mild residual cough.',
    'Clinician review is required before this text is used in a care record or patient communication.',
  ].join(' ')

  const captured = await ac.captureRegulatedOutput({
    output,
    issuer: 'clinical-summary-service',
    content_type: 'text',
    model: regulatory.model_name,
    user_ref: sampleInput.encounterId,
    regulatory,
    extra: {
      useCase: 'medical_ai_traceability',
      sampleInput,
      source: 'node-sdk-example',
    },
    generateMetadataDefaults: true,
    idempotencyKey: `medical-ai-traceability:${sampleInput.encounterId}`,
    requestId: 'example-medical-ai-traceability-capture',
    correlationId: 'example-regulatory-dx',
  })

  const verification = await ac.verifyRegulatoryEvidence({
    content: output,
    provenance: captured.provenance,
    requestId: 'example-medical-ai-traceability-verify',
    correlationId: 'example-regulatory-dx',
  })

  const tamperedVerification = await ac.verifyRegulatoryEvidence({
    content: `${output} Tampered diagnosis: urgent condition confirmed.`,
    provenance: captured.provenance,
    requestId: 'example-medical-ai-traceability-tamper',
    correlationId: 'example-regulatory-dx',
  })

  let evidencePackSummary = null
  try {
    const evidencePack = await ac.exportEvidencePack({
      traceId: captured.provenance.traceId,
      requestId: 'example-medical-ai-traceability-evidence-pack',
      correlationId: 'example-regulatory-dx',
    })
    evidencePackSummary = summarizeRegulatoryEvidencePack(evidencePack)
  } catch {
    evidencePackSummary = { status: 'not_available_in_this_environment' }
  }

  console.log(JSON.stringify({
    useCase: 'medical_ai_traceability',
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
