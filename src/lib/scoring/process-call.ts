import {
  CALL_SCORE_ADJUSTMENTS,
  calculateOpportunityScore,
  capScore,
} from "@/lib/scoring/opportunity-score";
import type { InterestLevel, Opportunity, OpportunityStage, QualificationResult, ScoreLine } from "@/types";

function resolvedInterestLevel(
  qualification: QualificationResult,
): InterestLevel | null {
  return qualification.interest_level === "unknown" ? null : qualification.interest_level;
}

export function processCallResult(
  opportunity: Opportunity,
  qualification: QualificationResult,
): {
  score: number;
  scoreBreakdown: ScoreLine[];
  stage: OpportunityStage;
  nextAction: string;
  preferredLanguage: string | null;
  detectedLanguages: string[];
  interestLevel: InterestLevel | null;
  callbackRequested: boolean;
  followUpAt: string | null;
} {
  const extra: ScoreLine[] = [];

  if (qualification.needs.length > 0) {
    extra.push({
      key: "CALL_NEED",
      label: "Confirmed relevant need",
      points: CALL_SCORE_ADJUSTMENTS.confirmedNeed,
      provenance: "AI_EXTRACTED",
    });
  }
  if (qualification.callback_requested === true) {
    extra.push({
      key: "CALL_CALLBACK",
      label: "Requested callback",
      points: CALL_SCORE_ADJUSTMENTS.requestedCallback,
      provenance: "AI_EXTRACTED",
    });
  }
  if (qualification.current_provider) {
    extra.push({
      key: "CALL_PROVIDER",
      label: "Existing provider",
      points: CALL_SCORE_ADJUSTMENTS.existingProvider,
      provenance: "AI_EXTRACTED",
    });
  }
  if (qualification.interest_level === "none") {
    extra.push({
      key: "CALL_NOT_INTERESTED",
      label: "Explicitly not interested",
      points: CALL_SCORE_ADJUSTMENTS.notInterested,
      provenance: "AI_EXTRACTED",
    });
  }

  const scoreBreakdown = [
    ...opportunity.scoreBreakdown.filter((line) => !line.key.startsWith("CALL_")),
    ...extra,
  ];
  const score = capScore(calculateOpportunityScore(scoreBreakdown));

  const notInterested = qualification.interest_level === "none";
  const stage: OpportunityStage = notInterested ? "LOST" : "QUALIFIED";

  const nextAction = notInterested
    ? "No follow-up"
    : qualification.suggested_next_step?.trim()
      ? qualification.suggested_next_step.trim()
      : qualification.consultation_accepted === true
        ? "Schedule free consultation"
        : qualification.callback_requested === true
          ? "Schedule follow-up"
          : "Review qualification";

  const preferredLanguage =
    qualification.preferred_language?.trim() ||
    opportunity.preferredLanguage ||
    null;

  return {
    score,
    scoreBreakdown,
    stage,
    nextAction,
    preferredLanguage,
    detectedLanguages: qualification.detected_languages,
    interestLevel: resolvedInterestLevel(qualification),
    callbackRequested: qualification.callback_requested === true,
    followUpAt:
      qualification.callback_requested === true ? opportunity.followUpAt : opportunity.followUpAt,
  };
}
