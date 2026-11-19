import type { Carrier, QualificationResult } from "@/types";

/**
 * Staff review aids for a qualification call. Everything here is deterministic:
 * it compares what was captured from the call with the transcript and with the
 * carrier record, and reports differences. It never edits a record.
 */

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

export type RedactionKind = "phone" | "email" | "ssn" | "date_of_birth" | "license_number";

export type RedactionResult = {
  text: string;
  counts: Record<RedactionKind, number>;
  total: number;
};

const REDACTION_RULES: Array<{ kind: RedactionKind; pattern: RegExp; keep?: number }> = [
  { kind: "email", pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { kind: "ssn", pattern: /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g },
  // Keeps the leading label ("date of birth is") and redacts only the value.
  {
    kind: "date_of_birth",
    pattern:
      /\b((?:date of birth|dob|born(?: on)?|birth ?date)\b[^\n\d]{0,20})(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Z][a-z]+ \d{1,2},? \d{4})/gi,
    keep: 1,
  },
  {
    kind: "license_number",
    pattern:
      /\b((?:driver'?s? licen[sc]e|cdl|licen[sc]e)(?: number| no\.?| #)?\b[^\n\w]{0,4}(?:is |: ?)?)([A-Z]{0,2}\d{6,12})\b/gi,
    keep: 1,
  },
  { kind: "phone", pattern: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g },
];

/**
 * Masks personal identifiers before a transcript is shown, stored in a shared
 * index, or sent to a model. USDOT numbers are public record and are kept.
 * Spoken-out digits ("five five five...") are not detected.
 */
export function redactTranscript(input: string): RedactionResult {
  const counts: Record<RedactionKind, number> = {
    phone: 0,
    email: 0,
    ssn: 0,
    date_of_birth: 0,
    license_number: 0,
  };
  let text = input;
  for (const rule of REDACTION_RULES) {
    text = text.replace(rule.pattern, (...args: unknown[]) => {
      counts[rule.kind] += 1;
      const prefix = rule.keep ? String(args[rule.keep]) : "";
      return `${prefix}[${rule.kind.replaceAll("_", " ")} removed]`;
    });
  }
  return { text, counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) };
}

// ---------------------------------------------------------------------------
// Captured fields vs transcript
// ---------------------------------------------------------------------------

export type TranscriptCheck = {
  field: string;
  value: string;
  /** attested: the value appears in the transcript. not_found: staff should verify by listening. */
  status: "attested" | "not_found";
};

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
];

function mentionsNumber(transcript: string, value: number): boolean {
  if (new RegExp(`(?<![\\d.])${value}(?![\\d.])`).test(transcript)) return true;
  const word = NUMBER_WORDS[value];
  return word ? new RegExp(`\\b${word}\\b`, "i").test(transcript) : false;
}

/**
 * Checks captured values that should be literally present in the call.
 * Only fields with a quotable value are checked; interest level and similar
 * judgements are not, because no single phrase proves them.
 */
export function checkCapturedAgainstTranscript(
  qualification: QualificationResult,
  transcript: string,
): TranscriptCheck[] {
  const text = transcript.trim();
  if (!text) return [];
  const lower = text.toLowerCase();
  const checks: TranscriptCheck[] = [];

  if (qualification.fleet_size_confirmed != null) {
    checks.push({
      field: "Fleet size",
      value: String(qualification.fleet_size_confirmed),
      status: mentionsNumber(text, qualification.fleet_size_confirmed) ? "attested" : "not_found",
    });
  }
  const provider = qualification.current_provider?.trim();
  if (provider) {
    checks.push({
      field: "Current provider",
      value: provider,
      status: lower.includes(provider.toLowerCase()) ? "attested" : "not_found",
    });
  }
  for (const need of qualification.needs) {
    const label = need.trim();
    if (!label) continue;
    // A need is attested when its most specific word is said on the call.
    const words = label.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
    const said = words.length > 0 && words.some((word) => lower.includes(word));
    checks.push({ field: "Need", value: label, status: said ? "attested" : "not_found" });
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Captured fields vs carrier record
// ---------------------------------------------------------------------------

export type RecordConflict = {
  field: string;
  callValue: string;
  recordValue: string;
  recordSource: Carrier["source"];
  /** What staff should do. Never a conclusion about the carrier. */
  note: string;
};

export function findRecordConflicts(
  qualification: QualificationResult,
  carrier: Carrier,
): RecordConflict[] {
  const conflicts: RecordConflict[] = [];

  const fleet = qualification.fleet_size_confirmed;
  if (fleet != null && carrier.powerUnits > 0 && fleet !== carrier.powerUnits) {
    conflicts.push({
      field: "Fleet size",
      callValue: `${fleet} stated on call`,
      recordValue: `${carrier.powerUnits} power units on record`,
      recordSource: carrier.source,
      note: "Confirm the current count with the carrier. Public filings can lag fleet changes.",
    });
  }

  const provider = qualification.current_provider?.trim();
  if (qualification.compliance_management === "internal" && provider) {
    conflicts.push({
      field: "Compliance handling",
      callValue: "Handled internally",
      recordValue: `Provider named on the same call: ${provider}`,
      recordSource: "TRANSCRIPT_EXTRACTED",
      note: "The call captured both. Ask which services the provider covers.",
    });
  }

  if (
    (qualification.compliance_management === "internal" ||
      qualification.compliance_management === "unknown") &&
    carrier.isCustomer &&
    carrier.existingServices.length > 0
  ) {
    conflicts.push({
      field: "Existing services",
      callValue:
        qualification.compliance_management === "internal"
          ? "Handled internally"
          : "Not captured on call",
      recordValue: `Current customer: ${carrier.existingServices.join(", ")}`,
      recordSource: "CRM",
      note: "This carrier already has services with us. Check the case before proposing new work.",
    });
  }

  if (qualification.contact_verified === false) {
    conflicts.push({
      field: "Contact",
      callValue: "Speaker not verified as the listed contact",
      recordValue: carrier.phone ? `Number on record: ${carrier.phone}` : "No number on record",
      recordSource: carrier.source,
      note: "Verify who answered before relying on this call.",
    });
  }

  return conflicts;
}

export type CallReview = {
  redaction: RedactionResult;
  transcriptChecks: TranscriptCheck[];
  conflicts: RecordConflict[];
  /** True when anything needs a second look before the record is trusted. */
  needsAttention: boolean;
};

export function reviewCall(input: {
  qualification: QualificationResult;
  transcript: string;
  carrier: Carrier | null;
}): CallReview {
  const transcriptChecks = checkCapturedAgainstTranscript(input.qualification, input.transcript);
  const conflicts = input.carrier ? findRecordConflicts(input.qualification, input.carrier) : [];
  return {
    redaction: redactTranscript(input.transcript),
    transcriptChecks,
    conflicts,
    needsAttention:
      conflicts.length > 0 || transcriptChecks.some((check) => check.status === "not_found"),
  };
}
