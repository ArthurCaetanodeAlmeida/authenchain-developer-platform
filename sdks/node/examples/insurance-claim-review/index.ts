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
  claimId: 'synthetic-claim-001',
  claimType: 'property_damage',
  policyVersion: 'insurance-review-policy-v1',
}

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'EU',
  regulatory_context: ['eu_ai_act_high_risk_support', 'insurance_claim_review'],
  content_type: 'json',
  model_provider: 'internal',
  model_name: 'claim-review-assistant',
  model_version: '2026-05-01',
  system_purpose: 'insurance_claim_review_support',
  risk_context: 'high',
  human_reviewed: true,
  reviewer_role: 'claims_reviewer',
  review_timestamp: new Date().toISOString(),
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'both',
  policy_version: sampleInput.policyVersion,
}

async function main() {
  const output = {
    summary: 'Synthetic claim review suggests requesting additional repair documentation.',
    recommendation: 'manual_review_required',
    evidenceNotes: ['No final coverage decision is made by this AI output.'],
  }
  const serializedOutput = JSON.stringify(output)

  const captured = await ac.captureRegulatedOutput({
    output,
    issuer: 'insurance-claim-review-service',
    content_type: 'text',
    model: regulatory.model_name,
    user_ref: sampleInput.claimId,
    regulatory,
    extra: {
      useCase: 'insurance_claim_review',
      sampleInput,
      source: 'node-sdk-example',
    },
    generateMetadataDefaults: true,
    idempotencyKey: `insurance-claim-review:${sampleInput.claimId}`,
    requestId: 'example-insurance-claim-review-capture',
    correlationId: 'example-regulatory-dx',
  })

  const verification = await ac.verifyRegulatoryEvidence({
    content: serializedOutput,
    provenance: captured.provenance,
    requestId: 'example-insurance-claim-review-verify',
    correlationId: 'example-regulatory-dx',
  })

  const tamperedVerification = await ac.verifyRegulatoryEvidence({
    content: JSON.stringify({
      ...output,
      recommendation: 'automatic_denial',
      tamperNote: 'Tampered recommendation added after signing.',
    }),
    provenance: captured.provenance,
    requestId: 'example-insurance-claim-review-tamper',
    correlationId: 'example-regulatory-dx',
  })

  let evidencePackSummary = null
  try {
    const evidencePack = await ac.exportEvidencePack({
      traceId: captured.provenance.traceId,
      requestId: 'example-insurance-claim-review-evidence-pack',
      correlationId: 'example-regulatory-dx',
    })
    evidencePackSummary = summarizeRegulatoryEvidencePack(evidencePack)
  } catch {
    evidencePackSummary = { status: 'not_available_in_this_environment' }
  }

  console.log(JSON.stringify({
    useCase: 'insurance_claim_review',
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
