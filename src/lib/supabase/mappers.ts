import { inferCreationForLegacyOpportunity } from "@/lib/leads/creation";
import type { NormalizedFmcsaCarrier } from "@/lib/providers/types";
import type {
  Activity,
  CallRecord,
  Carrier,
  CaseDocument,
  CaseTask,
  CreationProvenance,
  DemoState,
  Opportunity,
  Regulation,
  RegulationMatch,
  ServiceCase,
} from "@/types";

export function carrierToRow(carrier: Carrier) {
  return {
    id: carrier.id,
    usdot: carrier.usdot,
    legal_name: carrier.legalName,
    dba_name: carrier.dbaName,
    state: carrier.state,
    city: carrier.city,
    phone: carrier.phone,
    email: carrier.email,
    power_units: carrier.powerUnits,
    drivers: carrier.drivers,
    operation_type: carrier.operationType,
    authorized_for_hire: carrier.authorizedForHire,
    new_entrant: carrier.newEntrant,
    hazmat: carrier.hazmat,
    passenger: carrier.passenger,
    cargo_types: carrier.cargoTypes,
    authority_status: carrier.authorityStatus,
    is_customer: carrier.isCustomer,
    existing_services: carrier.existingServices,
    profile_kind: carrier.profileKind,
    source: carrier.source,
    source_last_checked_at: carrier.sourceLastCheckedAt,
    updated_at: carrier.updatedAt,
  };
}

