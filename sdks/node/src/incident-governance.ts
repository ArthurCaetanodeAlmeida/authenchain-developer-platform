import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys, ensureResponseObject } from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  CreateRegulatoryIncidentCorrectiveActionInput,
  CreateRegulatoryIncidentCorrectiveActionResponse,
  CreateRegulatoryIncidentInput,
  CreateRegulatoryIncidentResponse,
  ExportRegulatoryIncidentEvidencePackInput,
  ExportRegulatoryIncidentEvidencePackResponse,
  GenerateRegulatoryIncidentRecurrenceReportInput,
  GenerateRegulatoryIncidentRecurrenceReportResponse,
  GetRegulatoryIncidentInput,
  GetRegulatoryIncidentResponse,
  IncidentGovernanceWebhookMetadata,
  IncidentGovernanceWebhookMetadataInput,
  LinkRegulatoryIncidentEvidenceInput,
  LinkRegulatoryIncidentEvidenceResponse,
  ListRegulatoryEvidenceFailureAlertsInput,
  ListRegulatoryEvidenceFailureAlertsResponse,
  ListRegulatoryIncidentsInput,
  ListRegulatoryIncidentsResponse,
  TransitionRegulatoryIncidentInput,
  TransitionRegulatoryIncidentResponse,
  UpdateRegulatoryIncidentTriageInput,
  UpdateRegulatoryIncidentTriageResponse,
  VerifyRegulatoryIncidentCorrectiveActionInput,
  VerifyRegulatoryIncidentCorrectiveActionResponse,
} from './types.js'

const OPERATION_KEYS = ['idempotencyKey', 'requestId', 'correlationId'] as const

const LIST_INCIDENTS_KEYS = [
  'workspaceId',
  'status',
  'severity',
  'priority',
  'source',
  'q',
  'page',
  'pageSize',
  ...OPERATION_KEYS,
] as const

const CREATE_INCIDENT_KEYS = [
  'source',
  'workspaceId',
  'incidentId',
  'incidentKey',
  'title',
  'safeSummary',
  'severity',
  'priority',
  'affectedGroups',
  'detectedAt',
  'becameKnownAt',
  'ownerUserId',
  'ownerTeam',
  'policyVersionRefs',
  'internalNotes',
  'outputHash',
  'evidenceFailureHash',
  'modelVersionHash',
  'deploymentHash',
  ...OPERATION_KEYS,
] as const

const GET_INCIDENT_KEYS = ['id', ...OPERATION_KEYS] as const

const UPDATE_TRIAGE_KEYS = [
  'id',
  'title',
  'safeSummary',
  'severity',
  'priority',
  'regulatoryReportingStatus',
  'ownerTeam',
  'policyVersionRefs',
  'internalNotes',
  'reason',
  ...OPERATION_KEYS,
] as const

const LINK_EVIDENCE_KEYS = [
  'incidentId',
  'workspaceId',
  'linkType',
  'sourceRecordId',
  'sourceRecordHash',
  'evidenceHash',
  'verificationStatusAtLinkTime',
  'linkReason',
  'linkedAt',
  'requestLogId',
  'provenanceEventId',
  'signedEventId',
  'evidencePackHash',
  'aiSystemId',
  'aiModelVersionId',
  'aiModelVersionHash',
  'aiModelDeploymentId',
  'aiModelDeploymentHash',
  'riskClassificationId',
  'riskClassificationHash',
  'impactAssessmentId',
  'impactAssessmentHash',
  'disclosureBindingId',
  'disclosureBindingHash',
  'reviewerStatementId',
  'reviewerStatementHash',
  'monthlyReportId',
  'monthlyReportHash',
  'deliveryPackageId',
  'deliveryPackageHash',
  'rawArtifactUrl',
  'endpointUrl',
  ...OPERATION_KEYS,
] as const

const TRANSITION_KEYS = [
  'incidentId',
  'status',
  'operation',
  'ownerTeam',
  'evidenceRequestSummary',
  'mitigationEvidenceHash',
  'reportingStatus',
  'customerReportingMetadataHash',
  'closureReason',
  'investigationSummaryHash',
  'correctiveActionReviewHash',
  'reopenReason',
  'reason',
  ...OPERATION_KEYS,
] as const

