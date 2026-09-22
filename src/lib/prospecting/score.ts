import { daysSince, parseCensusAddDate, parseCensusMcs150Date } from "@/lib/prospecting/dates";
import {
  isAuthorizedForHire,
  isInterstateOperation,
  normalizeEmail,
  normalizePhone,
} from "@/lib/prospecting/normalize";
import type { ProspectingScoreLine } from "@/lib/prospecting/types";

export interface ScoreInput {
  powerUnits: number;
  addDate: string | null;
  mcs150Date: string | null;
  carrierOperation: string | null;
  classdef: string | null;
  phone: string | null;
  email: string | null;
}

function fleetFitPoints(powerUnits: number): { points: number; label: string } {
  if (powerUnits >= 1 && powerUnits <= 5) {
    return { points: 20, label: "Small fleet (1–5 trucks) — strong onboarding fit" };
  }
  if (powerUnits >= 6 && powerUnits <= 10) {
    return { points: 18, label: "Mid-small fleet (6–10 trucks) — onboarding and software fit" };
  }
  if (powerUnits >= 11 && powerUnits <= 15) {
    return { points: 14, label: "Growing fleet (11–15 trucks) — compliance setup fit" };
  }
  if (powerUnits >= 16 && powerUnits <= 20) {
    return { points: 10, label: "Upper small fleet (16–20 trucks) — ongoing support fit" };
  }
  return { points: 0, label: "" };
}

function registrationRecencyPoints(addDate: string | null, now = new Date()): ProspectingScoreLine | null {
  const parsed = parseCensusAddDate(addDate);
  if (!parsed) return null;
  const days = daysSince(parsed, now);
  if (days <= 90) {
    return {
      key: "REGISTRATION_90",
      label: "Registered within 90 days",
      points: 35,
      field: "add_date",
      provenance: "FMCSA Census",
    };
  }
  if (days <= 365) {
    return {
      key: "REGISTRATION_365",
      label: "Registered within 12 months",
      points: 25,
      field: "add_date",
      provenance: "FMCSA Census",
    };
  }
  if (days <= 548) {
    return {
      key: "REGISTRATION_548",
      label: "Registered within 18 months",
      points: 10,
      field: "add_date",
      provenance: "FMCSA Census",
    };
  }
  return null;
}

export function scoreDiscoveredProspect(input: ScoreInput, now = new Date()): {
  score: number;
  scoreLines: ProspectingScoreLine[];
} {
  const lines: ProspectingScoreLine[] = [];

  const registration = registrationRecencyPoints(input.addDate, now);
  if (registration) lines.push(registration);

  const fleet = fleetFitPoints(input.powerUnits);
  if (fleet.points > 0) {
    lines.push({
      key: "FLEET_FIT",
      label: fleet.label,
      points: fleet.points,
      field: "power_units",
      provenance: "FMCSA Census",
    });
  }

  if (isAuthorizedForHire(input.classdef)) {
    lines.push({
      key: "AUTHORIZED_FOR_HIRE",
      label: "Authorized for hire — filings and operating authority support may apply",
      points: 15,
      field: "classdef",
      provenance: "FMCSA Census",
    });
  }

  if (isInterstateOperation(input.carrierOperation)) {
    lines.push({
      key: "INTERSTATE",
      label: "Interstate operation — IRP/IFTA and federal filing support may apply",
      points: 10,
      field: "carrier_operation",
      provenance: "FMCSA Census",
    });
  }

  const mcs150 = parseCensusMcs150Date(input.mcs150Date);
  if (mcs150 && daysSince(mcs150, now) <= 90) {
    lines.push({
      key: "RECENT_FILING",
      label: "Recent MCS-150 filing signal on record",
      points: 8,
      field: "mcs150_date",
      provenance: "FMCSA Census",
    });
  }

  const hasPhone = Boolean(normalizePhone(input.phone));
  const hasEmail = Boolean(normalizeEmail(input.email));
  if (hasPhone && hasEmail) {
    lines.push({
      key: "CONTACT_BOTH",
      label: "Phone and email on file",
      points: 12,
      field: "phone,email_address",
      provenance: "FMCSA Census",
    });
  } else if (hasPhone) {
    lines.push({
      key: "CONTACT_PHONE",
      label: "Phone on file",
      points: 8,
      field: "phone",
      provenance: "FMCSA Census",
    });
  } else if (hasEmail) {
    lines.push({
      key: "CONTACT_EMAIL",
      label: "Email on file",
      points: 4,
      field: "email_address",
      provenance: "FMCSA Census",
    });
  }

  const score = Math.min(100, lines.reduce((sum, line) => sum + line.points, 0));
  return { score, scoreLines: lines };
}

export function buildReviewReason(lines: ProspectingScoreLine[], suggestedService: string): string {
  const highlights = lines
    .slice()
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((line) => line.label.replace(/\s—.*$/, "").toLowerCase());
  if (highlights.length === 0) {
    return `Possible fit for ${suggestedService.toLowerCase()}. Review recommended before outreach.`;
  }
  return `${highlights.join("; ")}. Possible fit for ${suggestedService.toLowerCase()}. Review recommended.`;
}