export function normalizedCarrierToRow(carrier: NormalizedFmcsaCarrier) {
  return {
    id: `live-${carrier.usdot}`,
    usdot: carrier.usdot,
    legal_name: carrier.legalName,
    dba_name: carrier.dbaName,
    state: carrier.state,
    city: carrier.city,
    phone: carrier.phone,
    email: carrier.email,
    power_units: carrier.powerUnits,
    drivers: carrier.drivers,
    operation_type: carrier.operationType,
    authorized_for_hire: carrier.authorizedForHire,
    new_entrant: carrier.newEntrant,
    hazmat: carrier.hazmat,
    passenger: carrier.passenger,
    cargo_types: carrier.cargoTypes,
    authority_status: carrier.authorityStatus,
    is_customer: false,
    existing_services: [],
    profile_kind: "live",
    source: "FMCSA",
    source_last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function opportunityToLeadRow(opportunity: Opportunity) {
  return {
    id: opportunity.id,
    carrier_id: opportunity.carrierId,
    stage: opportunity.stage,
    score: opportunity.score,
    recommended_service: opportunity.recommendedService,
    reason_summary: opportunity.reasonSummary,
    assigned_to: opportunity.assignedTo,
    preferred_language: opportunity.preferredLanguage,
    detected_languages: opportunity.detectedLanguages,
    metadata_json: {
      scoreBreakdown: opportunity.scoreBreakdown,
      signalTitle: opportunity.signalTitle,
      nextAction: opportunity.nextAction,
      followUpAt: opportunity.followUpAt,
      lastActivityAt: opportunity.lastActivityAt,
      lastActivityLabel: opportunity.lastActivityLabel,
      interestLevel: opportunity.interestLevel,
      callbackRequested: opportunity.callbackRequested,
      caseId: opportunity.caseId,
      contactName: opportunity.contactName,
      statedNeed: opportunity.statedNeed,
      recordKind: opportunity.recordKind,
      creation: opportunity.creation,
      consultationStatus: opportunity.consultationStatus,
      consultationScheduledAt: opportunity.consultationScheduledAt,
      consultationNote: opportunity.consultationNote,
      serviceApprovedAt: opportunity.serviceApprovedAt,
      outreachReadiness: opportunity.outreachReadiness ?? null,
      outreachReadinessReason: opportunity.outreachReadinessReason ?? null,
      discoveryScore: opportunity.discoveryScore ?? null,
    },
    updated_at: opportunity.updatedAt,
  };
}

function regulationAnalysisPayload(regulation: Regulation, analysis?: unknown) {
  const base =
    analysis && typeof analysis === "object" && !Array.isArray(analysis)
      ? (analysis as Record<string, unknown>)
      : {};
  return {
    ...base,
    source_type: regulation.sourceType ?? null,
    document_number: regulation.documentNumber ?? null,
    fetched_at: regulation.fetchedAt ?? null,
  };
}

export function regulationToRow(regulation: Regulation, analysis?: unknown) {
  return {
    id: regulation.id,
    title: regulation.title,
    agency: regulation.agency,
    source_url: regulation.sourceUrl,
    source_text: regulation.sourceText,
    category: regulation.category,
    published_date: regulation.publishedDate,
    effective_date: regulation.effectiveDate,
    deadline: regulation.deadline,
    affected_segment: regulation.affectedSegment,
    required_action: regulation.requiredAction,
    confidence: regulation.confidence,
    source_summary: regulation.sourceSummary,
    status: regulation.status,
    campaign_created: regulation.campaignCreated,
    customers_flagged: regulation.customersFlagged,
    analysis_json: regulationAnalysisPayload(regulation, analysis),
  };
}

export function callToRow(call: CallRecord) {
  return {
    id: call.id,
    lead_id: call.leadId,
    carrier_id: call.carrierId,
    provider: call.provider,
    provider_call_id: call.providerCallId,
    status: call.status,
    started_at: call.startedAt,
    ended_at: call.endedAt,
    duration_seconds: call.durationSeconds,
    language: call.language,
    detected_languages: call.detectedLanguages,
    original_transcript: call.originalTranscript,
    english_summary: call.englishSummary,
    qualification_json: call.qualification,
    recording_url: call.recordingUrl,
    created_at: call.createdAt,
  };
}

export function regulationMatchToRow(regulationId: string, match: RegulationMatch) {
  return {
    regulation_id: regulationId,
    carrier_id: match.carrierId,
    opportunity_id: match.opportunityId,
    match_type: match.matchType,
    audience: match.audience,
    reason: match.reason,
    required_change: match.requiredChange,
    suggested_service: match.suggestedService,
    match_json: match,
  };
}

export function activityToRow(activity: Activity) {
  return {
    id: activity.id,
    lead_id: activity.leadId,
    type: activity.type,
    content: activity.content,
    created_at: activity.createdAt,
    created_by: activity.createdBy,
  };
}

export function caseToRow(serviceCase: ServiceCase) {
  return {
    id: serviceCase.id,
    lead_id: serviceCase.leadId,
    carrier_id: serviceCase.carrierId,
    service_type: serviceCase.serviceType,
    status: serviceCase.status,
    opened_at: serviceCase.openedAt,
    target_date: serviceCase.targetDate,
    checklist_label: serviceCase.checklistLabel,
    metadata_json: {
      serviceTypeKey: serviceCase.serviceTypeKey,
      ownerId: serviceCase.ownerId,
      serviceApprovedAt: serviceCase.serviceApprovedAt,
    },
    updated_at: serviceCase.updatedAt,
  };
}

export function documentToRow(document: CaseDocument) {
  return {
    id: document.id,
    case_id: document.caseId,
    file_name: document.fileName,
    storage_path: document.storagePath,
    document_type: document.documentType,
    person_name: document.personName,
    issued_date: document.issuedDate,
    expiration_date: document.expirationDate,
    confidence: document.confidence,
    extraction_json: { expirationVerified: document.expirationVerified },
    review_status: document.reviewStatus,
    required: document.required,
    created_at: document.createdAt,
  };
}

export function taskToRow(task: CaseTask) {
  return {
    id: task.id,
    case_id: task.caseId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate,
    source: task.source,
    metadata_json: {
      assignedTo: task.assignedTo,
      kind: task.kind,
    },
    created_at: task.createdAt,
  };
}

export function carrierRowToCarrier(row: Record<string, unknown>): Carrier {
  return {
    id: String(row.id),
    usdot: String(row.usdot ?? ""),
    legalName: String(row.legal_name ?? ""),
    dbaName: (row.dba_name as string | null) ?? null,
    state: String(row.state ?? ""),
    city: String(row.city ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    powerUnits: Number(row.power_units ?? 0),
    drivers: Number(row.drivers ?? 0),
    operationType: (row.operation_type as Carrier["operationType"]) ?? "intrastate",
    authorizedForHire: Boolean(row.authorized_for_hire),
    newEntrant: Boolean(row.new_entrant),
    hazmat: Boolean(row.hazmat),
    passenger: Boolean(row.passenger),
    cargoTypes: (row.cargo_types as string[]) ?? [],
    authorityStatus: (row.authority_status as Carrier["authorityStatus"]) ?? "pending",
    isCustomer: Boolean(row.is_customer),
    existingServices: (row.existing_services as Carrier["existingServices"]) ?? [],
    profileKind: (row.profile_kind as Carrier["profileKind"]) ?? "demo",
    source: (row.source as Carrier["source"]) ?? "CRM",
    sourceLastCheckedAt: String(row.source_last_checked_at ?? row.updated_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export function leadRowToOpportunity(row: Record<string, unknown>, carrierId: string): Opportunity {
  const meta = (row.metadata_json as Record<string, unknown> | null) ?? {};
  const createdAt = String(row.created_at ?? new Date().toISOString());
  const partial = {
    id: String(row.id),
    carrierId,
    stage: row.stage as Opportunity["stage"],
    score: Number(row.score ?? 0),
    scoreBreakdown: (meta.scoreBreakdown as Opportunity["scoreBreakdown"]) ?? [],
    recommendedService: String(row.recommended_service ?? ""),
    reasonSummary: String(row.reason_summary ?? ""),
    signalTitle: String(meta.signalTitle ?? ""),
    assignedTo: (row.assigned_to as string | null) ?? null,
    preferredLanguage: (row.preferred_language as string | null) ?? null,
    detectedLanguages: (row.detected_languages as string[]) ?? [],
    nextAction: String(meta.nextAction ?? "Review opportunity"),
    followUpAt: (meta.followUpAt as string | null) ?? null,
    lastActivityAt: String(meta.lastActivityAt ?? row.updated_at ?? createdAt),
    lastActivityLabel: String(meta.lastActivityLabel ?? ""),
    interestLevel: (meta.interestLevel as Opportunity["interestLevel"]) ?? null,
    callbackRequested: Boolean(meta.callbackRequested),
    caseId: (meta.caseId as string | null) ?? null,
    contactName: (meta.contactName as string | null) ?? null,
    statedNeed: (meta.statedNeed as string | null) ?? null,
    consultationStatus:
      (meta.consultationStatus as Opportunity["consultationStatus"]) ?? "not_applicable",
    consultationScheduledAt: (meta.consultationScheduledAt as string | null) ?? null,
    consultationNote: (meta.consultationNote as string | null) ?? null,
    serviceApprovedAt: (meta.serviceApprovedAt as string | null) ?? null,
    outreachReadiness: (meta.outreachReadiness as Opportunity["outreachReadiness"]) ?? null,
    outreachReadinessReason: (meta.outreachReadinessReason as string | null) ?? null,
    discoveryScore: (meta.discoveryScore as number | null) ?? null,
    createdAt,
    updatedAt: String(row.updated_at ?? createdAt),
    creation: meta.creation as CreationProvenance | undefined,
    recordKind: meta.recordKind as Opportunity["recordKind"] | undefined,
  };
  const creation = inferCreationForLegacyOpportunity(
    partial as Opportunity,
    undefined,
  );
  return {
    ...partial,
    creation,
    recordKind: creation.recordKind,
  };
}

export function activityRowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    type: row.type as Activity["type"],
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    createdBy: String(row.created_by ?? "SkyOS"),
  };
}

export function caseRowToCase(row: Record<string, unknown>): ServiceCase {
  const meta = (row.metadata_json as Record<string, unknown> | null) ?? {};
  return {
    id: String(row.id),
    leadId: String(row.lead_id ?? ""),
    carrierId: String(row.carrier_id),
    serviceType: String(row.service_type ?? ""),
    serviceTypeKey: (meta.serviceTypeKey as ServiceCase["serviceTypeKey"]) ?? "compliance_onboarding",
    ownerId: (meta.ownerId as string | null) ?? null,
    status: (row.status as ServiceCase["status"]) ?? "open",
    openedAt: String(row.opened_at ?? row.created_at ?? new Date().toISOString()),
    targetDate: row.target_date ? String(row.target_date) : null,
    checklistLabel: String(row.checklist_label ?? ""),
    serviceApprovedAt: (meta.serviceApprovedAt as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function documentRowToDocument(row: Record<string, unknown>): CaseDocument {
  const extraction = (row.extraction_json as Record<string, unknown> | null) ?? {};
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    fileName: String(row.file_name ?? ""),
    storagePath: (row.storage_path as string | null) ?? null,
    documentType: String(row.document_type ?? ""),
    personName: (row.person_name as string | null) ?? null,
    issuedDate: row.issued_date ? String(row.issued_date) : null,
    expirationDate: row.expiration_date ? String(row.expiration_date) : null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    reviewStatus: (row.review_status as CaseDocument["reviewStatus"]) ?? "NEEDS_REVIEW",
    expirationVerified: Boolean(extraction.expirationVerified),
    required: Boolean(row.required ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function taskRowToTask(row: Record<string, unknown>): CaseTask {
  const meta = (row.metadata_json as Record<string, unknown> | null) ?? {};
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    status: (row.status as CaseTask["status"]) ?? "open",
    priority: (row.priority as CaseTask["priority"]) ?? "medium",
    dueDate: row.due_date ? String(row.due_date) : null,
    source: (row.source as CaseTask["source"]) ?? "CRM",
    assignedTo: (meta.assignedTo as string | null) ?? null,
    kind: (meta.kind as CaseTask["kind"]) ?? "manual",
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function callRowToCall(row: Record<string, unknown>): CallRecord {
  const qualification = (row.qualification_json as CallRecord["qualification"] | null) ?? {
    language: null,
    preferred_language: null,
    detected_languages: [],
    contact_verified: null,
    fleet_size_confirmed: null,
    compliance_management: "unknown",
    current_provider: null,
    needs: [],
    interest_level: "unknown",
    callback_requested: null,
    callback_time: null,
    consultation_accepted: null,
    consultation_preference: null,
    objections: [],
    summary_english: null,
  };
  return {
    id: String(row.id),
    leadId: String(row.lead_id ?? ""),
    carrierId: String(row.carrier_id ?? ""),
    provider: (row.provider as CallRecord["provider"]) ?? "demo",
    providerCallId: (row.provider_call_id as string | null) ?? null,
    status: (row.status as CallRecord["status"]) ?? "completed",
    startedAt: String(row.started_at ?? row.created_at ?? new Date().toISOString()),
    endedAt: (row.ended_at as string | null) ?? null,
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    language: String(row.language ?? ""),
    detectedLanguages: (row.detected_languages as string[]) ?? [],
    originalTranscript: String(row.original_transcript ?? ""),
    transcriptUrl: null,
    englishSummary: String(row.english_summary ?? ""),
    qualification,
    recordingUrl: (row.recording_url as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function regulationRowToRegulation(row: Record<string, unknown>): Regulation {
  const analysis =
    row.analysis_json && typeof row.analysis_json === "object" && !Array.isArray(row.analysis_json)
      ? (row.analysis_json as Record<string, unknown>)
      : {};
  const sourceType = analysis.source_type;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    agency: String(row.agency ?? ""),
    sourceUrl: (row.source_url as string | null) ?? null,
    sourceText: String(row.source_text ?? ""),
    category: String(row.category ?? ""),
    publishedDate: row.published_date ? String(row.published_date) : null,
    effectiveDate: row.effective_date ? String(row.effective_date) : null,
    deadline: row.deadline ? String(row.deadline) : null,
    affectedSegment: String(row.affected_segment ?? ""),
    requiredAction: String(row.required_action ?? ""),
    confidence: Number(row.confidence ?? 0),
    sourceSummary: String(row.source_summary ?? ""),
    status: (row.status as Regulation["status"]) ?? "analyzed",
    campaignCreated: Boolean(row.campaign_created),
    customersFlagged: Boolean(row.customers_flagged),
    sourceType:
      sourceType === "federal_register" ||
      sourceType === "fmcsa_guidance" ||
      sourceType === "manual_paste" ||
      sourceType === "demo_seed"
        ? sourceType
        : undefined,
    fetchedAt: analysis.fetched_at ? String(analysis.fetched_at) : null,
    documentNumber: analysis.document_number ? String(analysis.document_number) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function matchRowToRegulationMatch(row: Record<string, unknown>): RegulationMatch {
  const embedded = row.match_json as RegulationMatch | null;
  if (embedded?.carrierId) return embedded;
  return {
    carrierId: String(row.carrier_id),
    opportunityId: (row.opportunity_id as string | null) ?? null,
    matchType: (row.match_type as RegulationMatch["matchType"]) ?? "potential",
    reason: String(row.reason ?? ""),
    audience: (row.audience as RegulationMatch["audience"]) ?? "prospect",
    requiredChange: String(row.required_change ?? ""),
    suggestedService: (row.suggested_service as string | null) ?? null,
  };
}

export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const state = value as DemoState;
  return Array.isArray(state.carriers) && Array.isArray(state.opportunities);
}
