import type { Carrier, Opportunity, ProfileKind } from "@/types";

export function getProfileKind(
  carrier?: Pick<Carrier, "id" | "profileKind"> | null,
): ProfileKind {
  if (!carrier) return "demo";
  if (carrier.profileKind === "live" || carrier.profileKind === "demo" || carrier.profileKind === "intake" || carrier.profileKind === "census") {
    return carrier.profileKind;
  }
  return carrier.id.startsWith("live-") ? "live" : "demo";
}

export function isFmcsaConnected(carrier?: Pick<Carrier, "id" | "profileKind"> | null): boolean {
  return getProfileKind(carrier) === "live";
}

export function isCensusProfile(carrier?: Pick<Carrier, "id" | "profileKind"> | null): boolean {
  return getProfileKind(carrier) === "census";
}

export function isDemoProfile(carrier?: Pick<Carrier, "id" | "profileKind"> | null): boolean {
  return getProfileKind(carrier) === "demo";
}

export function isIntakeProfile(carrier?: Pick<Carrier, "id" | "profileKind"> | null): boolean {
  return getProfileKind(carrier) === "intake";
}

/** Inbound lead that has not been enriched with a live FMCSA profile. */
export function isUnenrichedLead(
  opportunity?: Pick<Opportunity, "recordKind"> | null,
  carrier?: Pick<Carrier, "id" | "profileKind"> | null,
): boolean {
  return opportunity?.recordKind === "lead" && !isFmcsaConnected(carrier);
}

export function isDemoSimulationLead(
  opportunity?: Pick<Opportunity, "creation"> | null,
): boolean {
  return (
    opportunity?.creation.sourceType === "website_form" &&
    opportunity.creation.creationMethod === "demo_simulation"
  );
}

export function profileKindLabel(kind: ProfileKind): string {
  if (kind === "live") return "Live FMCSA";
  if (kind === "intake") return "Intake only";
  if (kind === "census") return "Census profile";
  return "Demo profile";
}

export function profileKindHint(kind: ProfileKind): string {
  if (kind === "live") {
    return "Imported from a live FMCSA lookup. Review before outreach.";
  }
  if (kind === "intake") {
    return "FMCSA profile not connected. Add a USDOT to enrich this lead.";
  }
  if (kind === "census") {
    return "Fields from FMCSA Company Census. QCMobile enrichment not applied yet. Review before outreach.";
  }
  return "Seeded for the walkthrough. Shaped like public FMCSA data, not a live record.";
}
