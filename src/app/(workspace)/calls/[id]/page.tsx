"use client";

import { CallConclusionFields } from "@/components/calls/call-conclusion";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileKindBadge } from "@/components/shared/profile-kind";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useCall, useCarrier, useOpportunity, useOpportunityMutations } from "@/hooks/use-skyos";
import { isLikelyUrl } from "@/lib/qualify/display";
import { getProfileKind } from "@/lib/profile";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const callQuery = useCall(params.id);
  const call = callQuery.data;
  const opportunityQuery = useOpportunity(call?.leadId ?? "");
  const carrierQuery = useCarrier(call?.carrierId ?? "");
  const mutations = useOpportunityMutations();
  const [showTranscript, setShowTranscript] = useState(() => {
    const text = call?.originalTranscript ?? "";
    return Boolean(text.trim()) && !isLikelyUrl(text);
  });
  const [showTech, setShowTech] = useState(false);

  if (callQuery.isLoading) {
    return (
      <PageBody>
        <TableSkeleton rows={6} />
      </PageBody>
    );
  }
  if (callQuery.isError) {
    return (
      <PageBody>
        <ErrorState title="Call could not be loaded." description="Reset demo data if the stored call is missing." />
      </PageBody>
    );
  }
  if (!call) {
    return (
      <PageBody>
        <EmptyState title="Call not found." />
      </PageBody>
    );
  }

  const qualification = call.qualification;
  const opportunity = opportunityQuery.data;
  const providerLabel =
    call.provider === "dograh" ? "Dograh" : call.provider === "demo" ? "Simulated" : call.provider;
  const transcriptText = call.originalTranscript?.trim() ?? "";
  const hasInlineTranscript = Boolean(transcriptText) && !isLikelyUrl(transcriptText);
  const transcriptUrl = call.transcriptUrl ?? (isLikelyUrl(transcriptText) ? transcriptText : null);

  return (
    <PageBody>
      <PageHeader
        title={carrierQuery.data?.legalName ?? "Call"}
        badge={<ProfileKindBadge kind={getProfileKind(carrierQuery.data)} />}
        meta={
          <span>
            {providerLabel}
            <span className="mx-2 text-border">·</span>
            {call.status.replaceAll("_", " ")}
            <span className="mx-2 text-border">·</span>
            {call.detectedLanguages.join(" + ") || call.language || "English"}
          </span>
        }
        actions={
          opportunity ? (
            <div className="flex gap-2">
              {call.status === "failed" ? (
                <Button nativeButton={false} render={<Link href={`/opportunities/${opportunity.id}`} />}>
                  Retry call
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await mutations.scheduleFollowUp.mutateAsync({
                        id: opportunity.id,
                        at: "2026-08-13T14:00:00.000-07:00",
                        note: "Callback from qualification",
                      });
                      toast.success("Follow-up scheduled");
                    }}
                  >
                    Schedule follow-up
                  </Button>
                  <Button nativeButton={false} render={<Link href={`/opportunities/${opportunity.id}`} />}>
                    Open record
                  </Button>
                </>
              )}
            </div>
          ) : null
        }
      />

      <section className="mt-6 max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Call conclusion</h2>
          <StatusBadge
            label={call.status === "simulated" ? "Simulated" : call.status}
            tone={call.status === "failed" ? "danger" : call.status === "simulated" ? "warning" : "success"}
          />
        </div>
        <div className="mt-3">
          <CallConclusionFields
            qualification={qualification}
            call={call}
            nextStepFallback={opportunity?.nextAction}
          />
        </div>
        {opportunity ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {call.status === "failed"
              ? "No qualification was captured. Open the record and retry the call when ready."
              : "Staff review remains required before Mark Won or Start service."}
          </p>
        ) : null}
      </section>

      <section className="mt-8 max-w-2xl">
        <h2 className="text-sm font-medium">Transcript</h2>
        {hasInlineTranscript ? (
          <>
            <button
              type="button"
              className="mt-2 text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setShowTranscript((value) => !value)}
              aria-expanded={showTranscript}
            >
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>
            {showTranscript ? (
              <pre className="mt-3 whitespace-pre-wrap border border-border bg-card px-4 py-3 font-sans text-sm leading-6 text-foreground">
                {transcriptText}
              </pre>
            ) : null}
          </>
        ) : transcriptUrl ? (
          <p className="mt-2 text-sm">
            <a
              href={transcriptUrl}
              className="underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Open transcript file
            </a>
            <span className="text-muted-foreground"> — inline text was not loaded.</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No transcript available.</p>
        )}
      </section>

      <section className="mt-6 max-w-2xl">
        <button
          type="button"
          className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => setShowTech((value) => !value)}
          aria-expanded={showTech}
        >
          {showTech ? "Hide technical details" : "Show technical details"}
        </button>
        {showTech ? (
          <dl className="mt-3 divide-y divide-border border-y border-border">
            <Field label="Provider" value={providerLabel} />
            <Field label="Provider call ID" value={call.providerCallId ?? "—"} />
            <Field label="Call id" value={call.id} />
            <Field
              label="Duration"
              value={
                call.durationSeconds != null
                  ? `${Math.round(call.durationSeconds / 60)} min`
                  : "Not available"
              }
            />
            <Field
              label="Recording"
              value={
                call.recordingUrl ? (
                  <a
                    href={call.recordingUrl}
                    className="underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open recording
                  </a>
                ) : (
                  "Not available"
                )
              }
            />
            <Field label="Languages detected" value={call.detectedLanguages.join(" + ") || "Not captured"} />
            <Field
              label="Contact verified"
              value={
                qualification.contact_verified === true
                  ? "Yes"
                  : qualification.contact_verified === false
                    ? "No"
                    : "Not captured"
              }
            />
            <Field label="Fleet size" value={qualification.fleet_size_confirmed ?? "Not captured"} />
            <Field label="Compliance management" value={qualification.compliance_management} />
            <Field label="Current provider" value={qualification.current_provider ?? "Not captured"} />
            {qualification.source ? (
              <Field label="Qualification source" value={qualification.source.replaceAll("_", " ")} />
            ) : null}
          </dl>
        ) : null}
      </section>
    </PageBody>
  );
}
