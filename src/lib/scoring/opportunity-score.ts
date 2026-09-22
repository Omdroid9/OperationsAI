import type { Carrier, DataProvenance, ScoreLine, Signal } from "@/types";

export const SCORE_WEIGHTS = {
  NEW_ENTRANT: 30,
  AUTHORIZED_FOR_HIRE: 20,
  INTERSTATE: 15,
  SMALL_FLEET: 15,
  CALIFORNIA: 10,
  RECENT_EVENT: 10,
  CRM_CONTEXT: 2,
} as const;

export const CALL_SCORE_ADJUSTMENTS = {
  confirmedNeed: 10,
  requestedCallback: 10,
  existingProvider: -5,
  notInterested: -50,
} as const;

export function isSmallFleet(powerUnits: number): boolean {
  return powerUnits >= 1 && powerUnits <= 10;
}

export function capScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function getOpportunityScoreBreakdown(
  carrier: Carrier,
  signals: Signal[],
  extraLines: ScoreLine[] = [],
): ScoreLine[] {
  const lines: ScoreLine[] = [];

  const pushUnique = (line: ScoreLine) => {
    if (line.points === 0) return;
    if (lines.some((existing) => existing.key === line.key)) return;
    lines.push(line);
  };

  for (const signal of signals) {
    pushUnique({
      key: signal.type,
      label: signal.title,
      points: signal.scoreContribution,
      provenance: signal.source,
    });
  }

  if (carrier.state === "CA" && !lines.some((line) => line.key === "CALIFORNIA")) {
    pushUnique({
      key: "CALIFORNIA",
      label: "California",
      points: SCORE_WEIGHTS.CALIFORNIA,
      provenance: "DERIVED",
    });
  }

  for (const line of extraLines) {
    pushUnique(line);
  }

  return lines;
}

export function calculateOpportunityScore(lines: ScoreLine[]): number {
  const total = lines.reduce((sum, line) => sum + line.points, 0);
  return capScore(total);
}

export function provenanceForScoreLine(key: string): DataProvenance {
  if (key === "CRM_CONTEXT") return "CRM";
  if (key.startsWith("CALL_")) return "AI_EXTRACTED";
  return "DERIVED";
}
