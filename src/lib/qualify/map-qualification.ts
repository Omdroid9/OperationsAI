import { extractQualificationFromTranscript } from "@/lib/qualify/extract-from-transcript";
import { resolveTranscriptContent } from "@/lib/qualify/transcript-fetch";
import { qualificationResultSchema } from "@/lib/validation/schemas";
import type { QualificationResult, QualificationSource } from "@/types";

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function flattenGathered(
  gathered: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!gathered || typeof gathered !== "object") return null;
  const nested = gathered.extracted_variables;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return { ...(nested as Record<string, unknown>), ...gathered };
  }
  return gathered;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "yes") return true;
  if (value === "false" || value === "no") return false;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeInterest(value: unknown): QualificationResult["interest_level"] {
  const raw = asString(value) ?? (typeof value === "string" ? value.trim().toLowerCase() : null);
  if (raw === "high" || raw === "medium" || raw === "low" || raw === "none") return raw;
  return "unknown";
}

function emptyQualification(): QualificationResult {
  return qualificationResultSchema.parse({
    language: null,
    preferred_language: null,
    detected_languages: [],
    contact_verified: null,
    fleet_size_confirmed: null,
    compliance_management: "unknown",
    current_provider: null,
    needs: [],
    interest_level: "unknown",
    callback_requested: null,
    callback_time: null,
    consultation_accepted: null,
    consultation_preference: null,
    objections: [],
    summary_english: null,
    call_outcome: null,
    suggested_next_step: null,
  });
}

export function mapDograhGatheredContext(
  gathered: Record<string, unknown> | null | undefined,
): QualificationResult | null {
  gathered = flattenGathered(gathered);
  if (!gathered) return null;

  const needsRaw =
    gathered.needs ?? gathered.primary_need ?? gathered.primaryNeed ?? gathered.primary_needs;
  const needs = Array.isArray(needsRaw)
    ? needsRaw.map((item) => String(item)).filter(Boolean)
    : asString(needsRaw)
      ? [asString(needsRaw)!]
      : [];

  const languagesRaw = gathered.detected_languages ?? gathered.detectedLanguages;
  const detected = Array.isArray(languagesRaw)
    ? languagesRaw.map((item) => String(item)).filter(Boolean)
    : [];

  const complianceRaw =
    asString(gathered.compliance_management) ?? asString(gathered.complianceManagement);
  const compliance = ["internal", "external", "mixed", "unknown"].includes(complianceRaw ?? "")
    ? (complianceRaw as QualificationResult["compliance_management"])
    : "unknown";

  const candidate: QualificationResult = {
    language: asString(gathered.language) ?? asString(gathered.call_language) ?? null,
    preferred_language:
      asString(gathered.preferred_language) ??
      asString(gathered.preferredLanguage) ??
      asString(gathered.follow_up_language) ??
      null,
    detected_languages: detected,
    contact_verified:
      asBoolean(gathered.contact_verified) ?? asBoolean(gathered.contactVerified),
    fleet_size_confirmed:
      asNumber(gathered.fleet_size_confirmed) ?? asNumber(gathered.fleetSizeConfirmed),
    compliance_management: compliance,
    current_provider:
      asString(gathered.current_provider) ?? asString(gathered.currentProvider),
    needs,
    interest_level: normalizeInterest(
      gathered.interest_level ?? gathered.interestLevel ?? gathered.interest,
    ),
    callback_requested:
      asBoolean(gathered.callback_requested) ?? asBoolean(gathered.callbackRequested),
    callback_time: asString(gathered.callback_time) ?? asString(gathered.callbackTime),
    consultation_accepted:
      asBoolean(gathered.consultation_accepted) ??
      asBoolean(gathered.consultationAccepted) ??
      asBoolean(gathered.free_consultation_accepted) ??
      asBoolean(gathered.freeConsultationAccepted),
    consultation_preference:
      asString(gathered.consultation_preference) ??
      asString(gathered.consultationPreference) ??
      asString(gathered.consultation_timing) ??
      asString(gathered.consultationTiming),
    objections: Array.isArray(gathered.objections)
      ? gathered.objections.map((item) => String(item)).filter(Boolean)
      : [],
    summary_english:
      asString(gathered.summary_english) ?? asString(gathered.summary) ?? null,
    call_outcome: asString(gathered.call_outcome) ?? asString(gathered.outcome) ?? null,
    suggested_next_step:
      asString(gathered.suggested_next_step) ??
      asString(gathered.suggestedNextStep) ??
      asString(gathered.next_step) ??
      null,
    source: "dograh_structured",
  };

  const parsed = qualificationResultSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function isFieldMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === "unknown") return true;
  if (typeof value === "string" && !value.trim()) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function qualificationNeedsTranscriptExtraction(
  qualification: QualificationResult | null,
): boolean {
  if (!qualification) return true;
  const missingOutcome =
    isFieldMissing(qualification.call_outcome) && isFieldMissing(qualification.summary_english);
  const missingInterest = qualification.interest_level === "unknown";
  const missingNeed = qualification.needs.length === 0;
  const missingConsultation = qualification.consultation_accepted === null;
  const missingCallback = qualification.callback_requested === null;
  return missingOutcome && missingInterest && missingNeed && missingConsultation && missingCallback;
}

