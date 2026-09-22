import type { CaseDocument, CaseTask } from "@/types";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { isOpenRenewalAttentionTask } from "@/lib/docket/renewal";

export interface CaseTimelineEvent {
  id: string;
  label: string;
  detail: string;
  at: string;
  tone: "muted" | "active" | "complete";
}

export function buildCaseTimeline(
  documents: CaseDocument[],
  tasks: CaseTask[],
): CaseTimelineEvent[] {
  const events: CaseTimelineEvent[] = [];

  for (const doc of documents) {
    const typeLabel = DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType;
    if (doc.fileName && doc.reviewStatus === "UPLOADED") {
      events.push({
        id: `upload_${doc.id}`,
        label: "Uploaded",
        detail: typeLabel,
        at: doc.createdAt,
        tone: "complete",
      });
    }
    if (doc.reviewStatus === "NEEDS_REVIEW" || doc.reviewStatus === "EXTRACTED") {
      events.push({
        id: `extract_${doc.id}`,
        label: "Extracted",
        detail: `${typeLabel} — review recommended`,
        at: doc.createdAt,
        tone: "active",
      });
    }
    if (doc.reviewStatus === "VERIFIED") {
      events.push({
        id: `verify_${doc.id}`,
        label: "Verified",
        detail: typeLabel,
        at: doc.createdAt,
        tone: "complete",
      });
    }
    if (doc.expirationVerified && doc.expirationDate) {
      events.push({
        id: `exp_${doc.id}`,
        label: "Expiration confirmed",
        detail: `${typeLabel} · ${doc.expirationDate}`,
        at: doc.createdAt,
        tone: "complete",
      });
    }
  }

  for (const task of tasks) {
    // Only surface renewals that are overdue or inside the 45-day window.
    if (isOpenRenewalAttentionTask(task)) {
      events.push({
        id: `renewal_${task.id}`,
        label: "Renewal action due",
        detail: task.title,
        at: task.dueDate ?? task.createdAt,
        tone: "active",
      });
    }
    if (task.status === "done") {
      events.push({
        id: `done_${task.id}`,
        label: "Complete",
        detail: task.title,
        at: task.dueDate ?? task.createdAt,
        tone: "complete",
      });
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}
