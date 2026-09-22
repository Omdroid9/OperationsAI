import { getProfileKind } from "@/lib/profile";
import type {
  Carrier,
  CreationProvenance,
  CreationSourceType,
  LeadSourceType,
  Opportunity,
  ProspectSourceType,
  RecordKind,
} from "@/types";

export function makeCreationProvenance(input: {
  recordKind: RecordKind;
  sourceType: CreationSourceType;
  creationMethod: string;
  sourceRef?: string | null;
  createdAt: string;
}): CreationProvenance {
  return {
    recordKind: input.recordKind,
    sourceType: input.sourceType,
    creationMethod: input.creationMethod,
    sourceRef: input.sourceRef ?? null,
    createdAt: input.createdAt,
  };
}

export function inboundLeadCreation(input: {
  sourceType: LeadSourceType;
  creationMethod: string;
  sourceRef?: string | null;
  createdAt: string;
}): CreationProvenance {
  return makeCreationProvenance({
    recordKind: "lead",
    sourceType: input.sourceType,
    creationMethod: input.creationMethod,
    sourceRef: input.sourceRef ?? null,
    createdAt: input.createdAt,
  });
}

export function demoSeedLeadCreation(createdAt: string, carrierId: string): CreationProvenance {
  return inboundLeadCreation({
    sourceType: "demo_seed",
    creationMethod: "seed",
    sourceRef: carrierId,
    createdAt,
  });
}

export function fmcsaProspectCreation(input: {
  sourceType: Extract<
    ProspectSourceType,
    "fmcsa_usdot_lookup" | "fmcsa_ca_radar" | "fmcsa_census_prospect"
  >;
  usdot: string;
  sourceRef?: string | null;
  createdAt: string;
}): CreationProvenance {
  const method =
    input.sourceType === "fmcsa_ca_radar"
      ? "ca_radar"
      : input.sourceType === "fmcsa_census_prospect"
        ? "socrata_search"
        : "usdot_lookup";
  return makeCreationProvenance({
    recordKind: "prospect",
    sourceType: input.sourceType,
    creationMethod: method,
    sourceRef: input.sourceRef ?? input.usdot,
    createdAt: input.createdAt,
  });
}

export function fmcsaCensusProspectCreation(input: {
  usdot: string;
  sourceRef: string;
  createdAt: string;
}): CreationProvenance {
  return fmcsaProspectCreation({
    sourceType: "fmcsa_census_prospect",
    usdot: input.usdot,
    sourceRef: input.sourceRef,
    createdAt: input.createdAt,
  });
}

export function regulatoryCampaignProspectCreation(
  createdAt: string,
  regulationId: string,
): CreationProvenance {
  return makeCreationProvenance({
    recordKind: "prospect",
    sourceType: "regulatory_campaign",
    creationMethod: "campaign",
    sourceRef: regulationId,
    createdAt,
  });
}

export function legacyFmcsaProspectCreation(createdAt: string, usdot: string): CreationProvenance {
  return makeCreationProvenance({
    recordKind: "prospect",
    sourceType: "legacy_fmcsa",
    creationMethod: "legacy_migrate",
    sourceRef: usdot,
    createdAt,
  });
}

/** One-time stamp for stored rows missing creation. Never overwrites existing creation. */
export function inferCreationForLegacyOpportunity(
  opportunity: Opportunity,
  carrier: Carrier | undefined,
): CreationProvenance {
  if (opportunity.creation?.sourceType && opportunity.creation.createdAt) {
    return opportunity.creation;
  }
  const createdAt = opportunity.creation?.createdAt ?? opportunity.createdAt;
  const live =
    getProfileKind(carrier) === "live" ||
    opportunity.carrierId.startsWith("live-") ||
    opportunity.id.includes("live-");
  if (live) {
    // Mark for removal during migrateState — these are not Census Prospecting saves.
    return legacyFmcsaProspectCreation(createdAt, carrier?.usdot ?? opportunity.carrierId);
  }
  return demoSeedLeadCreation(createdAt, opportunity.carrierId);
}

export function withRecordKind(
  opportunity: Omit<Opportunity, "recordKind" | "creation"> & {
    recordKind?: RecordKind;
    creation: CreationProvenance;
  },
): Opportunity {
  return {
    ...opportunity,
    recordKind: opportunity.creation.recordKind,
    creation: opportunity.creation,
  };
}

const SOURCE_TYPE_LABEL: Record<CreationSourceType, string> = {
  website_form: "Website form",
  meta: "Meta",
  referral: "Referral",
  csv_import: "CSV import",
  manual: "Manual entry",
  demo_seed: "Demo seed",
  fmcsa_usdot_lookup: "FMCSA USDOT lookup",
  fmcsa_ca_radar: "FMCSA CA radar",
  fmcsa_census_prospect: "FMCSA Census prospecting",
  regulatory_campaign: "Regulation campaign",
  legacy_fmcsa: "Legacy FMCSA import",
};

export function recordKindLabel(kind: RecordKind): string {
  return kind === "lead" ? "Lead" : "Prospect";
}

export function creationSourceLabel(sourceType: CreationSourceType): string {
  return SOURCE_TYPE_LABEL[sourceType] ?? sourceType;
}

/** Quiet one-line provenance for detail pages. */
export function formatCreationLine(creation: CreationProvenance): string {
  const parts = [
    recordKindLabel(creation.recordKind),
    creationSourceLabel(creation.sourceType),
    creation.sourceRef ? `ref ${creation.sourceRef}` : null,
    creation.createdAt,
  ].filter(Boolean);
  return parts.join(" · ");
}
