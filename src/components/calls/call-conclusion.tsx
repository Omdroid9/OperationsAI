"use client";

import { ProvenanceLabel } from "@/components/shared/provenance-label";
import {
  callOutcome,
  formatCallback,
  formatCaptured,
  formatConsultation,
  formatInterest,
  primaryNeed,
  qualificationProvenance,
  suggestedNextStep,
} from "@/lib/qualify/display";
import type { CallRecord, QualificationResult } from "@/types";

function Field({
  label,
  value,
  provenance,
}: {
  label: string;
  value: React.ReactNode;
  provenance?: "AI_EXTRACTED" | "TRANSCRIPT_EXTRACTED" | "DEMO";
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-2 text-sm">
        {value}
        {provenance ? <ProvenanceLabel value={provenance} /> : null}
      </dd>
    </div>
  );
}

export function CallConclusionFields({
  qualification,
  call,
  nextStepFallback,
}: {
  qualification: QualificationResult;
  call: Pick<CallRecord, "status" | "provider">;
  nextStepFallback?: string | null;
}) {
  if (call.status === "failed") {
    return (
      <dl className="divide-y divide-border border-y border-border">
        <Field label="Outcome" value="Call disconnected" />
        <Field
          label="Suggested next step"
          value={qualification.suggested_next_step?.trim() || "Retry the call"}
        />
        <Field
          label="Detail"
          value={
            qualification.summary_english?.trim() ||
            "Call ended before qualification was captured. Retry when ready."
          }
        />
      </dl>
    );
  }

  const provenance = qualificationProvenance(qualification, call.status, call.provider);

  return (
    <dl className="divide-y divide-border border-y border-border">
      <Field label="Outcome" value={callOutcome(qualification)} provenance={provenance} />
      <Field label="Interest" value={formatInterest(qualification.interest_level)} provenance={provenance} />
      <Field label="Primary need" value={primaryNeed(qualification)} provenance={provenance} />
      <Field label="Free consultation" value={formatConsultation(qualification)} provenance={provenance} />
      <Field label="Callback" value={formatCallback(qualification)} provenance={provenance} />
      <Field
        label="Preferred language"
        value={formatCaptured(qualification.preferred_language)}
        provenance={provenance}
      />
      <Field
        label="Suggested next step"
        value={suggestedNextStep(qualification, nextStepFallback)}
        provenance={provenance}
      />
    </dl>
  );
}
