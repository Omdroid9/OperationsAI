import { buildLeadCreationProvenance } from "@/lib/leads/intake";
import type { LeadIntakeInput } from "@/lib/leads/intake";
import { carrierToRow, opportunityToLeadRow } from "@/lib/supabase/mappers";
import type { Carrier, Opportunity } from "@/types";

function intakeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildIntakeRecords(input: LeadIntakeInput, createdAt = new Date().toISOString()) {
  const carrierId = intakeId("inbound");
  const opportunityId = `opp_${carrierId}`;
  const usdot = input.usdot ?? `pending-${carrierId}`;

  const carrier: Carrier = {
    id: carrierId,
    usdot,
    legalName: input.company,
    dbaName: null,
    state: input.state ?? "",
    city: "",
    phone: input.phone ?? "",
    email: input.email ?? "",
    powerUnits: 0,
    drivers: 0,
    operationType: "intrastate",
    authorizedForHire: false,
    newEntrant: false,
    hazmat: false,
    passenger: false,
    cargoTypes: [],
    authorityStatus: "pending",
    isCustomer: false,
    existingServices: [],
    profileKind: "intake",
    source: "CRM",
    sourceLastCheckedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  const creation = buildLeadCreationProvenance(input, createdAt);
  const opportunity: Opportunity = {
    id: opportunityId,
    carrierId,
    recordKind: "lead",
    creation,
    stage: "DETECTED",
    score: 0,
    scoreBreakdown: [],
    recommendedService: "Needs FMCSA enrichment",
    reasonSummary:
      "Intake only. No FMCSA profile is connected yet, so score and service suggestions are withheld.",
    signalTitle: "Inbound lead",
    contactName: input.contactName,
    statedNeed: input.statedNeed,
    assignedTo: input.owner ?? "",
    preferredLanguage: null,
    detectedLanguages: [],
    nextAction: "Add USDOT to enrich",
    followUpAt: null,
    lastActivityAt: createdAt,
    lastActivityLabel: "Lead intake",
    interestLevel: null,
    callbackRequested: false,
    caseId: null,
    consultationStatus: "not_applicable",
    consultationScheduledAt: null,
    consultationNote: null,
    serviceApprovedAt: null,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    carrier,
    opportunity,
    carrierRow: carrierToRow(carrier),
    leadRow: opportunityToLeadRow(opportunity),
  };
}
