import { extractJsonFromParts } from "@/lib/providers/gemini";
import { qualificationResultSchema } from "@/lib/validation/schemas";
import type { QualificationResult } from "@/types";

const EXTRACTION_SCHEMA = `{
  "call_outcome": string | null,
  "interest_level": "high" | "medium" | "low" | "none" | null,
  "primary_need": string | null,
  "consultation_accepted": boolean | null,
  "consultation_preference": string | null,
  "callback_requested": boolean | null,
  "callback_time": string | null,
  "preferred_language": string | null,
  "suggested_next_step": string | null,
  "summary_english": string | null
}`;

type TranscriptExtraction = {
  call_outcome: string | null;
  interest_level: "high" | "medium" | "low" | "none" | null;
  primary_need: string | null;
  consultation_accepted: boolean | null;
  consultation_preference: string | null;
  callback_requested: boolean | null;
  callback_time: string | null;
  preferred_language: string | null;
  suggested_next_step: string | null;
  summary_english: string | null;
};

const EMPTY_EXTRACTION: TranscriptExtraction = {
  call_outcome: null,
  interest_level: null,
  primary_need: null,
  consultation_accepted: null,
  consultation_preference: null,
  callback_requested: null,
  callback_time: null,
  preferred_language: null,
  suggested_next_step: null,
  summary_english: null,
};

function normalizeInterest(value: unknown): QualificationResult["interest_level"] | null {
  if (value === "high" || value === "medium" || value === "low" || value === "none") return value;
  return null;
}

function extractionToQualification(extraction: TranscriptExtraction): QualificationResult {
  const needs = extraction.primary_need?.trim() ? [extraction.primary_need.trim()] : [];
  const interest = normalizeInterest(extraction.interest_level) ?? "unknown";
  const candidate: QualificationResult = {
    language: "English",
    preferred_language: extraction.preferred_language?.trim() || null,
    detected_languages: [],
    contact_verified: null,
    fleet_size_confirmed: null,
    compliance_management: "unknown",
    current_provider: null,
    needs,
    interest_level: interest,
    callback_requested: extraction.callback_requested,
    callback_time: extraction.callback_time?.trim() || null,
    consultation_accepted: extraction.consultation_accepted,
    consultation_preference: extraction.consultation_preference?.trim() || null,
    objections: [],
    summary_english: extraction.summary_english?.trim() || null,
    call_outcome: extraction.call_outcome?.trim() || null,
    suggested_next_step: extraction.suggested_next_step?.trim() || null,
    source: "transcript_extracted",
  };
  return qualificationResultSchema.parse(candidate);
}

export async function extractQualificationFromTranscript(
  transcript: string,
  options?: { allowDemoFallback?: boolean },
): Promise<{ qualification: QualificationResult | null; live: boolean; error?: string }> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { qualification: null, live: false, error: "Transcript is empty." };
  }

  const prompt = `Extract qualification facts from this outbound phone call transcript for SkyOS staff review.

Rules:
- Populate a field ONLY when the transcript clearly and explicitly supports it.
- If unclear or not stated, return null for that field.
- Do NOT infer language preference from names, location, accent, or names of languages unless the caller explicitly states a preference.
- preferred_language is ONLY when the caller explicitly names a language for follow-up.
- consultation_accepted is true only when the caller clearly accepts a free consultation; false only when clearly declining.
- interest_level must reflect explicit interest or disinterest; use null when not clear.
- Never invent compliance issues, fleet size, or services discussed if not in the transcript.
- Be conservative. When in doubt, use null.

Transcript:
${trimmed}`;

  const result = await extractJsonFromParts<TranscriptExtraction>(
    [{ text: `${prompt}\n\nReturn JSON only. Schema:\n${EXTRACTION_SCHEMA}` }],
    EMPTY_EXTRACTION,
    { allowDemoFallback: options?.allowDemoFallback ?? false },
  );

  if (!result.live) {
    return {
      qualification: null,
      live: false,
      error: result.error ?? "Transcript extraction unavailable.",
    };
  }

  const hasAnyFact =
    result.value.call_outcome ||
    result.value.primary_need ||
    result.value.interest_level ||
    result.value.consultation_accepted !== null ||
    result.value.callback_requested !== null ||
    result.value.preferred_language ||
    result.value.summary_english;

  if (!hasAnyFact) {
    return { qualification: null, live: true, error: "Transcript did not support structured fields." };
  }

  return { qualification: extractionToQualification(result.value), live: true };
}