const CREATE_CORRECTIVE_ACTION_KEYS = [
  'incidentId',
  'workspaceId',
  'actionType',
  'ownerUserId',
  'targetDate',
  'actionSummary',
  'verificationMethod',
  'evidenceReferences',
  'approverUserId',
  'status',
  'reason',
  ...OPERATION_KEYS,
] as const

const VERIFY_CORRECTIVE_ACTION_KEYS = [
  'incidentId',
  'correctiveActionId',
  'status',
  'evidenceReference',
  'customerWaiverHash',
  'reason',
  ...OPERATION_KEYS,
] as const

const LIST_ALERTS_KEYS = [
  'workspaceId',
  'status',
  'incidentId',
  'page',
  'pageSize',
  ...OPERATION_KEYS,
] as const

const GENERATE_RECURRENCE_KEYS = [
  'workspaceId',
  'reportPeriodStart',
  'reportPeriodEnd',
  'minRepeatCount',
  ...OPERATION_KEYS,
] as const

const WEBHOOK_METADATA_KEYS = [
  'eventType',
  'incidentId',
  'workspaceId',
  'incidentHash',
  'severity',
  'previousSeverity',
  'status',
  'deadlineId',
  'alertId',
  'correctiveActionId',
  'evidenceHash',
  'occurredAt',
  ...OPERATION_KEYS,
] as const

function validateResponse<T>(endpoint: string) {
  return (payload: unknown, response: Response) =>
    ensureResponseObject(payload, { endpoint, status: response.status, headers: response.headers }) as T
}

function requireStringId(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new AuthenChainValidationError({
      message: `${field} must be a non-empty string`,
      code: 'INVALID_INCIDENT_GOVERNANCE_INPUT',
      details: { field },
    })
  }
  return value.trim()
}

function omitOperationKeys<T extends Record<string, unknown>>(input: T) {
  const {
    idempotencyKey: _idempotencyKey,
    requestId: _requestId,
    correlationId: _correlationId,
    ...body
  } = input
  return body
}

function omitIncidentId<T extends Record<string, unknown>>(input: T) {
  const { incidentId: _incidentId, ...body } = omitOperationKeys(input)
  return body
}

function omitId<T extends Record<string, unknown>>(input: T) {
  const { id: _id, ...body } = omitOperationKeys(input)
  return body
}

export async function listRegulatoryIncidents(
  client: AuthenChainHttpClient,
  input: ListRegulatoryIncidentsInput = {},
): Promise<ListRegulatoryIncidentsResponse> {
  assertNoUnknownKeys(input, LIST_INCIDENTS_KEYS, 'AuthenChain.listRegulatoryIncidents input', client.strictInputValidation)
  const endpoint = '/api/regulatory/incidents'
  const { data } = await client.get<ListRegulatoryIncidentsResponse>(
    endpoint,
    {
      workspaceId: input.workspaceId,
      status: input.status,
      severity: input.severity,
      priority: input.priority,
      source: input.source,
      q: input.q,
      page: input.page,
      pageSize: input.pageSize,
    },
    input,
    validateResponse<ListRegulatoryIncidentsResponse>(endpoint),
  )
  return data
}

export async function createRegulatoryIncident(
  client: AuthenChainHttpClient,
  input: CreateRegulatoryIncidentInput,
): Promise<CreateRegulatoryIncidentResponse> {
  assertNoUnknownKeys(input, CREATE_INCIDENT_KEYS, 'AuthenChain.createRegulatoryIncident input', client.strictInputValidation)
  const endpoint = '/api/regulatory/incidents'
  const { data } = await client.post<CreateRegulatoryIncidentResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<CreateRegulatoryIncidentResponse>(endpoint),
  )
  return data
}

