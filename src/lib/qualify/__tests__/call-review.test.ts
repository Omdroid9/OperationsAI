import { describe, expect, it } from "vitest";
import {
  checkCapturedAgainstTranscript,
  findRecordConflicts,
  redactTranscript,
  reviewCall,
} from "@/lib/qualify/call-review";
import type { Carrier, QualificationResult } from "@/types";

const qualification = (overrides: Partial<QualificationResult> = {}): QualificationResult => ({
  language: "English",
  preferred_language: null,
  detected_languages: ["English"],
  contact_verified: true,
  fleet_size_confirmed: 4,
  compliance_management: "internal",
  current_provider: null,
  needs: ["IFTA"],
  interest_level: "high",
  callback_requested: true,
  callback_time: null,
  consultation_accepted: null,
  consultation_preference: null,
  objections: [],
  summary_english: null,
  ...overrides,
});

const carrier = (overrides: Partial<Carrier> = {}): Carrier =>
  ({
    id: "c1",
    usdot: "3418821",
    legalName: "Example Freight",
    phone: "(209) 555-0148",
    powerUnits: 4,
    isCustomer: false,
    existingServices: [],
    source: "FMCSA",
    ...overrides,
  }) as Carrier;

describe("redactTranscript", () => {
  it("masks phones, emails, SSNs, birth dates and licence numbers", () => {
    const result = redactTranscript(
      "Call me at (209) 555-0148 or ravi@example.com. SSN 123-45-6789. Date of birth is 04/12/1988. CDL number is D1234567.",
    );
    expect(result.text).not.toMatch(/555-0148|ravi@|123-45-6789|04\/12\/1988|D1234567/);
    expect(result.text).toContain("Date of birth is [date of birth removed]");
    expect(result.counts).toEqual({
      phone: 1,
      email: 1,
      ssn: 1,
      date_of_birth: 1,
      license_number: 1,
    });
    expect(result.total).toBe(5);
  });

  it("keeps USDOT numbers, fleet counts and ordinary dates", () => {
    const text = "USDOT 3418821 runs 4 trucks. Deadline is October 15, 2026.";
    expect(redactTranscript(text)).toMatchObject({ text, total: 0 });
  });
});

describe("checkCapturedAgainstTranscript", () => {
  it("attests a fleet size said as a digit or a word", () => {
    const q = qualification();
    expect(checkCapturedAgainstTranscript(q, "Mere paas 4 trucks hain, IFTA khud")[0].status).toBe("attested");
    expect(checkCapturedAgainstTranscript(q, "We run four trucks and file IFTA")[0].status).toBe("attested");
  });

  it("does not match a number inside a larger number", () => {
    const checks = checkCapturedAgainstTranscript(qualification(), "USDOT 3418821, call 14 times");
    expect(checks[0]).toMatchObject({ field: "Fleet size", status: "not_found" });
  });

  it("flags a provider and a need that were never said", () => {
    const checks = checkCapturedAgainstTranscript(
      qualification({ current_provider: "Acme Compliance", needs: ["Drug testing"] }),
      "We have 4 trucks and need help with IFTA.",
    );
    expect(checks.filter((c) => c.status === "not_found").map((c) => c.field)).toEqual([
      "Current provider",
      "Need",
    ]);
  });

  it("returns nothing when there is no transcript", () => {
    expect(checkCapturedAgainstTranscript(qualification(), "  ")).toEqual([]);
  });
});

describe("findRecordConflicts", () => {
  it("is empty when the call agrees with the record", () => {
    expect(findRecordConflicts(qualification(), carrier())).toEqual([]);
  });

  it("reports a fleet size mismatch with the record's source", () => {
    const [conflict] = findRecordConflicts(qualification(), carrier({ powerUnits: 12 }));
    expect(conflict).toMatchObject({
      field: "Fleet size",
      callValue: "4 stated on call",
      recordValue: "12 power units on record",
      recordSource: "FMCSA",
    });
  });

  it("ignores fleet size when the record has no count", () => {
    expect(findRecordConflicts(qualification(), carrier({ powerUnits: 0 }))).toEqual([]);
  });

  it("reports internal handling alongside a named provider, and existing services", () => {
    const conflicts = findRecordConflicts(
      qualification({ current_provider: "Acme Compliance" }),
      carrier({ isCustomer: true, existingServices: ["IFTA filing"] }),
    );
    expect(conflicts.map((c) => c.field)).toEqual(["Compliance handling", "Existing services"]);
  });

  it("reports an unverified speaker", () => {
    const conflicts = findRecordConflicts(qualification({ contact_verified: false }), carrier());
    expect(conflicts.map((c) => c.field)).toEqual(["Contact"]);
  });

  it("never states a conclusion about the carrier", () => {
    const conflicts = findRecordConflicts(
      qualification({ contact_verified: false, current_provider: "Acme" }),
      carrier({ powerUnits: 12, isCustomer: true, existingServices: ["UCR"] }),
    );
    for (const conflict of conflicts) {
      expect(`${conflict.note} ${conflict.recordValue}`).not.toMatch(
        /noncompliant|violation|definitely|guaranteed|unsafe/i,
      );
    }
  });
});

describe("reviewCall", () => {
  it("needs attention only when something differs", () => {
    const transcript = "Mere paas 4 trucks hain and IFTA main khud handle karta hoon.";
    expect(reviewCall({ qualification: qualification(), transcript, carrier: carrier() }).needsAttention).toBe(false);
    expect(
      reviewCall({ qualification: qualification(), transcript, carrier: carrier({ powerUnits: 9 }) })
        .needsAttention,
    ).toBe(true);
  });
});
