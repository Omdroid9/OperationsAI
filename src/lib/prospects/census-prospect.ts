import type { Opportunity } from "@/types";

export function isCensusDiscoveryProspect(opportunity: Pick<Opportunity, "recordKind" | "creation" | "discoveryScore" | "outreachReadiness">): boolean {
  return (
    opportunity.recordKind === "prospect" &&
    opportunity.creation.sourceType === "fmcsa_census_prospect" &&
    opportunity.discoveryScore != null &&
    opportunity.outreachReadiness != null
  );
}