function mergeQualification(
  base: QualificationResult,
  extracted: QualificationResult,
): QualificationResult {
  const source: QualificationSource =
    base.source === "dograh_structured" ? "mixed" : extracted.source ?? "transcript_extracted";

  const merged: QualificationResult = {
    language: base.language ?? extracted.language,
    preferred_language: base.preferred_language ?? extracted.preferred_language,
    detected_languages: base.detected_languages.length
      ? base.detected_languages
      : extracted.detected_languages,
    contact_verified: base.contact_verified ?? extracted.contact_verified,
    fleet_size_confirmed: base.fleet_size_confirmed ?? extracted.fleet_size_confirmed,
    compliance_management:
      base.compliance_management !== "unknown"
        ? base.compliance_management
        : extracted.compliance_management,
    current_provider: base.current_provider ?? extracted.current_provider,
    needs: base.needs.length ? base.needs : extracted.needs,
    interest_level:
      base.interest_level !== "unknown" ? base.interest_level : extracted.interest_level,
    callback_requested: base.callback_requested ?? extracted.callback_requested,
    callback_time: base.callback_time ?? extracted.callback_time,
    consultation_accepted: base.consultation_accepted ?? extracted.consultation_accepted,
    consultation_preference: base.consultation_preference ?? extracted.consultation_preference,
    objections: base.objections.length ? base.objections : extracted.objections,
    summary_english: base.summary_english ?? extracted.summary_english,
    call_outcome: base.call_outcome ?? extracted.call_outcome,
    suggested_next_step: base.suggested_next_step ?? extracted.suggested_next_step,
    source,
  };
  return qualificationResultSchema.parse(merged);
}

export async function resolveDograhCallResult(input: {
  gathered: Record<string, unknown> | null | undefined;
  transcriptInlineOrUrl: string | null | undefined;
  allowTranscriptExtraction: boolean;
}): Promise<{
  qualification: QualificationResult | null;
  transcriptText: string;
  transcriptUrl: string | null;
  extractionLive: boolean;
  extractionError?: string;
}> {
  const structured = mapDograhGatheredContext(input.gathered);
  const { text: transcriptText, url: transcriptUrl } = await resolveTranscriptContent(
    input.transcriptInlineOrUrl,
  );

  let qualification = structured ?? emptyQualification();
  let extractionLive = false;
  let extractionError: string | undefined;

  if (
    input.allowTranscriptExtraction &&
    transcriptText &&
    qualificationNeedsTranscriptExtraction(structured)
  ) {
    const extracted = await extractQualificationFromTranscript(transcriptText, {
      allowDemoFallback: false,
    });
    extractionLive = extracted.live;
    extractionError = extracted.error;
    if (extracted.qualification) {
      qualification = structured
        ? mergeQualification(structured, extracted.qualification)
        : extracted.qualification;
    }
  } else if (structured) {
    qualification = structured;
  } else if (!transcriptText) {
    return {
      qualification: null,
      transcriptText,
      transcriptUrl,
      extractionLive: false,
      extractionError: "No structured gathered context or transcript text.",
    };
  } else {
    return {
      qualification: null,
      transcriptText,
      transcriptUrl,
      extractionLive,
      extractionError: "No structured gathered context.",
    };
  }

  const hasCapturedFact =
    qualification.call_outcome ||
    qualification.summary_english ||
    qualification.needs.length > 0 ||
    qualification.interest_level !== "unknown" ||
    qualification.consultation_accepted !== null ||
    qualification.callback_requested !== null ||
    qualification.preferred_language;

  if (!hasCapturedFact) {
    return {
      qualification: null,
      transcriptText,
      transcriptUrl,
      extractionLive,
      extractionError: extractionError ?? "No qualification fields were captured.",
    };
  }

  return {
    qualification,
    transcriptText,
    transcriptUrl,
    extractionLive,
    extractionError,
  };
}
