export type DataProvenance =
  | "FMCSA"
  | "CRM"
  | "DERIVED"
  | "AI_EXTRACTED"
  | "TRANSCRIPT_EXTRACTED"
  | "HUMAN_CONFIRMED"
  | "DEMO";

export type ProfileKind = "demo" | "live" | "intake" | "census";

export type RecordKind = "lead" | "prospect";

export type LeadSourceType =
  | "website_form"
  | "meta"
  | "referral"
  | "csv_import"
  | "manual"
  | "demo_seed";

export type ProspectSourceType =
  | "fmcsa_usdot_lookup"
  | "fmcsa_ca_radar"
  | "fmcsa_census_prospect"
  | "regulatory_campaign"
  | "legacy_fmcsa";

export type CreationSourceType = LeadSourceType | ProspectSourceType;

export interface CreationProvenance {
  recordKind: RecordKind;
  sourceType: CreationSourceType;
  /** Immutable creation path, e.g. seed | usdot_lookup | ca_radar | campaign | legacy_migrate */
  creationMethod: string;
  /** USDOT, radar query, import batch, form id, regulation id, etc. */
  sourceRef: string | null;
  /** First creation time; never updated after create. */
  createdAt: string;
}

export type OpportunityStage =
  | "DETECTED"
  | "REVIEWED"
  | "CONTACTED"
  | "QUALIFIED"
  | "CONSULTATION"
  | "WON"
  | "LOST"
  | "DISMISSED";

export type SignalType =
  | "NEW_ENTRANT"
  | "SMALL_FLEET"
  | "INTERSTATE"
  | "AUTHORIZED_FOR_HIRE"
  | "FLEET_GROWTH"
  | "SAFETY_ACTIVITY"
  | "AUTHORITY_CHANGE"
  | "REGULATORY_MATCH"
  | "DORMANT_LEAD_REACTIVATION"
  | "CUSTOMER_EXPANSION"
  | "CALIFORNIA"
  | "CRM_CONTEXT";

export type ActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL"
  | "STAGE_CHANGE"
  | "FOLLOW_UP"
  | "SIGNAL"
  | "SUMMARY";

export type CaseStatus =
  | "OPEN"
  | "WAITING_ON_CLIENT"
  | "IN_REVIEW"
  | "READY"
  | "COMPLETE";

export type DocumentReviewStatus =
  | "UPLOADED"
  | "EXTRACTED"
  | "NEEDS_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export type CallStatus = "queued" | "in_progress" | "completed" | "failed" | "simulated";

export type RegulationMatchType = "confirmed" | "potential" | "unknown";

export type InterestLevel = "high" | "medium" | "low" | "none" | "unknown";

export type QualificationSource = "dograh_structured" | "transcript_extracted" | "mixed";

export type OutreachReadiness = "ready_to_review" | "needs_review" | "low_confidence";

export type ComplianceManagement = "internal" | "external" | "mixed" | "unknown";

export type ConsultationStatus =
  | "not_applicable"
  | "needs_follow_up"
  | "scheduled"
  | "complete"
  | "service_approved"
  | "not_moving_forward";

export type StaffRole = "admin" | "staff" | "readonly";

export interface StaffMember {
  id: string;
  displayName: string;
  email: string;
  role: StaffRole;
}

export type ServiceTypeKey =
  | "compliance_onboarding"
  | "renewal_support"
  | "document_review"
  | "filing_support";

export type CaseTaskKind = "checklist" | "renewal" | "regulation_review" | "manual";

export type RegulationSourceType =
  | "federal_register"
  | "fmcsa_guidance"
  | "manual_paste"
  | "demo_seed";

export interface Provenanced<T> {
  value: T;
  provenance: DataProvenance;
}

