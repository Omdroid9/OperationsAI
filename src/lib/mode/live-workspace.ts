import { REGULATORY_INBOX } from "@/lib/regulations/inbox";
import { getProfileKind } from "@/lib/profile";
import type { DemoState, Opportunity, Regulation } from "@/types";

/** Fixed seed regulation ids from createInitialState(). */
export const SEED_REGULATION_IDS = new Set(["reg_new-entrant-packet", "reg_needs-review"]);

const SEEDED_INBOX_TITLES = new Set(REGULATORY_INBOX.map((notice) => notice.analysis.title));

export function isSeedRegulation(regulation: Pick<Regulation, "id" | "title" | "sourceType">): boolean {
  if (regulation.sourceType === "demo_seed") return true;
  if (SEED_REGULATION_IDS.has(regulation.id)) return true;
  return SEEDED_INBOX_TITLES.has(regulation.title);
}

/** Demo-only leads must not appear when Demo Mode is off. */
export function isDemoOnlyLead(opportunity: Opportunity): boolean {
  if (opportunity.recordKind !== "lead") return false;
  if (opportunity.creation.sourceType === "demo_seed") return true;
  if (
    opportunity.creation.sourceType === "website_form" &&
    opportunity.creation.creationMethod === "demo_simulation"
  ) {
    return true;
  }
  return false;
}

/** Live Mode view: inbound (non-demo) leads + FMCSA-live prospects + public intake. */
export function filterLiveWorkspace(state: DemoState): DemoState {
  const opportunities = state.opportunities.filter((item) => {
    if (item.recordKind === "lead") return !isDemoOnlyLead(item);
    const carrier = state.carriers.find((entry) => entry.id === item.carrierId);
    const profileKind = getProfileKind(carrier);
    return profileKind === "live" || profileKind === "census" || profileKind === "intake";
  });
  const opportunityIds = new Set(opportunities.map((item) => item.id));
  const carrierIds = new Set(opportunities.map((item) => item.carrierId));

  const carriers = state.carriers.filter((carrier) => carrierIds.has(carrier.id));
  const snapshots = state.snapshots.filter((item) => carrierIds.has(item.carrierId));
  const signals = state.signals.filter((item) => carrierIds.has(item.carrierId));

  const activities = state.activities.filter((item) => opportunityIds.has(item.leadId));

  const calls = state.calls.filter(
    (item) =>
      carrierIds.has(item.carrierId) &&
      item.provider !== "demo" &&
      item.status !== "simulated",
  );

  const cases = state.cases.filter((item) => carrierIds.has(item.carrierId));
  const caseIds = new Set(cases.map((item) => item.id));

  const documents = state.documents.filter((item) => caseIds.has(item.caseId));
  const tasks = state.tasks.filter((item) => caseIds.has(item.caseId));

  const regulations = state.regulations.filter((item) => !isSeedRegulation(item));
  const regulationIds = new Set(regulations.map((item) => item.id));

  const matches: DemoState["matches"] = {};
  for (const regulationId of regulationIds) {
    const list = (state.matches[regulationId] ?? []).filter((match) =>
      carrierIds.has(match.carrierId),
    );
    matches[regulationId] = list;
  }

  return {
    carriers,
    snapshots,
    signals,
    opportunities,
    activities,
    calls,
    regulations,
    matches,
    cases,
    documents,
    tasks,
  };
}
