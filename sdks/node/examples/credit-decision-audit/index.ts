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
  applicationId: 'synthetic-credit-application-001',
  requestedAmountUsd: 12_500,
  syntheticApplicantSegment: 'thin_file',
  policyVersion: 'credit-risk-policy-v1',
}

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'EU',
  regulatory_context: ['eu_ai_act_high_risk_support', 'credit_decision_audit'],
  content_type: 'text',
  model_provider: 'internal',
  model_name: 'credit-decision-assistant',
  model_version: '2026-05-01',
  system_purpose: 'credit_decision_support',
  risk_context: 'high',
  human_reviewed: true,
  reviewer_role: 'credit_risk_reviewer',
  review_timestamp: new Date().toISOString(),
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'human_visible',
  policy_version: sampleInput.policyVersion,
}

async function main() {
  const output = [
    'Synthetic credit review: approve for manual underwriting follow-up.',
    'Primary reasons: stable repayment indicators and incomplete income documentation.',
    'This is decision-support evidence and not a final legal or credit decision.',
  ].join(' ')

  const captured = await ac.captureRegulatedOutput({
    output,
    issuer: 'credit-decision-service',
    content_type: 'text',
    model: regulatory.model_name,
    user_ref: sampleInput.applicationId,
    regulatory,
    extra: {
      useCase: 'credit_decision_audit',
      sampleInput,
      source: 'node-sdk-example',
    },
    generateMetadataDefaults: true,
    idempotencyKey: `credit-decision-audit:${sampleInput.applicationId}`,
    requestId: 'example-credit-decision-audit-capture',
    correlationId: 'example-regulatory-dx',
  })

  const verification = await ac.verifyRegulatoryEvidence({
    content: output,
    provenance: captured.provenance,
    requestId: 'example-credit-decision-audit-verify',
    correlationId: 'example-regulatory-dx',
  })

  const tamperedVerification = await ac.verifyRegulatoryEvidence({
    content: `${output} Tampered final decision: automatically approved.`,
    provenance: captured.provenance,
    requestId: 'example-credit-decision-audit-tamper',
    correlationId: 'example-regulatory-dx',
  })

  let evidencePackSummary = null
  try {
    const evidencePack = await ac.exportEvidencePack({
      traceId: captured.provenance.traceId,
      requestId: 'example-credit-decision-audit-evidence-pack',
      correlationId: 'example-regulatory-dx',
    })
    evidencePackSummary = summarizeRegulatoryEvidencePack(evidencePack)
  } catch {
    evidencePackSummary = { status: 'not_available_in_this_environment' }
  }

  console.log(JSON.stringify({
    useCase: 'credit_decision_audit',
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
