import { createHash } from 'node:crypto'
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

function sha256(value: string) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

async function main() {
  const noticeText = 'This chat response is generated with AI and may be reviewed by a human.'
  const notice = await ac.createDisclosureNoticeSnapshot({
    templateKey: 'web-chat-ai-disclosure',
    templateVersion: 'v1',
    status: 'draft',
    noticeText,
    noticeTextHash: sha256(noticeText),
    noticeLocale: 'en-US',
    noticeChannel: 'web',
    noticePlacement: 'pre_interaction',
    noticeDisplayMode: 'banner',
    publicSafeText: true,
    policyVersionRefs: ['ai-transparency-policy-2026-05'],
    reason: 'developer_example',
  })

  const signed = await ac.signWithDisclosureEvidence({
    contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    generateMetadataDefaults: true,
    metadata: {
      issuer: 'disclosure-transparency-example',
      content_type: 'text',
    },
    disclosure: {
      enforcementMode: 'warn',
      policyPresetKey: 'eu-ai-act-article-50-ready',
      jurisdiction: 'EU',
      contentType: 'text',
      interactionMode: 'web_chat',
      outputContext: 'customer_support',
      userInformed: true,
      userInformedAt: '2026-05-30T12:00:00.000Z',
      noticeTemplateId: notice.notice.id,
      noticeTemplateVersion: notice.notice.templateVersion,
      noticeTextHash: notice.notice.noticeTextHash,
      noticeLocale: 'en-US',
      noticeChannel: 'web',
      noticePlacement: 'pre_interaction',
      noticeDisplayMode: 'banner',
      aiGeneratedOutput: true,
      syntheticContentStatus: 'synthetic',
      syntheticContentTypes: ['text'],
      markingApplied: true,
      markingTypes: ['metadata_tag'],
      contentCredentialStandard: 'none',
      evidenceArtifactHashes: [
        sha256('web-chat-banner-component:v3:pre-interaction'),
      ],
    },
  })

  const application = await ac.recordDisclosureApplication({
    noticeTemplateId: notice.notice.id,
    signedEventId: signed.traceId,
    userInformed: true,
    userInformedAt: '2026-05-30T12:00:00.000Z',
    noticeTextHash: notice.notice.noticeTextHash,
    noticeTemplateVersion: notice.notice.templateVersion,
    noticeLocale: 'en-US',
    noticeChannel: 'web',
    noticePlacement: 'pre_interaction',
    noticeDisplayMode: 'banner',
    evidenceArtifactHashes: [
      sha256('web-chat-banner-component:v3:pre-interaction'),
    ],
  })

  const apiHeaderEvidenceHash = sha256('X-AI-Disclosure: ai-generated; notice=web-chat-ai-disclosure@v1')
  await ac.recordSyntheticContentDeclaration({
    disclosureApplicationId: application.application.id,
    signedEventId: signed.traceId,
    aiGeneratedOutput: true,
    syntheticContentStatus: 'synthetic',
    syntheticContentTypes: ['text', 'image'],
    declarationBasis: 'provider_metadata',
    humanEdited: false,
    sourceSystem: 'customer-support-generator',
    contentEvidenceHash: signed.contentHash ? `sha256:${signed.contentHash}` : undefined,
    declaredAt: '2026-05-30T12:00:01.000Z',
  })

  await ac.recordContentMarking({
    disclosureApplicationId: application.application.id,
    signedEventId: signed.traceId,
    markingApplied: true,
    markingTypes: ['visible_label', 'content_credential'],
    markingEvidenceTypes: ['response_header', 'screenshot_hash', 'content_credential_manifest'],
    visibleLabelText: 'AI-generated image',
    visibleLabelPublicSafe: true,
    visibleLabelTextHash: sha256('AI-generated image'),
    contentCredentialStandard: 'c2pa',
    contentCredentialReferenceHash: sha256('c2pa-manifest-uri-or-id-after-customer-side-redaction'),
    visualEvidenceArtifactHash: sha256('redacted-synthetic-image-label-screenshot'),
    technicalEvidenceHashes: [apiHeaderEvidenceHash],
    customerAssertionBasis: 'Customer generated a visible label and hash-only content credential reference.',
    markedAt: '2026-05-30T12:00:02.000Z',
  })

  console.log(JSON.stringify({
    traceId: signed.traceId,
    contentHash: signed.contentHash,
    noticeTemplateId: notice.notice.id,
    disclosureApplicationId: application.application.id,
    productionDefaultBaseUrl: 'https://api.authenchain.com',
    localDevelopmentBaseUrl: 'http://localhost:3000',
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