export interface Carrier {
  id: string;
  usdot: string;
  legalName: string;
  dbaName: string | null;
  state: string;
  city: string;
  phone: string | null;
  email: string | null;
  powerUnits: number;
  drivers: number;
  operationType: "interstate" | "intrastate";
  authorizedForHire: boolean;
  newEntrant: boolean;
  hazmat: boolean;
  passenger: boolean;
  cargoTypes: string[];
  authorityStatus: "active" | "inactive" | "pending";
  isCustomer: boolean;
  existingServices: string[];
  profileKind: ProfileKind;
  source: DataProvenance;
  sourceLastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierSnapshot {
  id: string;
  carrierId: string;
  snapshotDate: string;
  powerUnits: number;
  drivers: number;
  authorityStatus: Carrier["authorityStatus"];
  operationType: Carrier["operationType"];
}

export interface Signal {
  id: string;
  carrierId: string;
  type: SignalType;
  title: string;
  description: string;
  scoreContribution: number;
  confidence: number;
  source: DataProvenance;
  detectedAt: string;
}

export interface ScoreLine {
  key: string;
  label: string;
  points: number;
  provenance: DataProvenance;
}

export interface Opportunity {
  id: string;
  carrierId: string;
  recordKind: RecordKind;
  creation: CreationProvenance;
  stage: OpportunityStage;
  score: number;
  scoreBreakdown: ScoreLine[];
  recommendedService: string;
  reasonSummary: string;
  signalTitle: string;
  contactName: string | null;
  statedNeed: string | null;
  assignedTo: string | null;
  preferredLanguage: string | null;
  detectedLanguages: string[];
  nextAction: string;
  followUpAt: string | null;
  lastActivityAt: string;
  lastActivityLabel: string;
  interestLevel: InterestLevel | null;
  callbackRequested: boolean;
  caseId: string | null;
  consultationStatus: ConsultationStatus;
  consultationScheduledAt: string | null;
  consultationNote: string | null;
  serviceApprovedAt: string | null;
  outreachReadiness?: OutreachReadiness | null;
  outreachReadinessReason?: string | null;
  /** Prospecting discovery score at Save as Prospect; immutable after create. */
  discoveryScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface QualificationResult {
  /** Language used on the call when known. */
  language: string | null;
  /** Explicitly stated language for follow-up outreach. */
  preferred_language: string | null;
  detected_languages: string[];
  contact_verified: boolean | null;
  fleet_size_confirmed: number | null;
  compliance_management: ComplianceManagement;
  current_provider: string | null;
  needs: string[];
  interest_level: InterestLevel;
  callback_requested: boolean | null;
  callback_time: string | null;
  consultation_accepted: boolean | null;
  consultation_preference: string | null;
  objections: string[];
  summary_english: string | null;
  call_outcome?: string | null;
  suggested_next_step?: string | null;
  source?: QualificationSource;
}

export interface CallRecord {
  id: string;
  leadId: string;
  carrierId: string;
  provider: "vapi" | "demo" | "dograh";
  providerCallId: string | null;
  status: CallStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  language: string;
  detectedLanguages: string[];
  originalTranscript: string;
  transcriptUrl: string | null;
  englishSummary: string;
  qualification: QualificationResult;
  recordingUrl: string | null;
  createdAt: string;
}

export interface Regulation {
  id: string;
  title: string;
  agency: string;
  sourceUrl: string | null;
  sourceText: string;
  category: string;
  publishedDate: string | null;
  effectiveDate: string | null;
  deadline: string | null;
  affectedSegment: string;
  requiredAction: string;
  confidence: number;
  sourceSummary: string;
  status: "analyzed" | "needs_review";
  campaignCreated: boolean;
  customersFlagged: boolean;
  sourceType?: RegulationSourceType;
  fetchedAt?: string | null;
  documentNumber?: string | null;
  createdAt: string;
}

export interface RegulationMatch {
  carrierId: string;
  opportunityId: string | null;
  matchType: RegulationMatchType;
  reason: string;
  audience: "customer" | "prospect";
  requiredChange: string;
  suggestedService: string | null;
}

export interface ServiceCase {
  id: string;
  leadId: string;
  carrierId: string;
  serviceType: string;
  serviceTypeKey: ServiceTypeKey;
  ownerId: string | null;
  status: CaseStatus;
  openedAt: string;
  targetDate: string | null;
  checklistLabel: string;
  serviceApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  fileName: string;
  storagePath: string | null;
  documentType: string;
  personName: string | null;
  issuedDate: string | null;
  expirationDate: string | null;
  confidence: number | null;
  reviewStatus: DocumentReviewStatus;
  expirationVerified: boolean;
  required: boolean;
  createdAt: string;
}

export interface CaseTask {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: "open" | "done";
  priority: "high" | "medium" | "low";
  dueDate: string | null;
  source: DataProvenance;
  assignedTo: string | null;
  kind: CaseTaskKind;
  createdAt: string;
}

export interface DemoState {
  carriers: Carrier[];
  snapshots: CarrierSnapshot[];
  signals: Signal[];
  opportunities: Opportunity[];
  activities: Activity[];
  calls: CallRecord[];
  regulations: Regulation[];
  matches: Record<string, RegulationMatch[]>;
  cases: ServiceCase[];
  documents: CaseDocument[];
  tasks: CaseTask[];
}
