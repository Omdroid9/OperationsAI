import type { Carrier, Opportunity, OutreachReadiness } from "@/types";

export function outreachReadinessLabel(readiness: OutreachReadiness): string {
  if (readiness === "ready_to_review") return "Ready to review";
  if (readiness === "needs_review") return "Needs review";
  return "Low confidence";
}

export function resolveOutreachReadiness(
  opportunity: Opportunity,
  carrier?: Carrier | null,
): { readiness: OutreachReadiness; reason: string } {
  if (opportunity.outreachReadiness && opportunity.outreachReadinessReason) {
    return {
      readiness: opportunity.outreachReadiness,
      reason: opportunity.outreachReadinessReason,
    };
  }

  const hasPhone = Boolean(carrier?.phone?.trim());
  const hasEmail = Boolean(carrier?.email?.trim());
  const hasContact = hasPhone || hasEmail;
  const parts: string[] = [];
  if (carrier?.powerUnits) parts.push(`${carrier.powerUnits}-truck fleet`);
  if (hasPhone) parts.push("phone on file");
  else if (hasEmail) parts.push("email on file");
  const detail = parts.length > 0 ? parts.join(", ") : "limited contact data on file";

  if (hasContact && opportunity.score >= 60) {
    return {
      readiness: "ready_to_review",
      reason: `Ready to review — ${detail}.`,
    };
  }
  if (hasContact || opportunity.score >= 40) {
    return {
      readiness: "needs_review",
      reason: `Needs review — ${detail}.`,
    };
  }
  return {
    readiness: "low_confidence",
    reason: `Low confidence — ${detail}.`,
  };
}
