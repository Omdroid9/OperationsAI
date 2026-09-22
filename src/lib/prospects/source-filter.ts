import type { CreationSourceType } from "@/types";

export type SavedProspectSourceFilter =
  | "all"
  | "census"
  | "fmcsa_lookup"
  | "regulatory_campaign";

export const DEFAULT_SAVED_PROSPECT_SOURCE_FILTER: SavedProspectSourceFilter = "census";

export function prospectSourceBucket(
  sourceType: CreationSourceType,
): SavedProspectSourceFilter | null {
  if (sourceType === "fmcsa_census_prospect") return "census";
  if (sourceType === "fmcsa_usdot_lookup" || sourceType === "fmcsa_ca_radar") {
    return "fmcsa_lookup";
  }
  if (sourceType === "regulatory_campaign") return "regulatory_campaign";
  // legacy_fmcsa and anything else are not part of Saved Prospects.
  return null;
}

export function prospectSourceFilterLabel(filter: SavedProspectSourceFilter): string {
  if (filter === "all") return "All saved";
  if (filter === "census") return "Census";
  if (filter === "fmcsa_lookup") return "FMCSA lookup";
  return "Regulatory campaign";
}

/** Prospects staff intentionally saved — not legacy live-import clutter. */
export function isSavedProspectSource(sourceType: CreationSourceType): boolean {
  return prospectSourceBucket(sourceType) !== null;
}