export async function getRegulatoryIncident(
  client: AuthenChainHttpClient,
  input: GetRegulatoryIncidentInput,
): Promise<GetRegulatoryIncidentResponse> {
  assertNoUnknownKeys(input, GET_INCIDENT_KEYS, 'AuthenChain.getRegulatoryIncident input', client.strictInputValidation)
  const incidentId = requireStringId(input.id, 'id')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}`
  const { data } = await client.get<GetRegulatoryIncidentResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<GetRegulatoryIncidentResponse>(endpoint),
  )
  return data
}

export async function updateRegulatoryIncidentTriage(
  client: AuthenChainHttpClient,
  input: UpdateRegulatoryIncidentTriageInput,
): Promise<UpdateRegulatoryIncidentTriageResponse> {
  assertNoUnknownKeys(input, UPDATE_TRIAGE_KEYS, 'AuthenChain.updateRegulatoryIncidentTriage input', client.strictInputValidation)
  const incidentId = requireStringId(input.id, 'id')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}`
  const { data } = await client.patch<UpdateRegulatoryIncidentTriageResponse>(
    endpoint,
    omitId(input as unknown as Record<string, unknown>),
    input,
    validateResponse<UpdateRegulatoryIncidentTriageResponse>(endpoint),
  )
  return data
}

export async function linkRegulatoryIncidentEvidence(
  client: AuthenChainHttpClient,
  input: LinkRegulatoryIncidentEvidenceInput,
): Promise<LinkRegulatoryIncidentEvidenceResponse> {
  assertNoUnknownKeys(input, LINK_EVIDENCE_KEYS, 'AuthenChain.linkRegulatoryIncidentEvidence input', client.strictInputValidation)
  const incidentId = requireStringId(input.incidentId, 'incidentId')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}/evidence-links`
  const { data } = await client.post<LinkRegulatoryIncidentEvidenceResponse>(
    endpoint,
    omitIncidentId(input as unknown as Record<string, unknown>),
    input,
    validateResponse<LinkRegulatoryIncidentEvidenceResponse>(endpoint),
  )
  return data
}

export async function transitionRegulatoryIncident(
  client: AuthenChainHttpClient,
  input: TransitionRegulatoryIncidentInput,
): Promise<TransitionRegulatoryIncidentResponse> {
  assertNoUnknownKeys(input, TRANSITION_KEYS, 'AuthenChain.transitionRegulatoryIncident input', client.strictInputValidation)
  const incidentId = requireStringId(input.incidentId, 'incidentId')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}/status`
  const { data } = await client.post<TransitionRegulatoryIncidentResponse>(
    endpoint,
    omitIncidentId(input as unknown as Record<string, unknown>),
    input,
    validateResponse<TransitionRegulatoryIncidentResponse>(endpoint),
  )
  return data
}

export async function createRegulatoryIncidentCorrectiveAction(
  client: AuthenChainHttpClient,
  input: CreateRegulatoryIncidentCorrectiveActionInput,
): Promise<CreateRegulatoryIncidentCorrectiveActionResponse> {
  assertNoUnknownKeys(input, CREATE_CORRECTIVE_ACTION_KEYS, 'AuthenChain.createRegulatoryIncidentCorrectiveAction input', client.strictInputValidation)
  const incidentId = requireStringId(input.incidentId, 'incidentId')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}/corrective-actions`
  const { data } = await client.post<CreateRegulatoryIncidentCorrectiveActionResponse>(
    endpoint,
    omitIncidentId(input as unknown as Record<string, unknown>),
    input,
    validateResponse<CreateRegulatoryIncidentCorrectiveActionResponse>(endpoint),
  )
  return data
}

export async function verifyRegulatoryIncidentCorrectiveAction(
  client: AuthenChainHttpClient,
  input: VerifyRegulatoryIncidentCorrectiveActionInput,
): Promise<VerifyRegulatoryIncidentCorrectiveActionResponse> {
  assertNoUnknownKeys(input, VERIFY_CORRECTIVE_ACTION_KEYS, 'AuthenChain.verifyRegulatoryIncidentCorrectiveAction input', client.strictInputValidation)
  const incidentId = requireStringId(input.incidentId, 'incidentId')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}/corrective-actions`
  const { data } = await client.patch<VerifyRegulatoryIncidentCorrectiveActionResponse>(
    endpoint,
    omitIncidentId(input as unknown as Record<string, unknown>),
    input,
    validateResponse<VerifyRegulatoryIncidentCorrectiveActionResponse>(endpoint),
  )
  return data
}

