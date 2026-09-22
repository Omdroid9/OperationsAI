import { daysSince, parseCensusAddDate } from "@/lib/prospecting/dates";
import type { OutreachReadiness, ProspectingScoreLine } from "@/lib/prospecting/types";

export function suggestService(input: {
  powerUnits: number;
  classdef: string | null;
  carrierOperation: string | null;
  addDate: string | null;
}): string {
  const recent =
    parseCensusAddDate(input.addDate) &&
    daysSince(parseCensusAddDate(input.addDate)!, new Date()) <= 365;

  if (recent && input.powerUnits <= 10) {
    return "Onboarding and compliance setup";
  }
  if ((input.classdef ?? "").toUpperCase().includes("AUTHORIZED FOR HIRE")) {
    return "Filings, renewals, and documentation support";
  }
  if (input.powerUnits >= 11) {
    return "Ongoing compliance and software support";
  }
  if ((input.carrierOperation ?? "").toUpperCase() === "A") {
    return "Interstate filing and software support";
  }
  return "Compliance setup and software support";
}

export function outreachReadiness(input: {
  score: number;
  scoreLines: ProspectingScoreLine[];
  powerUnits: number;
  phone: string | null;
  email: string | null;
  addDate: string | null;
}): { readiness: OutreachReadiness; reason: string } {
  const hasPhone = Boolean(input.phone);
  const hasEmail = Boolean(input.email);
  const hasContact = hasPhone || hasEmail;
  const registrationLine = input.scoreLines.find((line) => line.key.startsWith("REGISTRATION_"));
  const recentRegistration = Boolean(registrationLine && registrationLine.points >= 25);
  const fleetLine = input.scoreLines.find((line) => line.key === "FLEET_FIT");

  const parts: string[] = [];
  if (registrationLine) {
    if (registrationLine.points >= 35) parts.push("recently registered");
    else if (registrationLine.points >= 25) parts.push("registered within 12 months");
    else parts.push("registered within 18 months");
  }
  if (input.powerUnits > 0) parts.push(`${input.powerUnits}-truck fleet`);
  if (hasPhone) parts.push("phone on file");
  else if (hasEmail) parts.push("email on file");

  const detail = parts.length > 0 ? parts.join(", ") : "limited public contact data";

  if (recentRegistration && hasContact && input.score >= 50) {
    return {
      readiness: "ready_to_review",
      reason: `Ready to review — ${detail}.`,
    };
  }

  if (hasContact && input.score >= 30) {
    return {
      readiness: "needs_review",
      reason: `Needs review — ${detail}.`,
    };
  }

  if (!hasContact) {
    return {
      readiness: "low_confidence",
      reason: `Low confidence — ${detail}; contact data missing.`,
    };
  }

  if (input.score < 30 && !fleetLine) {
    return {
      readiness: "low_confidence",
      reason: `Low confidence — ${detail}; weak market signals in returned fields.`,
    };
  }

  return {
    readiness: "needs_review",
    reason: `Needs review — ${detail}.`,
  };
}

export function outreachReadinessLabel(readiness: OutreachReadiness): string {
  if (readiness === "ready_to_review") return "Ready to review";
  if (readiness === "needs_review") return "Needs review";
  return "Low confidence";
}
