import type { Briefing } from "@/lib/regulations/briefing";
import type { RegulationRagResult } from "@/lib/regulations/rag/types";
import type { Regulation, RegulationMatch } from "@/types";

/**
 * The path from a notice to Docket tasks, as explicit steps with one human gate.
 *
 * Automated steps (source, retrieve, match, cite check, propose) are derived
 * from data every time, so they cannot drift from what the page shows. Only
 * staff decisions are stored: that similar notices were reviewed, which
 * customers to include, and who approved. Nothing reaches a customer's case
 * until `approveImpactRun` succeeds, and it refuses unless every gate is met.
 */

export type ImpactDecision = "include" | "exclude";

/** The only state that is persisted. */
export type StoredImpactRun = {
  regulationId: string;
  /** Fingerprint of the evidence the decisions were made on. */
  evidenceKey: string;
  noticesReviewed: boolean;
  decisions: Record<string, ImpactDecision>;
  approvedBy: string | null;
  approvedAt: string | null;
  tasksCreated: number | null;
};

export type ImpactStepId =
  | "source"
  | "retrieve"
  | "match"
  | "cite_check"
  | "review"
  | "decide"
  | "approve";

export type ImpactStepStatus = "done" | "waiting_on_staff" | "pending" | "blocked";

export type ImpactStep = {
  id: ImpactStepId;
  label: string;
  status: ImpactStepStatus;
  detail: string;
  automated: boolean;
};

export type ImpactProposal = {
  carrierId: string;
  matchType: "confirmed" | "potential";
  reason: string;
  requiredChange: string;
  supportingNoticeIds: string[];
  caseId: string | null;
  decision: ImpactDecision | null;
};

export type ImpactRunView = {
  stored: StoredImpactRun;
  steps: ImpactStep[];
  proposals: ImpactProposal[];
  status: "blocked" | "waiting_on_staff" | "ready_to_approve" | "approved";
  /** Why approval is not available yet. Empty when it is. */
  blockers: string[];
  includedWithCase: string[];
};

export type ImpactContext = {
  regulation: Regulation;
  similar: RegulationRagResult | undefined;
  customerMatches: RegulationMatch[];
  briefing: Briefing | null | undefined;
  caseByCarrier: Map<string, string>;
};

export function evidenceKeyFor(context: ImpactContext): string {
  const { regulation, similar, customerMatches } = context;
  return [
    regulation.id,
    regulation.sourceText.length,
    (similar?.similarNotices ?? []).map((n) => n.chunk.id).join(","),
    customerMatches
      .filter((m) => m.matchType !== "unknown")
      .map((m) => `${m.carrierId}:${m.matchType}`)
      .sort()
      .join(","),
  ].join("|");
}

export function newImpactRun(regulationId: string, evidenceKey: string): StoredImpactRun {
  return {
    regulationId,
    evidenceKey,
    noticesReviewed: false,
    decisions: {},
    approvedBy: null,
    approvedAt: null,
    tasksCreated: null,
  };
}

/**
 * Decisions made on different evidence do not carry over: if the notices or
 * matches changed before approval, the run starts again. An approved run is a
 * record of what happened and is kept as it was.
 */
export function reconcileImpactRun(
  stored: StoredImpactRun | null | undefined,
  context: ImpactContext,
): StoredImpactRun {
  const key = evidenceKeyFor(context);
  if (!stored || stored.regulationId !== context.regulation.id) {
    return newImpactRun(context.regulation.id, key);
  }
  if (stored.approvedAt) return stored;
  return stored.evidenceKey === key ? stored : newImpactRun(context.regulation.id, key);
}

