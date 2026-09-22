import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { DEMO_TODAY, formatDateShort, plural } from "@/lib/format";
import { consultationNextAction } from "@/lib/consultation/labels";
import { staffDisplayName } from "@/data/staff";
import { isWithinRenewalWindow, RENEWAL_WINDOW_DAYS } from "@/lib/docket/renewal";
import type {
  CaseDocument,
  CaseTask,
  Carrier,
  DemoState,
  Opportunity,
  Regulation,
  ServiceCase,
} from "@/types";

export type AttentionTone = "danger" | "warning" | "info";

export type AttentionCategory =
  | "document_review"
  | "document_expiring"
  | "follow_up"
  | "opportunity"
  | "regulation"
  | "task"
  | "consultation"
  | "service_approval";

export type AttentionLane = "inbound" | "work" | "discovery";

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: AttentionTone;
  category: AttentionCategory;
  lane: AttentionLane;
  sortAt: string;
}

function daysUntil(iso: string, now = DEMO_TODAY): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000);
}

function carrierName(carriers: Carrier[], carrierId: string): string {
  return carriers.find((item) => item.id === carrierId)?.legalName ?? carrierId;
}

export function collectAttentionItems(state: DemoState): AttentionItem[] {
  const items: AttentionItem[] = [];
  const carrierMap = new Map(state.carriers.map((item) => [item.id, item]));
  const caseMap = new Map(state.cases.map((item) => [item.id, item]));

  for (const opportunity of state.opportunities) {
    if (opportunity.consultationStatus === "needs_follow_up") {
      const carrier = carrierMap.get(opportunity.carrierId);
      items.push({
        id: `consult_${opportunity.id}`,
        title: `Consultation needs scheduling · ${carrier?.legalName ?? "Lead"}`,
        detail: `${staffDisplayName(opportunity.assignedTo)} · ${consultationNextAction(opportunity.consultationStatus)}`,
        href: `/opportunities/${opportunity.id}`,
        tone: "warning",
        category: "consultation",
        lane: "work",
        sortAt: opportunity.lastActivityAt,
      });
    }
    if (opportunity.consultationStatus === "scheduled" && opportunity.consultationScheduledAt) {
      const due = new Date(opportunity.consultationScheduledAt).getTime();
      if (due <= DEMO_TODAY.getTime() + 24 * 3600_000) {
        const carrier = carrierMap.get(opportunity.carrierId);
        items.push({
          id: `consult_due_${opportunity.id}`,
          title: `Consultation due · ${carrier?.legalName ?? "Lead"}`,
          detail: `${staffDisplayName(opportunity.assignedTo)} · ${consultationNextAction(opportunity.consultationStatus)}`,
          href: `/opportunities/${opportunity.id}`,
          tone: due <= DEMO_TODAY.getTime() ? "warning" : "info",
        category: "consultation",
        lane: "work",
        sortAt: opportunity.consultationScheduledAt,
        });
      }
    }
    if (opportunity.consultationStatus === "complete") {
      const carrier = carrierMap.get(opportunity.carrierId);
      items.push({
        id: `approve_${opportunity.id}`,
        title: `Service approval pending · ${carrier?.legalName ?? "Lead"}`,
        detail: `${staffDisplayName(opportunity.assignedTo)} · Approve service`,
        href: `/opportunities/${opportunity.id}`,
        tone: "warning",
        category: "service_approval",
        lane: "work",
        sortAt: opportunity.lastActivityAt,
      });
    }
  }

  for (const opportunity of state.opportunities) {
    if (!["DETECTED", "REVIEWED"].includes(opportunity.stage)) continue;
    if (opportunity.recordKind === "prospect" && opportunity.creation.sourceType === "legacy_fmcsa") {
      continue;
    }
    const carrier = carrierMap.get(opportunity.carrierId);
    const discovery = opportunity.recordKind === "prospect";
    items.push({
      id: `opp_review_${opportunity.id}`,
      title: `${carrier?.legalName ?? "Opportunity"} needs review`,
      detail: `${opportunity.signalTitle} · score ${opportunity.score}`,
      href: `/opportunities/${opportunity.id}`,
      tone: discovery ? "info" : opportunity.score >= 85 ? "warning" : "info",
      category: "opportunity",
      lane: discovery ? "discovery" : "inbound",
      sortAt: opportunity.lastActivityAt,
    });
  }

  for (const opportunity of state.opportunities) {
    if (!opportunity.followUpAt) continue;
    const due = new Date(opportunity.followUpAt).getTime();
    if (due > DEMO_TODAY.getTime() + 12 * 3600_000) continue;
    const carrier = carrierMap.get(opportunity.carrierId);
    items.push({
      id: `follow_up_${opportunity.id}`,
      title: `Follow-up due · ${carrier?.legalName ?? "Lead"}`,
      detail: opportunity.nextAction,
      href: `/opportunities/${opportunity.id}`,
      tone: due <= DEMO_TODAY.getTime() ? "warning" : "info",
      category: "follow_up",
      lane: "work",
      sortAt: opportunity.followUpAt,
    });
  }

  for (const regulation of state.regulations) {
    if (regulation.status !== "needs_review") continue;
    items.push({
      id: `reg_${regulation.id}`,
      title: "Regulation needs analysis",
      detail: regulation.title,
      href: `/reglens/${regulation.id}`,
      tone: "info",
      category: "regulation",
      lane: "work",
      sortAt: regulation.createdAt,
    });
  }

  for (const document of state.documents) {
    const serviceCase = caseMap.get(document.caseId);
    if (!serviceCase) continue;
    const name = carrierName(state.carriers, serviceCase.carrierId);
    const docLabel = DOCUMENT_TYPE_LABEL[document.documentType] ?? document.documentType;

    if (document.reviewStatus === "NEEDS_REVIEW") {
      items.push({
        id: `doc_review_${document.id}`,
        title: `${docLabel} needs confirmation`,
        detail: `${name}${document.personName ? ` · ${document.personName}` : ""}`,
        href: `/docket/${document.caseId}`,
        tone: "warning",
        category: "document_review",
        lane: "work",
        sortAt: document.createdAt,
      });
    }

    if (document.expirationDate && document.reviewStatus !== "REJECTED") {
      const days = daysUntil(document.expirationDate);
      if (days <= RENEWAL_WINDOW_DAYS) {
        const expired = days < 0;
        items.push({
          id: `doc_exp_${document.id}`,
          title: expired
            ? `${docLabel} expired ${formatDateShort(document.expirationDate)}`
            : days <= 14
              ? `${docLabel} expires ${formatDateShort(document.expirationDate)}`
              : `${docLabel} expiring soon`,
          detail: expired
            ? `${name}${document.personName ? ` · ${document.personName}` : ""} · ${Math.abs(days)} ${plural(Math.abs(days), "day")} overdue`
            : `${name}${document.personName ? ` · ${document.personName}` : ""} · ${days} ${plural(days, "day")} left`,
          href: `/docket/${document.caseId}`,
          tone: expired || days <= 14 ? "danger" : "warning",
          category: "document_expiring",
          lane: "work",
          sortAt: document.expirationDate,
        });
      }
    }
  }

  for (const task of state.tasks) {
    if (task.status !== "open") continue;
    // Renewal tasks only alert when due within the window (or overdue).
    if (task.kind === "renewal") {
      if (!isWithinRenewalWindow(task.dueDate)) continue;
    } else if (task.priority !== "high") {
      continue;
    }
    const serviceCase = caseMap.get(task.caseId);
    if (!serviceCase) continue;
    items.push({
      id: `task_${task.id}`,
      title: task.title,
      detail: `${carrierName(state.carriers, serviceCase.carrierId)} · ${task.description}`,
      href: `/docket/${task.caseId}`,
      tone: task.dueDate && daysUntil(task.dueDate) <= 3 ? "danger" : "warning",
      category: "task",
      lane: "work",
      sortAt: task.dueDate ?? task.createdAt,
    });
  }

  const toneRank: Record<AttentionTone, number> = { danger: 0, warning: 1, info: 2 };
  return items.sort((a, b) => {
    const toneDiff = toneRank[a.tone] - toneRank[b.tone];
    if (toneDiff !== 0) return toneDiff;
    return a.sortAt.localeCompare(b.sortAt);
  });
}

export function attentionCount(state: DemoState): number {
  return collectAttentionItems(state).filter((item) => item.lane !== "discovery").length;
}

export function partitionAttention(items: AttentionItem[]) {
  return {
    inbound: items.filter((item) => item.lane === "inbound"),
    work: items.filter((item) => item.lane === "work"),
    discovery: items.filter((item) => item.lane === "discovery"),
  };
}
