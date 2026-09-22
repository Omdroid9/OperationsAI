import {
  SERVICE_TYPES,
  type ServiceTypeKey,
} from "@/lib/docket/service-types";
import type { CaseDocument, CaseTask, Opportunity, ServiceCase } from "@/types";

export const NEW_ENTRANT_CHECKLIST = SERVICE_TYPES.compliance_onboarding.documentTypes;

export function createDocketCase(
  opportunity: Opportunity,
  openedAt: string,
  serviceTypeKey: ServiceTypeKey,
  ownerId: string | null,
): ServiceCase {
  const def = SERVICE_TYPES[serviceTypeKey];
  return {
    id: `case_${opportunity.id}`,
    leadId: opportunity.id,
    carrierId: opportunity.carrierId,
    serviceType: def.label,
    serviceTypeKey,
    ownerId,
    status: "OPEN",
    openedAt,
    targetDate: offsetDate(openedAt, 14),
    checklistLabel: def.checklistLabel,
    serviceApprovedAt: opportunity.serviceApprovedAt,
    createdAt: openedAt,
    updatedAt: openedAt,
  };
}

export function createCaseDocuments(
  caseId: string,
  createdAt: string,
  serviceTypeKey: ServiceTypeKey,
): CaseDocument[] {
  const def = SERVICE_TYPES[serviceTypeKey];
  return def.documentTypes.map((item) => ({
    id: `doc_${caseId}_${item.documentType}`,
    caseId,
    fileName: "",
    storagePath: null,
    documentType: item.documentType,
    personName: null,
    issuedDate: null,
    expirationDate: null,
    confidence: null,
    reviewStatus: "UPLOADED",
    expirationVerified: false,
    required: true,
    createdAt,
  }));
}

export function createCaseTasks(
  caseId: string,
  createdAt: string,
  serviceTypeKey: ServiceTypeKey,
  assignedTo: string | null,
): CaseTask[] {
  const def = SERVICE_TYPES[serviceTypeKey];
  return def.documentTypes.map((item) => ({
    id: `task_${caseId}_${item.documentType}`,
    caseId,
    title: `Request ${item.label}`,
    description: `${item.label} has not been received.`,
    status: "open" as const,
    priority:
      item.documentType === "mvr" || item.documentType === "medical_certificate"
        ? ("high" as const)
        : ("medium" as const),
    dueDate: offsetDate(createdAt, item.documentType === "mvr" ? 4 : 7),
    source: "DERIVED" as const,
    assignedTo,
    kind: "checklist" as const,
    createdAt,
  }));
}

function offsetDate(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
