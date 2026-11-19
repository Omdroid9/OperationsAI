"use client";

import { ProvenanceLabel } from "@/components/shared/provenance-label";
import { StatusBadge } from "@/components/shared/status-badge";
import type { CallReview } from "@/lib/qualify/call-review";

/**
 * Differences between what the call captured, what was said, and what is on
 * record. Informational: staff decide what to update; nothing here edits data.
 */
export function CallReviewPanel({ review }: { review: CallReview }) {
  const unattested = review.transcriptChecks.filter((check) => check.status === "not_found");
  const attested = review.transcriptChecks.length - unattested.length;

  return (
    <section className="mt-8 max-w-2xl" aria-labelledby="call-review-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="call-review-title" className="text-sm font-medium">
          Check against records
        </h2>
        <StatusBadge
          label={review.needsAttention ? "Needs review" : "No differences found"}
          tone={review.needsAttention ? "warning" : "success"}
        />
      </div>

      {review.conflicts.length === 0 && unattested.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {review.transcriptChecks.length > 0
            ? `${attested} captured ${attested === 1 ? "value was" : "values were"} found in the transcript and nothing differs from the carrier record.`
            : "Nothing captured on this call differs from the carrier record."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {review.conflicts.map((conflict) => (
            <li key={`${conflict.field}-${conflict.recordValue}`} className="py-3">
              <p className="text-sm font-medium text-foreground">{conflict.field}</p>
              <dl className="mt-1 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-xs text-muted-foreground">Call</dt>
                <dd className="flex items-baseline gap-2">
                  {conflict.callValue}
                  <ProvenanceLabel value="TRANSCRIPT_EXTRACTED" />
                </dd>
                <dt className="text-xs text-muted-foreground">Record</dt>
                <dd className="flex items-baseline gap-2">
                  {conflict.recordValue}
                  <ProvenanceLabel value={conflict.recordSource} />
                </dd>
              </dl>
              <p className="mt-2 text-sm text-muted-foreground">{conflict.note}</p>
            </li>
          ))}
          {unattested.map((check) => (
            <li key={`${check.field}-${check.value}`} className="py-3">
              <p className="text-sm font-medium text-foreground">{check.field}</p>
              <p className="mt-1 text-sm">
                Captured as “{check.value}”, but not found in the transcript.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Listen to the recording before relying on this value.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
