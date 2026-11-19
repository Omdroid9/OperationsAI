import { describe, expect, it } from "vitest";
import {
  approveImpactRun,
  decideProposal,
  describeImpactRun,
  markNoticesReviewed,
  recordTasksCreated,
  type ImpactContext,
  type StoredImpactRun,
} from "@/lib/regulations/impact-run";
import type { RegulationRagResult, RetrievedNotice } from "@/lib/regulations/rag/types";
import type { Regulation, RegulationMatch } from "@/types";

const regulation = { id: "reg_1", sourceText: "Notice text.", sourceSummary: "" } as Regulation;
const notice = (id: string): RetrievedNotice =>
  ({ chunk: { id }, citationFaithfulness: 1, overlapTerms: [] }) as unknown as RetrievedNotice;
const similar = (ids: string[]): RegulationRagResult =>
  ({ method: "bm25", similarNotices: ids.map(notice) }) as RegulationRagResult;
const match = (carrierId: string, matchType: RegulationMatch["matchType"] = "potential") =>
  ({ carrierId, matchType, reason: "Interstate", requiredChange: "Review", audience: "customer" }) as RegulationMatch;

const context = (overrides: Partial<ImpactContext> = {}): ImpactContext => ({
  regulation,
  similar: similar(["fr_a"]),
  customerMatches: [match("c1"), match("c2", "confirmed"), match("c3", "unknown")],
  briefing: null,
  caseByCarrier: new Map([["c1", "case_1"]]),
  ...overrides,
});

const step = (view: ReturnType<typeof describeImpactRun>, id: string) =>
  view.steps.find((s) => s.id === id)!;

/** Runs staff actions in order against the same context. */
function advance(ctx: ImpactContext, ...actions: Array<(run: StoredImpactRun) => StoredImpactRun>) {
  let run = describeImpactRun(null, ctx).stored;
  for (const action of actions) run = action(run);
  return describeImpactRun(run, ctx);
}

describe("describeImpactRun", () => {
  it("runs the automated steps and stops at the first staff step", () => {
    const view = describeImpactRun(null, context());
    expect(view.steps.filter((s) => s.automated).every((s) => s.status === "done")).toBe(true);
    expect(step(view, "review").status).toBe("waiting_on_staff");
    expect(step(view, "decide").status).toBe("pending");
    expect(step(view, "approve").status).toBe("pending");
    expect(view.status).toBe("waiting_on_staff");
  });

  it("proposes only confirmed and potential matches", () => {
    expect(describeImpactRun(null, context()).proposals.map((p) => p.carrierId)).toEqual(["c1", "c2"]);
  });

  it("is blocked without source text", () => {
    const view = describeImpactRun(
      null,
      context({ regulation: { ...regulation, sourceText: " " } as Regulation }),
    );
    expect(view.status).toBe("blocked");
    expect(step(view, "source").status).toBe("blocked");
  });

  it("is ready once notices are reviewed and every customer is decided", () => {
    const view = advance(
      context(),
      markNoticesReviewed,
      (run) => decideProposal(run, "c1", "include"),
      (run) => decideProposal(run, "c2", "exclude"),
    );
    expect(view.status).toBe("ready_to_approve");
    expect(view.blockers).toEqual([]);
  });

  it("is ready after review when there are no customers to decide on", () => {
    const view = advance(context({ customerMatches: [] }), markNoticesReviewed);
    expect(view.status).toBe("ready_to_approve");
    expect(view.includedWithCase).toEqual([]);
  });
});

describe("approval gate", () => {
  it("refuses before notices are reviewed", () => {
    const view = advance(
      context(),
      (run) => decideProposal(run, "c1", "include"),
      (run) => decideProposal(run, "c2", "include"),
    );
    expect(() => approveImpactRun(view, "A. Mehta", "2026-11-11T00:00:00Z")).toThrow(/reviewed/);
  });

  it("refuses while a customer is undecided", () => {
    const view = advance(context(), markNoticesReviewed, (run) => decideProposal(run, "c1", "include"));
    expect(() => approveImpactRun(view, "A. Mehta", "2026-11-11T00:00:00Z")).toThrow(/Decide on 1 customer/);
  });

  it("refuses an unnamed approver", () => {
    const view = advance(context({ customerMatches: [] }), markNoticesReviewed);
    expect(() => approveImpactRun(view, "  ", "2026-11-11T00:00:00Z")).toThrow(/named/);
  });

  it("creates tasks only for included customers that have a case", () => {
    const view = advance(
      context(),
      markNoticesReviewed,
      (run) => decideProposal(run, "c1", "include"),
      (run) => decideProposal(run, "c2", "include"), // included, but no Docket case
    );
    const { run, carrierIds } = approveImpactRun(view, "A. Mehta", "2026-11-11T00:00:00Z");
    expect(carrierIds).toEqual(["c1"]);
    expect(run).toMatchObject({ approvedBy: "A. Mehta", approvedAt: "2026-11-11T00:00:00Z" });
  });

  it("excluded customers never get a task", () => {
    const view = advance(
      context(),
      markNoticesReviewed,
      (run) => decideProposal(run, "c1", "exclude"),
      (run) => decideProposal(run, "c2", "exclude"),
    );
    expect(approveImpactRun(view, "A. Mehta", "2026-11-11T00:00:00Z").carrierIds).toEqual([]);
  });

  it("locks the run after approval", () => {
    const ctx = context({ customerMatches: [] });
    const { run } = approveImpactRun(advance(ctx, markNoticesReviewed), "A. Mehta", "2026-11-11T00:00:00Z");
    expect(() => markNoticesReviewed(run)).toThrow(/already approved/);
    expect(() => decideProposal(run, "c1", "include")).toThrow(/already approved/);
    expect(() => approveImpactRun(describeImpactRun(run, ctx), "B", "2026-11-12T00:00:00Z")).toThrow();
    expect(describeImpactRun(recordTasksCreated(run, 0), ctx).status).toBe("approved");
  });

  it("does not record tasks before approval", () => {
    expect(() => recordTasksCreated(describeImpactRun(null, context()).stored, 2)).toThrow(/before approval/);
  });
});

describe("evidence changes", () => {
  const decided = advance(context(), markNoticesReviewed, (run) => decideProposal(run, "c1", "include")).stored;

  it("discards decisions when the retrieved notices change", () => {
    const view = describeImpactRun(decided, context({ similar: similar(["fr_a", "fr_b"]) }));
    expect(view.stored.noticesReviewed).toBe(false);
    expect(view.stored.decisions).toEqual({});
  });

  it("discards decisions when a customer match changes", () => {
    const view = describeImpactRun(decided, context({ customerMatches: [match("c1", "confirmed")] }));
    expect(view.stored.decisions).toEqual({});
  });

  it("keeps decisions when nothing changed", () => {
    expect(describeImpactRun(decided, context()).stored).toEqual(decided);
  });

  it("keeps an approved run as the record even if evidence later changes", () => {
    const ctx = context({ customerMatches: [] });
    const { run } = approveImpactRun(advance(ctx, markNoticesReviewed), "A. Mehta", "2026-11-11T00:00:00Z");
    const later = describeImpactRun(run, context({ similar: similar(["fr_z"]), customerMatches: [] }));
    expect(later.status).toBe("approved");
    expect(later.stored.approvedBy).toBe("A. Mehta");
  });
});
