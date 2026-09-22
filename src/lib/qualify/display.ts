import type { InterestLevel, QualificationResult } from "@/types";

export function formatCaptured(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "Not captured";
}

export function formatInterest(level: InterestLevel): string {
  if (level === "unknown") return "Not captured";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function formatTriStateBoolean(
  value: boolean | null | undefined,
  labels?: { true: string; false: string },
): string {
  if (value === true) return labels?.true ?? "Yes";
  if (value === false) return labels?.false ?? "No";
  return "Not captured";
}

export function formatConsultation(qualification: QualificationResult): string {
  if (qualification.consultation_accepted === true) {
    const preference = qualification.consultation_preference?.trim();
    return preference ? `Accepted — ${preference}` : "Accepted";
  }
  if (qualification.consultation_accepted === false) return "Declined";
  return "Not captured";
}

export function formatCallback(qualification: QualificationResult): string {
  if (qualification.callback_requested === true) {
    return qualification.callback_time?.trim() || "Requested";
  }
  if (qualification.callback_requested === false) return "Not requested";
  return "Not captured";
}

export function primaryNeed(qualification: QualificationResult): string {
  return qualification.needs[0]?.trim() ? qualification.needs[0] : "Not captured";
}

export function callOutcome(qualification: QualificationResult): string {
  return (
    qualification.call_outcome?.trim() ||
    qualification.summary_english?.trim() ||
    "Not captured"
  );
}

export function suggestedNextStep(
  qualification: QualificationResult,
  fallback?: string | null,
): string {
  if (qualification.suggested_next_step?.trim()) {
    return qualification.suggested_next_step.trim();
  }
  if (qualification.consultation_accepted === true) {
    return "Schedule free consultation";
  }
  if (qualification.callback_requested === true) {
    return "Schedule follow-up";
  }
  return fallback?.trim() || "Review qualification";
}

export function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

export function qualificationProvenance(
  qualification: QualificationResult,
  callStatus: "simulated" | string,
  provider: string,
): "DEMO" | "AI_EXTRACTED" | "TRANSCRIPT_EXTRACTED" {
  if (callStatus === "simulated" || provider === "demo") return "DEMO";
  if (qualification.source === "transcript_extracted") return "TRANSCRIPT_EXTRACTED";
  return "AI_EXTRACTED";
}