export function describeImpactRun(
  storedInput: StoredImpactRun | null | undefined,
  context: ImpactContext,
): ImpactRunView {
  const stored = reconcileImpactRun(storedInput, context);
  const { regulation, similar, briefing, caseByCarrier } = context;
  const notices = similar?.similarNotices ?? [];
  const supportingIds = notices.slice(0, 3).map((n) => n.chunk.id);
  const approved = stored.approvedAt != null;

  const proposals: ImpactProposal[] = context.customerMatches
    .filter((match) => match.matchType !== "unknown")
    .map((match) => ({
      carrierId: match.carrierId,
      matchType: match.matchType as "confirmed" | "potential",
      reason: match.reason,
      requiredChange: match.requiredChange,
      supportingNoticeIds: supportingIds,
      caseId: caseByCarrier.get(match.carrierId) ?? null,
      decision: stored.decisions[match.carrierId] ?? null,
    }));

  const hasSource = Boolean(regulation.sourceText.trim() || regulation.sourceSummary.trim());
  const undecided = proposals.filter((p) => p.decision == null).length;
  const included = proposals.filter((p) => p.decision === "include");
  const includedWithCase = included.filter((p) => p.caseId).map((p) => p.carrierId);
  const labelOnly = notices.filter(
    (n) => n.citationFaithfulness != null && n.citationFaithfulness < 1,
  ).length;
  const droppedStatements = briefing?.dropped.length ?? 0;

  const blockers: string[] = [];
  if (!hasSource) blockers.push("Add source text to this notice.");
  if (hasSource && !similar) blockers.push("Similar notices are still loading.");
  if (hasSource && similar && !stored.noticesReviewed) {
    blockers.push("Mark similar notices reviewed.");
  }
  if (undecided > 0) {
    blockers.push(
      `Decide on ${undecided} ${undecided === 1 ? "customer" : "customers"}: include or leave out.`,
    );
  }

  const status: ImpactRunView["status"] = approved
    ? "approved"
    : !hasSource
      ? "blocked"
      : blockers.length === 0
        ? "ready_to_approve"
        : "waiting_on_staff";

  const after = (ready: boolean, done: boolean): ImpactStepStatus =>
    done ? "done" : ready ? "waiting_on_staff" : "pending";
  const automatedReady = hasSource && similar != null;

  const steps: ImpactStep[] = [
    {
      id: "source",
      label: "Read the notice",
      automated: true,
      status: hasSource ? "done" : "blocked",
      detail: hasSource ? "Source text on file." : "No source text yet.",
    },
    {
      id: "retrieve",
      label: "Find similar notices",
      automated: true,
      status: !hasSource ? "pending" : similar ? "done" : "pending",
      detail: similar
        ? `${notices.length} ${notices.length === 1 ? "notice" : "notices"} found (${similar.method === "bm25" ? "shared terms" : "embedding similarity and shared terms"}).`
        : "Not run yet.",
    },
    {
      id: "match",
      label: "Match current customers",
      automated: true,
      status: automatedReady ? "done" : "pending",
      detail: `${proposals.length} ${proposals.length === 1 ? "customer profile overlaps" : "customer profiles overlap"} (rules on operating profile, not a model).`,
    },
    {
      id: "cite_check",
      label: "Check citations",
      automated: true,
      status: automatedReady ? "done" : "pending",
      detail:
        `${labelOnly} of ${notices.length} notices had a term that matched a label only; those terms are hidden.` +
        (briefing
          ? ` ${droppedStatements} briefing ${droppedStatements === 1 ? "statement" : "statements"} removed as unsupported.`
          : ""),
    },
    {
      id: "review",
      label: "Review similar notices",
      automated: false,
      status: after(automatedReady, stored.noticesReviewed),
      detail: stored.noticesReviewed ? "Reviewed by staff." : "Staff confirm the notices are relevant.",
    },
    {
      id: "decide",
      label: "Decide per customer",
      automated: false,
      status:
        proposals.length === 0
          ? automatedReady
            ? "done"
            : "pending"
          : after(automatedReady && stored.noticesReviewed, undecided === 0),
      detail:
        proposals.length === 0
          ? "No customers to decide on."
          : `${included.length} included, ${proposals.length - included.length - undecided} left out, ${undecided} undecided.`,
    },
    {
      id: "approve",
      label: "Approve and create case tasks",
      automated: false,
      status: approved ? "done" : status === "ready_to_approve" ? "waiting_on_staff" : "pending",
      detail: approved
        ? `Approved by ${stored.approvedBy}. ${stored.tasksCreated ?? 0} ${stored.tasksCreated === 1 ? "task" : "tasks"} created.`
        : `Creates a review task on ${includedWithCase.length} Docket ${includedWithCase.length === 1 ? "case" : "cases"}. Nothing is sent to carriers.`,
    },
  ];

  return { stored, steps, proposals, status, blockers, includedWithCase };
}

// --- Staff actions. Each returns a new record; none mutates. -----------------------

function assertOpen(run: StoredImpactRun): void {
  if (run.approvedAt) throw new Error("This run is already approved and cannot be changed.");
}

export function markNoticesReviewed(run: StoredImpactRun): StoredImpactRun {
  assertOpen(run);
  return { ...run, noticesReviewed: true };
}

export function decideProposal(
  run: StoredImpactRun,
  carrierId: string,
  decision: ImpactDecision,
): StoredImpactRun {
  assertOpen(run);
  return { ...run, decisions: { ...run.decisions, [carrierId]: decision } };
}

/**
 * The gate. Returns the approved record and the carriers whose cases get a task.
 * Throws when any blocker remains, so a caller cannot create tasks early.
 */
export function approveImpactRun(
  view: ImpactRunView,
  approvedBy: string,
  now: string,
): { run: StoredImpactRun; carrierIds: string[] } {
  assertOpen(view.stored);
  if (view.status !== "ready_to_approve") {
    throw new Error(`Cannot approve yet: ${view.blockers.join(" ") || "run is not ready."}`);
  }
  if (!approvedBy.trim()) throw new Error("Approval needs a named staff member.");
  return {
    run: { ...view.stored, approvedBy: approvedBy.trim(), approvedAt: now },
    carrierIds: view.includedWithCase,
  };
}

export function recordTasksCreated(run: StoredImpactRun, tasksCreated: number): StoredImpactRun {
  if (!run.approvedAt) throw new Error("Tasks cannot be recorded before approval.");
  return { ...run, tasksCreated };
}
