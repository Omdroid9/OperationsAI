import type {
  CaseStatus,
  DataProvenance,
  DocumentReviewStatus,
  OpportunityStage,
  RegulationMatchType,
} from "@/types";

export const STAGE_LABEL: Record<OpportunityStage, string> = {
  DETECTED: "Detected",
  REVIEWED: "Reviewed",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  CONSULTATION: "Consultation",
  WON: "Won",
  LOST: "Lost",
  DISMISSED: "Dismissed",
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: "Open",
  WAITING_ON_CLIENT: "Waiting on client",
  IN_REVIEW: "In review",
  READY: "Ready",
  COMPLETE: "Complete",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentReviewStatus, string> = {
  UPLOADED: "Uploaded",
  EXTRACTED: "Extracted",
  NEEDS_REVIEW: "Needs review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const PROVENANCE_LABEL: Record<DataProvenance, string> = {
  FMCSA: "FMCSA",
  CRM: "CRM",
  DERIVED: "Derived",
  AI_EXTRACTED: "Extracted",
  TRANSCRIPT_EXTRACTED: "Extracted from transcript",
  HUMAN_CONFIRMED: "Confirmed",
  DEMO: "Demo profile",
};

export const MATCH_LABEL: Record<RegulationMatchType, string> = {
  confirmed: "Confirmed match",
  potential: "Potential match",
  unknown: "Unknown",
};

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  cdl: "CDL",
  medical_certificate: "Medical Certificate",
  mvr: "MVR",
  driver_application: "Driver Application",
  drug_alcohol: "Drug & Alcohol Documentation",
  vehicle_information: "Vehicle Information",
  insurance: "Insurance",
};

export const PIPELINE_STAGES: OpportunityStage[] = [
  "DETECTED",
  "REVIEWED",
  "CONTACTED",
  "QUALIFIED",
  "CONSULTATION",
  "WON",
  "LOST",
];
