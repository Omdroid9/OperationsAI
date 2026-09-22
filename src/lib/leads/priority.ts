export type LeadPriority = "high" | "medium" | "low";

/** Approved Phase 2 thresholds: High ≥85, Medium ≥70, Low below 70. */
export function leadPriorityFromScore(score: number): LeadPriority {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export const LEAD_PRIORITY_LABEL: Record<LeadPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const LEAD_PRIORITIES: LeadPriority[] = ["high", "medium", "low"];
