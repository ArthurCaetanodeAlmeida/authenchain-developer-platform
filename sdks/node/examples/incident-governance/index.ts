import { AuthenChain, buildIncidentGovernanceWebhookMetadata } from '@authenchain/node'

const authenchainApiKey = process.env.AUTHENCHAIN_API_KEY

if (!authenchainApiKey) {
  throw new Error('AUTHENCHAIN_API_KEY is required')
}

const ac = new AuthenChain({
  apiKey: authenchainApiKey,
  baseUrl: process.env.AUTHENCHAIN_BASE_URL ?? 'https://api.authenchain.com',
  timeoutMs: 10_000,
})

async function main() {
  const incident = await ac.createRegulatoryIncident({
    title: 'Support response disclosure evidence missing',
    safeSummary: 'A production support response was signed without the expected disclosure evidence hash.',
    source: 'api_submission',
    severity: 'high',
    priority: 'high',
    affectedGroups: ['customers'],
    detectedAt: '2026-05-30T12:00:00.000Z',
    becameKnownAt: '2026-05-30T12:05:00.000Z',
    policyVersionRefs: ['incident-policy-2026-05'],
  })

  await ac.linkRegulatoryIncidentEvidence({
    incidentId: incident.incident.id,
    linkType: 'signed_output',
    signedEventId: 'signed_event_123',
    evidenceHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    verificationStatusAtLinkTime: 'verified',
    linkReason: 'Connect incident to signed output evidence.',
  })

  await ac.transitionRegulatoryIncident({
    incidentId: incident.incident.id,
    operation: 'start_investigation',
    ownerTeam: 'AI Governance',
    reason: 'Investigation started by platform automation.',
  })

  await ac.createRegulatoryIncidentCorrectiveAction({
    incidentId: incident.incident.id,
    actionType: 'disclosure_change',
    ownerUserId: 'user_123',
    targetDate: '2026-06-05T12:00:00.000Z',
    actionSummary: 'Require disclosure binding before support response signing.',
    verificationMethod: 'Verify future signed events include disclosureBindingHash.',
  })

  const evidencePack = await ac.exportRegulatoryIncidentEvidencePack({
    id: incident.incident.id,
  })

  const webhookMetadata = buildIncidentGovernanceWebhookMetadata({
    eventType: 'incident.created',
    incidentId: incident.incident.id,
    workspaceId: incident.incident.workspaceId ?? null,
    incidentHash: incident.incident.incidentHash ?? null,
    severity: incident.incident.severity,
    status: incident.incident.status,
    occurredAt: incident.incident.createdAt ?? '2026-05-30T12:00:00.000Z',
  })

  console.log(JSON.stringify({
    incidentId: incident.incident.id,
    incidentHash: incident.incident.incidentHash,
    evidencePackSchemaVersion:
      typeof evidencePack.evidencePack === 'object' && evidencePack.evidencePack
        ? (evidencePack.evidencePack as Record<string, unknown>).schemaVersion
        : null,
    webhookMetadata,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
