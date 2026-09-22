import { DEMO_TODAY } from "@/lib/format";
import type { CaseTask } from "@/types";

/** Match the Docket “expiring soon” banner — only then alert / renew. */
export const RENEWAL_WINDOW_DAYS = 45;

export function daysUntilDate(iso: string, now: Date = DEMO_TODAY): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000);
}

/** True when the date is overdue or within the renewal attention window. */
export function isWithinRenewalWindow(iso: string | null | undefined, now: Date = DEMO_TODAY): boolean {
  if (!iso?.trim()) return false;
  return daysUntilDate(iso, now) <= RENEWAL_WINDOW_DAYS;
}

export function isOpenRenewalAttentionTask(task: CaseTask, now: Date = DEMO_TODAY): boolean {
  if (task.status !== "open" || task.kind !== "renewal") return false;
  return isWithinRenewalWindow(task.dueDate, now);
}