export async function exportRegulatoryIncidentEvidencePack(
  client: AuthenChainHttpClient,
  input: ExportRegulatoryIncidentEvidencePackInput,
): Promise<ExportRegulatoryIncidentEvidencePackResponse> {
  assertNoUnknownKeys(input, GET_INCIDENT_KEYS, 'AuthenChain.exportRegulatoryIncidentEvidencePack input', client.strictInputValidation)
  const incidentId = requireStringId(input.id, 'id')
  const endpoint = `/api/regulatory/incidents/${encodeURIComponent(incidentId)}/evidence-pack`
  const { data } = await client.get<ExportRegulatoryIncidentEvidencePackResponse>(
    endpoint,
    undefined,
    input,
    validateResponse<ExportRegulatoryIncidentEvidencePackResponse>(endpoint),
  )
  return data
}

export async function listRegulatoryEvidenceFailureAlerts(
  client: AuthenChainHttpClient,
  input: ListRegulatoryEvidenceFailureAlertsInput = {},
): Promise<ListRegulatoryEvidenceFailureAlertsResponse> {
  assertNoUnknownKeys(input, LIST_ALERTS_KEYS, 'AuthenChain.listRegulatoryEvidenceFailureAlerts input', client.strictInputValidation)
  const endpoint = '/api/regulatory/evidence-failure-alerts'
  const { data } = await client.get<ListRegulatoryEvidenceFailureAlertsResponse>(
    endpoint,
    {
      workspaceId: input.workspaceId,
      status: input.status,
      incidentId: input.incidentId,
      page: input.page,
      pageSize: input.pageSize,
    },
    input,
    validateResponse<ListRegulatoryEvidenceFailureAlertsResponse>(endpoint),
  )
  return data
}

export async function generateRegulatoryIncidentRecurrenceReport(
  client: AuthenChainHttpClient,
  input: GenerateRegulatoryIncidentRecurrenceReportInput,
): Promise<GenerateRegulatoryIncidentRecurrenceReportResponse> {
  assertNoUnknownKeys(input, GENERATE_RECURRENCE_KEYS, 'AuthenChain.generateRegulatoryIncidentRecurrenceReport input', client.strictInputValidation)
  const endpoint = '/api/regulatory/incident-recurrence-reports'
  const { data } = await client.post<GenerateRegulatoryIncidentRecurrenceReportResponse>(
    endpoint,
    omitOperationKeys(input as unknown as Record<string, unknown>),
    input,
    validateResponse<GenerateRegulatoryIncidentRecurrenceReportResponse>(endpoint),
  )
  return data
}

export function buildIncidentGovernanceWebhookMetadata(
  input: IncidentGovernanceWebhookMetadataInput,
): IncidentGovernanceWebhookMetadata {
  assertNoUnknownKeys(input, WEBHOOK_METADATA_KEYS, 'buildIncidentGovernanceWebhookMetadata input', true)
  return {
    schemaVersion: 'authenchain.incident-governance.webhook-metadata.v1',
    eventType: input.eventType,
    deliveryImplemented: false,
    metadataOnly: true,
    incidentId: input.incidentId ?? null,
    workspaceId: input.workspaceId ?? null,
    incidentHash: input.incidentHash ?? null,
    severity: input.severity ?? null,
    previousSeverity: input.previousSeverity ?? null,
    status: input.status ?? null,
    deadlineId: input.deadlineId ?? null,
    alertId: input.alertId ?? null,
    correctiveActionId: input.correctiveActionId ?? null,
    evidenceHash: input.evidenceHash ?? null,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    limitations: [
      'metadata_only_no_raw_prompt_output_personal_data_or_artifact_url',
      'webhook_delivery_not_implemented_by_this_helper',
      'customer_responsible_for_subscription_delivery_and_reportability_decisions',
    ],
  }
}
