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
  reportId: 'synthetic-agent-report-001',
  agentRunId: 'synthetic-agent-run-001',
  policyVersion: 'agent-report-audit-policy-v1',
}

const regulatory: RegulatoryMetadataV1 = {
  schema_version: 'regulatory.v1',
  ai_generated: true,
  jurisdiction: 'GLOBAL',
  regulatory_context: ['agent_generated_report_audit', 'nist_ai_rmf_govern'],
  content_type: 'document',
  model_provider: 'internal',
  model_name: 'research-agent-orchestrator',
  model_version: '2026-05-01',
  system_purpose: 'agent_generated_report_drafting',
  risk_context: 'limited',
  human_reviewed: true,
  reviewer_role: 'report_owner',
  review_timestamp: new Date().toISOString(),
  disclosure_required: true,
  disclosure_applied: true,
  label_type: 'human_visible',
  policy_version: sampleInput.policyVersion,
}

async function main() {
  const output = [
    'Agent-generated report summary: three source documents were reviewed and two follow-up questions remain open.',
    'The report owner reviewed this draft before circulation.',
  ].join(' ')

  const captured = await ac.captureRegulatedOutput({
    output,
    issuer: 'agent-report-service',
    content_type: 'text',
    model: regulatory.model_name,
    user_ref: sampleInput.reportId,
    regulatory,
    extra: {
      useCase: 'agent_generated_report_audit',
      sampleInput,
      source: 'node-sdk-example',
    },
    generateMetadataDefaults: true,
    idempotencyKey: `agent-generated-report-audit:${sampleInput.reportId}`,
    requestId: 'example-agent-generated-report-audit-capture',
    correlationId: 'example-regulatory-dx',
  })

  const verification = await ac.verifyRegulatoryEvidence({
    content: output,
    provenance: captured.provenance,
    requestId: 'example-agent-generated-report-audit-verify',
    correlationId: 'example-regulatory-dx',
  })

  const tamperedVerification = await ac.verifyRegulatoryEvidence({
    content: `${output} Tampered statement: all source documents were verified as authoritative.`,
    provenance: captured.provenance,
    requestId: 'example-agent-generated-report-audit-tamper',
    correlationId: 'example-regulatory-dx',
  })

  let evidencePackSummary = null
  try {
    const evidencePack = await ac.exportEvidencePack({
      traceId: captured.provenance.traceId,
      requestId: 'example-agent-generated-report-audit-evidence-pack',
      correlationId: 'example-regulatory-dx',
    })
    evidencePackSummary = summarizeRegulatoryEvidencePack(evidencePack)
  } catch {
    evidencePackSummary = { status: 'not_available_in_this_environment' }
  }

  console.log(JSON.stringify({
    useCase: 'agent_generated_report_audit',
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
