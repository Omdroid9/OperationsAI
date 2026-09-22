export type ServiceTypeKey =
  | "compliance_onboarding"
  | "renewal_support"
  | "document_review"
  | "filing_support";

export interface ServiceTypeDefinition {
  key: ServiceTypeKey;
  label: string;
  description: string;
  checklistLabel: string;
  documentTypes: readonly { documentType: string; label: string }[];
}

const NEW_ENTRANT_DOCS = [
  { documentType: "cdl", label: "CDL" },
  { documentType: "medical_certificate", label: "Medical Certificate" },
  { documentType: "mvr", label: "MVR" },
  { documentType: "driver_application", label: "Driver Application" },
  { documentType: "drug_alcohol", label: "Drug & Alcohol Documentation" },
  { documentType: "vehicle_information", label: "Vehicle Information" },
  { documentType: "insurance", label: "Insurance" },
] as const;

const RENEWAL_DOCS = [
  { documentType: "insurance", label: "Insurance" },
  { documentType: "irp_ifta", label: "IRP / IFTA" },
  { documentType: "ucr", label: "UCR" },
] as const;

const REVIEW_DOCS = [
  { documentType: "medical_certificate", label: "Medical Certificate" },
  { documentType: "cdl", label: "CDL" },
  { documentType: "mvr", label: "MVR" },
] as const;

const FILING_DOCS = [{ documentType: "filing_packet", label: "Filing packet" }] as const;

export const SERVICE_TYPES: Record<ServiceTypeKey, ServiceTypeDefinition> = {
  compliance_onboarding: {
    key: "compliance_onboarding",
    label: "Compliance onboarding",
    description: "New entrant and driver qualification setup.",
    checklistLabel: "New entrant compliance checklist",
    documentTypes: NEW_ENTRANT_DOCS,
  },
  renewal_support: {
    key: "renewal_support",
    label: "Renewal support",
    description: "IRP, IFTA, insurance, and permit renewals.",
    checklistLabel: "Renewal document checklist",
    documentTypes: RENEWAL_DOCS,
  },
  document_review: {
    key: "document_review",
    label: "Document review",
    description: "Targeted document extraction and verification.",
    checklistLabel: "Document review checklist",
    documentTypes: REVIEW_DOCS,
  },
  filing_support: {
    key: "filing_support",
    label: "Filing support",
    description: "Manual filing preparation and submission support.",
    checklistLabel: "Filing support checklist",
    documentTypes: FILING_DOCS,
  },
};

export const SERVICE_TYPE_LIST = Object.values(SERVICE_TYPES);

export function defaultServiceTypeKey(recommendedService: string): ServiceTypeKey {
  const lower = recommendedService.toLowerCase();
  if (lower.includes("renewal") || lower.includes("irp") || lower.includes("ifta")) {
    return "renewal_support";
  }
  if (lower.includes("document") || lower.includes("medical") || lower.includes("cdl")) {
    return "document_review";
  }
  if (lower.includes("filing")) return "filing_support";
  return "compliance_onboarding";
}
