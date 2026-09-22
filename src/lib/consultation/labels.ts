import type { ConsultationStatus } from "@/types";

export const CONSULTATION_STATUS_LABEL: Record<ConsultationStatus, string> = {
  not_applicable: "Not applicable",
  needs_follow_up: "Needs follow-up",
  scheduled: "Consultation scheduled",
  complete: "Consultation complete",
  service_approved: "Service approved",
  not_moving_forward: "Not moving forward",
};

export function consultationNextAction(status: ConsultationStatus): string {
  switch (status) {
    case "needs_follow_up":
      return "Schedule consultation";
    case "scheduled":
      return "Complete consultation";
    case "complete":
      return "Approve service";
    case "service_approved":
      return "Start service";
    case "not_moving_forward":
      return "No follow-up";
    default:
      return "Review record";
  }
}
