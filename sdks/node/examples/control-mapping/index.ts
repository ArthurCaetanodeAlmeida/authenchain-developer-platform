import { AuthenChain } from '@authenchain/node'

const authenchainApiKey = process.env.AUTHENCHAIN_API_KEY

if (!authenchainApiKey) {
  throw new Error('AUTHENCHAIN_API_KEY is required')
}

const ac = new AuthenChain({
  apiKey: authenchainApiKey,
  baseUrl: process.env.AUTHENCHAIN_BASE_URL ?? 'https://api.authenchain.com',
  timeoutMs: 10_000,
})

const periodStart = '2026-05-01T00:00:00.000Z'
const periodEnd = '2026-05-31T23:59:59.999Z'

async function main() {
  const frameworks = await ac.listControlFrameworks()
  const euArticle50Controls = await ac.listControlRequirements({
    frameworkId: 'eu_ai_act',
    q: 'Article 50',
  })
  const nistGovernControls = await ac.listControlRequirements({
    frameworkId: 'nist_ai_rmf',
    q: 'GOVERN',
  })

  const euPreview = await ac.previewControlMapping({
    frameworkIds: ['eu_ai_act'],
    jurisdiction: 'EU',
    aiSystemId: 'support-copilot',
    modelVersionId: 'gpt-4.1-2026-05',
    environment: 'production',
    periodStart,
    periodEnd,
    sourceRecords: [
      {
        evidenceType: 'disclosure_notice',
        record: {
          evidenceHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          safeSummary: 'Published AI disclosure notice hash for customer support assistant.',
        },
      },
    ],
  })

  const snapshot = await ac.generateControlMappingSnapshot({
    frameworkIds: ['eu_ai_act', 'nist_ai_rmf'],
    jurisdiction: 'CROSS_FRAMEWORK',
    aiSystemId: 'support-copilot',
    modelVersionId: 'gpt-4.1-2026-05',
    environment: 'production',
    periodStart,
    periodEnd,
    sourceRecords: [
      {
        evidenceType: 'disclosure_notice',
        record: {
          evidenceHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          safeSummary: 'Published disclosure notice hash.',
        },
      },
      {
        evidenceType: 'audit_explorer_event',
        record: {
          evidenceHash: 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
          safeSummary: 'Governance event hash for monthly evidence review.',
        },
      },
    ],
  })

  const fetched = await ac.getControlMappingSnapshot({
    snapshotId: snapshot.snapshot.id,
  })
  const maturity = await ac.getControlMappingMaturity({
    snapshotId: snapshot.snapshot.id,
  })
  const evidencePackSection = await ac.exportControlMappingEvidencePackSection({
    snapshotId: snapshot.snapshot.id,
    shareMode: 'auditor_package',
  })

  console.log(JSON.stringify({
    frameworkCount: frameworks.frameworks.length,
    euArticle50ControlIds: euArticle50Controls.controls.map((control) => control.controlId),
    nistSummaryControlIds: nistGovernControls.controls.map((control) => control.controlId),
    euPreviewScopeHash: euPreview.preview.scopeHash,
    snapshotId: fetched.snapshot.id,
    snapshotHash: fetched.snapshot.snapshotHash,
    maturityScores: maturity.maturity.maturityScores,
    evidencePackSectionId: evidencePackSection.section.sectionId,
    legalCompliance: 'not_determined',
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
