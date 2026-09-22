"use client";

import { CallConclusionFields } from "@/components/calls/call-conclusion";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/empty-state";
import { ConsultationPanel } from "@/components/opportunities/consultation-panel";
import { OwnerAssignSelect } from "@/components/opportunities/owner-assign";
import { CensusSignalPriority } from "@/components/opportunities/census-signal-priority";
import { NextStepPanel } from "@/components/shared/next-step";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileKindBadge } from "@/components/shared/profile-kind";
import { ProvenanceLabel } from "@/components/shared/provenance-label";
import { ScoreExplain } from "@/components/shared/score-explain";
import { DocumentStatusBadge, StageBadge } from "@/components/shared/status-badge";
import { WorkflowLane } from "@/components/shared/workflow-lane";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDemoMode } from "@/hooks/use-demo-mode";
import {
  useActivities,
  useCalls,
  useCarrier,
  useDocuments,
  useOpportunity,
  useOpportunityMutations,
  useProviderStatus,
  useSignals,
  useSnapshots,
} from "@/hooks/use-skyos";
import { formatCreationLine, recordKindLabel } from "@/lib/leads/creation";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { formatDate, formatRelative, formatUsdot } from "@/lib/format";
import { lookupCarrierByUsdot, pollQualification, startQualification } from "@/lib/live/client";
import { buildQualificationInitialContext } from "@/lib/qualify/build-initial-context";
import { getProfileKind, isCensusProfile, isDemoProfile, isDemoSimulationLead, isFmcsaConnected, isUnenrichedLead } from "@/lib/profile";
import { isCensusDiscoveryProspect } from "@/lib/prospects/census-prospect";
import { resolveOutreachReadiness, outreachReadinessLabel } from "@/lib/prospects/outreach-readiness";
import { nextStepCopy, workflowStepForStage } from "@/lib/workflow";
import { recordListHref } from "@/lib/workspace-nav";
import { SERVICE_TYPE_LIST } from "@/lib/docket/service-types";
import type { Carrier, Opportunity, ServiceTypeKey } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Fact({
  label,
  value,
  provenance,
}: {
  label: string;
  value: React.ReactNode;
  provenance?: "FMCSA" | "CRM" | "DERIVED" | "AI_EXTRACTED" | "HUMAN_CONFIRMED" | "DEMO";
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center gap-4 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-2 text-sm text-foreground">
        <span>{value}</span>
        {provenance ? <ProvenanceLabel value={provenance} /> : null}
      </dd>
    </div>
  );
}

function whyThisMatters(opportunity: Opportunity, unenriched: boolean): string | null {
  if (unenriched) {
    const need = opportunity.statedNeed?.trim();
    return need || null;
  }
  const summary = opportunity.reasonSummary?.trim();
  return summary || null;
}

function EnrichUsdotDialog({
  opportunityId,
  defaultUsdot,
  open,
  onOpenChange,
  title = "Add USDOT to enrich",
  description,
}: {
  opportunityId: string;
  defaultUsdot: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  const mutations = useOpportunityMutations();
  const providers = useProviderStatus();
  const { demoMode } = useDemoMode();
  const [usdot, setUsdot] = useState(defaultUsdot);
  const [busy, setBusy] = useState(false);
  const defaultDescription =
    description ??
    (providers.data?.fmcsa
      ? "Look up a verified FMCSA profile and attach it to this record. Creation source stays unchanged."
      : demoMode
        ? "Add FMCSA_WEB_KEY to connect a live profile. Demo Mode will not invent carrier facts."
        : "Add FMCSA_WEB_KEY to enrich this record, or turn Demo Mode on for the walkthrough.");

  useEffect(() => {
    if (open) setUsdot(defaultUsdot);
  }, [open, defaultUsdot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{defaultDescription}</DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="enrich-usdot" className="mb-1 block text-[11px] text-muted-foreground">
            USDOT number
          </label>
          <Input
            id="enrich-usdot"
            value={usdot}
            onChange={(event) => setUsdot(event.target.value)}
            placeholder="e.g. 1234567"
            inputMode="numeric"
            disabled={busy}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || usdot.replace(/\D/g, "").length < 5}
            onClick={async () => {
              const value = usdot.replace(/\D/g, "");
              if (value.length < 5) return;
              setBusy(true);
              try {
                const carrier = await lookupCarrierByUsdot(value);
                await mutations.ingestNormalizedCarrier.mutateAsync({
                  normalized: carrier,
                  options: {
                    sourceType: "fmcsa_usdot_lookup",
                    sourceRef: carrier.usdot,
                    enrichOpportunityId: opportunityId,
                  },
                });
                onOpenChange(false);
                toast.success("FMCSA profile connected");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : demoMode
                      ? "FMCSA lookup unavailable. Carrier facts were not invented."
                      : "FMCSA lookup unavailable.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Looking up…" : "Look up and connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function callActionLabel(recordKind: Opportunity["recordKind"]): string {
  return recordKind === "lead" ? "Call lead" : "Call prospect";
}

function PrimaryAction({
  opportunity,
  carrier,
  variant = "default",
}: {
  opportunity: Opportunity;
  carrier?: Carrier;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const mutations = useOpportunityMutations();
  const providers = useProviderStatus();
  const { demoMode } = useDemoMode();
  const [qualifyOpen, setQualifyOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [serviceTypeKey, setServiceTypeKey] = useState<ServiceTypeKey>("compliance_onboarding");
  const [phone, setPhone] = useState(carrier?.phone ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const canQualify = ["DETECTED", "REVIEWED", "CONTACTED"].includes(opportunity.stage);
  const dograhReady = Boolean(providers.data?.dograh);
  const inConsultationFlow = [
    "needs_follow_up",
    "scheduled",
    "complete",
    "service_approved",
  ].includes(opportunity.consultationStatus);

  useEffect(() => {
    if (carrier?.phone) setPhone(carrier.phone);
  }, [carrier?.phone]);

  if (opportunity.caseId) {
    return (
      <Button onClick={() => router.push(`/docket/${opportunity.caseId}`)}>Open case</Button>
    );
  }

  if (opportunity.consultationStatus === "service_approved") {
    return (
      <>
        <Button onClick={() => setStartOpen(true)} disabled={mutations.startService.isPending}>
          Start service
        </Button>
        <Dialog open={startOpen} onOpenChange={setStartOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start service</DialogTitle>
              <DialogDescription>
                Pick a service type. A Docket case opens and the record moves to Won internally.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {SERVICE_TYPE_LIST.map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="service-type"
                    checked={serviceTypeKey === item.key}
                    onChange={() => setServiceTypeKey(item.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStartOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const serviceCase = await mutations.startService.mutateAsync({
                    id: opportunity.id,
                    serviceTypeKey,
                  });
                  setStartOpen(false);
                  toast.success("Service case created");
                  router.push(`/docket/${serviceCase.id}`);
                }}
              >
                Start service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (opportunity.consultationStatus === "complete") {
    return (
      <Button
        onClick={async () => {
          await mutations.approveService.mutateAsync(opportunity.id);
          toast.success("Service approved");
        }}
        disabled={mutations.approveService.isPending}
      >
        Approve service
      </Button>
    );
  }

  if (opportunity.consultationStatus === "scheduled") {
    return (
      <Button
        onClick={async () => {
          await mutations.completeConsultation.mutateAsync({ id: opportunity.id });
          toast.success("Consultation complete");
        }}
        disabled={mutations.completeConsultation.isPending}
      >
        Complete consultation
      </Button>
    );
  }

  if (opportunity.consultationStatus === "needs_follow_up") {
    return (
      <Button
        onClick={async () => {
          if (!opportunity.assignedTo) {
            toast.error("Assign an owner before scheduling.");
            return;
          }
          await mutations.scheduleConsultation.mutateAsync({
            id: opportunity.id,
            at: new Date("2026-08-13T14:00:00.000-07:00").toISOString(),
          });
          toast.success("Consultation scheduled");
        }}
        disabled={mutations.scheduleConsultation.isPending}
      >
        Schedule consultation
      </Button>
    );
  }

  if (inConsultationFlow) return null;

  if (!canQualify) return null;

  const callLabel = callActionLabel(opportunity.recordKind);

  return (
    <>
      <Button variant={variant} onClick={() => setQualifyOpen(true)}>
        {callLabel}
      </Button>
      <Dialog
        open={qualifyOpen}
        onOpenChange={(open) => {
          setQualifyOpen(open);
          if (!open) {
            setConsent(false);
            setLiveStatus(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start qualification call</DialogTitle>
            <DialogDescription>
              {!demoMode
                ? dograhReady
                  ? "This starts an outbound Dograh qualification call to a consenting test number."
                  : "Dograh is not configured. Add Dograh env vars for Live Mode, or turn Demo Mode on for a labeled simulated call."
                : dograhReady
                  ? "Demo Mode is on. You can place a Dograh test call, or run a clearly labeled simulated qualification."
                  : "Dograh is not configured. A clearly labeled simulated qualification will be used."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dograh may collect and summarize information. It must not make promises, give legal
            advice, mark a deal Won, or create a case. Staff review stays required.
          </p>
          <div>
            <label htmlFor="qualify-phone" className="mb-1 block text-[11px] text-muted-foreground">
              Phone number
            </label>
            <Input
              id="qualify-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1…"
              disabled={busy}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Live Dograh calls are limited to the server allowlist DOGRAH_ALLOWED_TEST_NUMBERS.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={busy}
            />
            <span>
              I confirm the recipient consented to an outbound qualification call and this number is
              approved for testing.
            </span>
          </label>
          {liveStatus ? (
            <p className="text-sm text-muted-foreground">
              Call {liveStatus.replaceAll("_", " ")}. This can take a minute.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQualifyOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setBusy(true);
                try {
                  if (!demoMode && !dograhReady) {
                    throw new Error(
                      "Dograh is not configured. Configure DOGRAH_API_URL, DOGRAH_API_KEY, DOGRAH_WORKFLOW_UUID, DOGRAH_WORKFLOW_ID, and DOGRAH_WEBHOOK_SECRET.",
                    );
                  }
                  if (dograhReady && !consent) {
                    throw new Error("Confirm consent before starting the call.");
                  }

                  const context = buildQualificationInitialContext(opportunity, carrier ?? null, phone);

                  const started = await startQualification({
                    leadId: opportunity.id,
                    phone,
                    consent,
                    context,
                  });
                  if (started.mode === "failed") {
                    throw new Error(started.error ?? started.reason ?? "Qualification unavailable.");
                  }
                  if (started.mode === "live" && started.callId) {
                    setLiveStatus("queued");
                    const deadline = Date.now() + 15 * 60 * 1000;
                    const disconnectMessage =
                      "Call disconnected before qualification was captured. Retry when ready.";
                    while (Date.now() < deadline) {
                      await new Promise((resolve) => setTimeout(resolve, 3000));
                      const poll = await pollQualification(started.callId);
                      setLiveStatus(poll.status);
                      if (poll.status === "completed" && poll.qualification) {
                        if (!demoMode && !poll.live) {
                          throw new Error(
                            poll.error ??
                              "Live Dograh qualification failed. Simulated results are disabled while Demo Mode is off.",
                          );
                        }
                        const call = await mutations.applyQualification.mutateAsync({
                          id: opportunity.id,
                          qualification: poll.qualification,
                          meta: {
                            provider: "dograh",
                            status: "completed",
                            transcript: poll.transcript || poll.transcriptUrl || "",
                            transcriptUrl: poll.transcriptUrl ?? null,
                            providerCallId: started.callId,
                            recordingUrl: poll.recordingUrl ?? null,
                            durationSeconds: poll.durationSeconds ?? null,
                          },
                        });
                        setQualifyOpen(false);
                        toast.success(
                          poll.live ? "Dograh qualification recorded" : "Qualification recorded",
                        );
                        router.push(`/calls/${call.id}`);
                        return;
                      }
                      if (poll.status === "failed") {
                        // Keep waiting until the deadline. Webhook can land before
                        // Dograh has gathered fields or a transcript URL.
                        continue;
                      }
                    }
                    if (!demoMode) {
                      const failedCall = await mutations.recordFailedQualificationAttempt.mutateAsync({
                        id: opportunity.id,
                        meta: {
                          provider: "dograh",
                          providerCallId: started.callId,
                          error: disconnectMessage,
                        },
                      });
                      setQualifyOpen(false);
                      toast.error(disconnectMessage);
                      router.push(`/calls/${failedCall.id}`);
                      return;
                    }
                    toast.message("Dograh call did not finish in time. Using labeled simulated qualification.");
                  } else if (started.reason) {
                    toast.message(started.reason);
                  }
                  if (!demoMode) {
                    throw new Error(
                      started.error ?? "Simulated qualification is disabled while Demo Mode is off.",
                    );
                  }
                  const call = await mutations.qualify.mutateAsync(opportunity.id);
                  setQualifyOpen(false);
                  toast.success("Simulated qualification recorded");
                  router.push(`/calls/${call.id}`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Qualification failed");
                } finally {
                  setBusy(false);
                  setLiveStatus(null);
                }
              }}
              disabled={
                busy ||
                (!demoMode && !dograhReady) ||
                (dograhReady && (!consent || phone.replace(/\D/g, "").length < 10))
              }
            >
              {busy
                ? liveStatus
                  ? "Waiting for call…"
                  : "Starting…"
                : dograhReady
                  ? "Start Dograh call"
                  : demoMode
                    ? "Run simulated call"
                    : "Dograh required"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


export function OpportunityDetail({ id }: { id: string }) {
  const opportunityQuery = useOpportunity(id);
  const opportunity = opportunityQuery.data;
  const carrierQuery = useCarrier(opportunity?.carrierId ?? "");
  const signalsQuery = useSignals(opportunity?.carrierId ?? "");
  const activitiesQuery = useActivities(id);
  const snapshotsQuery = useSnapshots(opportunity?.carrierId ?? "");
  const callsQuery = useCalls();
  const documentsQuery = useDocuments(opportunity?.caseId ?? "");
  const mutations = useOpportunityMutations();
  const [noteOpen, setNoteOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [note, setNote] = useState("");
  const [followAt, setFollowAt] = useState("2026-08-13T14:00");
  const [reason, setReason] = useState("");

  if (opportunityQuery.isLoading) {
    return (
      <PageBody>
        <TableSkeleton rows={6} />
      </PageBody>
    );
  }

  if (opportunityQuery.isError) {
    return (
      <PageBody>
        <ErrorState
          title="Opportunity could not be loaded."
          description="The latest stored demo profile is still available after reset."
        />
      </PageBody>
    );
  }

  if (!opportunity) {
    return (
      <PageBody>
        <EmptyState title="Opportunity not found." description="It may have been removed from the demo set." />
      </PageBody>
    );
  }

  const carrier = carrierQuery.data;
  const unenriched = isUnenrichedLead(opportunity, carrier);
  const censusProfile = isCensusProfile(carrier);
  const simulatedWebsite = isDemoSimulationLead(opportunity);
  const fieldSource = unenriched ? "CRM" : isDemoProfile(carrier) ? "DEMO" : "FMCSA";
  const closed = opportunity.stage === "DISMISSED" || opportunity.stage === "LOST";
  const why = whyThisMatters(opportunity, unenriched);
  const outreach = resolveOutreachReadiness(opportunity, carrier);
  const showCensusPriority = isCensusDiscoveryProspect(opportunity);
  const inHandoff = [
    "needs_follow_up",
    "scheduled",
    "complete",
    "service_approved",
  ].includes(opportunity.consultationStatus);
  const next =
    unenriched && !inHandoff
      ? {
          title: "Add USDOT to enrich",
          body: "FMCSA profile not connected. Enter a USDOT to look up a verified profile and attach it to this lead.",
        }
      : nextStepCopy(opportunity);
  const step = workflowStepForStage(opportunity.stage, Boolean(opportunity.caseId));
  const listNav = recordListHref(opportunity);
  const linkedCalls = (callsQuery.data ?? []).filter((call) => call.leadId === opportunity.id);
  const documents = documentsQuery.data ?? [];
  const hasPhone = Boolean(carrier?.phone?.trim());
  const canQualifyStage = ["DETECTED", "REVIEWED", "CONTACTED"].includes(opportunity.stage);
  const canQualifyUnenriched = unenriched && hasPhone && canQualifyStage;

  return (
    <PageBody>
      <div>
        <PageHeader
          title={carrier?.legalName ?? "Opportunity"}
          badge={
            simulatedWebsite ? (
              <span className="inline-flex h-5 items-center rounded-[6px] border border-amber-600/30 bg-amber-500/10 px-1.5 text-[11px] font-medium text-amber-900 dark:text-amber-200">
                Simulated website lead
              </span>
            ) : unenriched ? (
              <span className="inline-flex h-5 items-center rounded-[6px] border border-border bg-card px-1.5 text-[11px] font-medium text-muted-foreground">
                FMCSA profile not connected
              </span>
            ) : (
              <ProfileKindBadge kind={getProfileKind(carrier)} />
            )
          }
          meta={
            <span>
              {recordKindLabel(opportunity.recordKind)}
              <span className="mx-2 text-border">·</span>
              <Link
                href={listNav.href}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {listNav.label}
              </Link>
              {opportunity.contactName ? (
                <>
                  <span className="mx-2 text-border">·</span>
                  {opportunity.contactName}
                </>
              ) : null}
              {carrier?.email ? (
                <>
                  <span className="mx-2 text-border">·</span>
                  {carrier.email}
                </>
              ) : null}
              {carrier?.phone ? (
                <>
                  <span className="mx-2 text-border">·</span>
                  {carrier.phone}
                </>
              ) : null}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
                Add note
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFollowOpen(true)}>
                Schedule follow-up
              </Button>
              {["DETECTED", "REVIEWED", "CONTACTED"].includes(opportunity.stage) ? (
                <Button variant="ghost" size="sm" onClick={() => setDismissOpen(true)}>
                  Dismiss
                </Button>
              ) : null}
              {["QUALIFIED", "CONSULTATION"].includes(opportunity.stage) ? (
                <Button variant="ghost" size="sm" onClick={() => setLostOpen(true)}>
                  Mark Lost
                </Button>
              ) : null}
              {censusProfile && !closed ? (
                <Button variant="outline" size="sm" onClick={() => setEnrichOpen(true)}>
                  Enrich with USDOT
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StageBadge stage={opportunity.stage} />
          <span className="text-[11px] text-muted-foreground">
            Created {formatCreationLine(opportunity.creation)}
          </span>
        </div>

        {showCensusPriority ? <CensusSignalPriority opportunity={opportunity} /> : null}

        <ConsultationPanel opportunity={opportunity} />

        <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <dt className="text-[11px] uppercase tracking-[0.06em]">Owner</dt>
            <dd>
              <OwnerAssignSelect opportunityId={opportunity.id} assignedTo={opportunity.assignedTo} />
            </dd>
          </div>
          <div>
            <dt className="inline text-[11px] uppercase tracking-[0.06em]">Recent </dt>
            <dd className="inline text-foreground">
              {opportunity.lastActivityLabel}
              <span className="text-muted-foreground">
                {" "}
                · {formatRelative(opportunity.lastActivityAt)}
              </span>
            </dd>
          </div>
          {opportunity.recordKind === "prospect" && !showCensusPriority ? (
            <div>
              <dt className="inline text-[11px] uppercase tracking-[0.06em]">Outreach readiness </dt>
              <dd className="inline text-foreground">
                {outreachReadinessLabel(outreach.readiness)}
                <span className="text-muted-foreground"> · {outreach.reason}</span>
              </dd>
            </div>
          ) : null}
        </dl>

        {why ? (
          <div className="mt-4 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Why this matters
            </p>
            <p className="mt-1 text-sm text-foreground">{why}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <NextStepPanel
          title={next.title}
          body={next.body}
          action={
            closed ? undefined : inHandoff || !unenriched ? (
              <>
                <PrimaryAction opportunity={opportunity} carrier={carrier ?? undefined} />
                {unenriched ? (
                  <Button variant="outline" onClick={() => setEnrichOpen(true)}>
                    Add USDOT to enrich
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button onClick={() => setEnrichOpen(true)}>Add USDOT to enrich</Button>
                {canQualifyUnenriched ? (
                  <PrimaryAction
                    variant="outline"
                    opportunity={opportunity}
                    carrier={carrier ?? undefined}
                  />
                ) : null}
              </>
            )
          }
        />
      </div>

      <div className="mt-8">
        <WorkflowLane current={step} compact />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fmcsa">FMCSA Profile</TabsTrigger>
          <TabsTrigger value="why">Why this opportunity</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {unenriched ? (
            <dl className="max-w-xl divide-y divide-border">
              <Fact label="Company" value={carrier?.legalName ?? "—"} provenance="CRM" />
              <Fact label="Contact" value={opportunity.contactName ?? "—"} provenance="CRM" />
              <Fact label="Email" value={carrier?.email ?? "—"} provenance="CRM" />
              <Fact label="Phone" value={carrier?.phone ?? "—"} provenance="CRM" />
              <Fact label="State" value={carrier?.state || "—"} provenance="CRM" />
              <Fact
                label="USDOT"
                value={
                  carrier?.usdot ? (
                    <span className="tabular">
                      {formatUsdot(carrier.usdot)} (entered, not verified)
                    </span>
                  ) : (
                    "Not provided"
                  )
                }
                provenance="CRM"
              />
              <Fact label="Stated need" value={opportunity.statedNeed ?? "—"} provenance="CRM" />
              <Fact
                label="Owner"
                value={
                  <OwnerAssignSelect opportunityId={opportunity.id} assignedTo={opportunity.assignedTo} />
                }
                provenance="CRM"
              />
              <Fact label="FMCSA" value="Profile not connected" provenance="CRM" />
            </dl>
          ) : (
            <dl className="max-w-xl divide-y divide-border">
              <Fact label="Legal name" value={carrier?.legalName ?? "—"} provenance={fieldSource} />
              <Fact
                label="USDOT"
                value={carrier ? <span className="tabular">{carrier.usdot}</span> : "—"}
                provenance={fieldSource}
              />
              <Fact
                label="Location"
                value={carrier ? `${carrier.city}, ${carrier.state}` : "—"}
                provenance={fieldSource}
              />
              <Fact label="Contact" value={opportunity.contactName ?? "—"} provenance="CRM" />
              <Fact label="Language" value={opportunity.preferredLanguage ?? "Not captured"} provenance="CRM" />
              <Fact
                label="Owner"
                value={
                  <OwnerAssignSelect opportunityId={opportunity.id} assignedTo={opportunity.assignedTo} />
                }
                provenance="CRM"
              />
              <Fact
                label="Qualification"
                value={
                  opportunity.interestLevel
                    ? `Interest ${opportunity.interestLevel}`
                    : "Not qualified yet"
                }
                provenance="CRM"
              />
            </dl>
          )}
        </TabsContent>

        <TabsContent value="fmcsa" className="mt-4">
          {unenriched ? (
            <EmptyState
              title="FMCSA profile not connected"
              description="Enter a USDOT to look up a verified profile. Fleet facts stay blank until then."
              action={
                <Button size="sm" onClick={() => setEnrichOpen(true)}>
                  Add USDOT to enrich
                </Button>
              }
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {isDemoProfile(carrier)
                  ? "These fields are shaped like public FMCSA data. This is a seeded walkthrough profile, not a live lookup."
                  : "Public carrier fields from the last FMCSA lookup. Human review is required before outreach."}
              </p>
              <dl className="max-w-xl divide-y divide-border">
                <Fact label="Legal name" value={carrier?.legalName ?? "—"} provenance={fieldSource} />
                <Fact
                  label="USDOT"
                  value={carrier ? <span className="tabular">{carrier.usdot}</span> : "—"}
                  provenance={fieldSource}
                />
                <Fact
                  label="Location"
                  value={carrier ? `${carrier.city}, ${carrier.state}` : "—"}
                  provenance={fieldSource}
                />
                <Fact label="Power units" value={carrier?.powerUnits ?? "—"} provenance={fieldSource} />
                <Fact label="Drivers" value={carrier?.drivers ?? "—"} provenance={fieldSource} />
                <Fact
                  label="Operation"
                  value={carrier?.operationType === "interstate" ? "Interstate" : "Intrastate"}
                  provenance={fieldSource}
                />
                <Fact label="New Entrant" value={carrier?.newEntrant ? "Yes" : "No"} provenance={fieldSource} />
                <Fact
                  label="Authorized for hire"
                  value={carrier?.authorizedForHire ? "Yes" : "No"}
                  provenance={fieldSource}
                />
                <Fact label="Authority" value={carrier?.authorityStatus ?? "—"} provenance={fieldSource} />
                <Fact label="Hazmat" value={carrier?.hazmat ? "Yes" : "No"} provenance={fieldSource} />
                <Fact label="Passenger" value={carrier?.passenger ? "Yes" : "No"} provenance={fieldSource} />
                <Fact label="Cargo" value={carrier?.cargoTypes.join(", ") ?? "—"} provenance={fieldSource} />
                <Fact label="Phone" value={carrier?.phone ?? "Not on file"} provenance={fieldSource} />
                <Fact label="Email" value={carrier?.email ?? "Not on file"} provenance={fieldSource} />
                <Fact
                  label="Source checked"
                  value={carrier ? formatDate(carrier.sourceLastCheckedAt) : "—"}
                  provenance={fieldSource}
                />
                <Fact
                  label="Existing customer"
                  value={
                    carrier?.isCustomer
                      ? `Yes${carrier.existingServices.length ? ` · ${carrier.existingServices.join(", ")}` : ""}`
                      : "No"
                  }
                  provenance="CRM"
                />
              </dl>

              <div className="mt-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Snapshots
                </p>
                {(snapshotsQuery.data ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No historical snapshots. They appear when fleet or authority fields change over time.
                  </p>
                ) : (
                  <table className="mt-2 w-full max-w-xl text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 font-medium">Date</th>
                        <th className="py-2 font-medium">Power units</th>
                        <th className="py-2 font-medium">Drivers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snapshotsQuery.data ?? []).map((snapshot) => (
                        <tr key={snapshot.id} className="border-b border-border">
                          <td className="py-2">{formatDate(snapshot.snapshotDate)}</td>
                          <td className="tabular py-2">{snapshot.powerUnits}</td>
                          <td className="tabular py-2">{snapshot.drivers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="why" className="mt-4">
          {unenriched ? (
            <EmptyState
              title="Opportunity signals unavailable"
              description="Connect FMCSA to see relevance score, signals, and suggested service. None of these are invented for intake-only leads."
              action={
                <Button size="sm" onClick={() => setEnrichOpen(true)}>
                  Add USDOT to enrich
                </Button>
              }
            />
          ) : (
            <div className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:items-start">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Relevance score
                  </p>
                  <p className="tabular text-[44px] font-medium leading-none tracking-tight">
                    {opportunity.score}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Not purchasing intent. Capped at 100.
                  </p>
                </div>
                <ScoreExplain lines={opportunity.scoreBreakdown} />
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Suggested service
                </p>
                <p className="mt-1 text-sm">{opportunity.recommendedService}</p>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{opportunity.reasonSummary}</p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Signals
                </p>
                {(signalsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No signals recorded for this carrier.</p>
                ) : (
                  <ul className="max-w-2xl divide-y divide-border border-y border-border">
                    {(signalsQuery.data ?? []).map((signal) => (
                      <li key={signal.id} className="py-3">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-sm font-medium">{signal.title}</p>
                          <p className="tabular text-sm">+{signal.scoreContribution}</p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{signal.description}</p>
                        <div className="mt-1">
                          <ProvenanceLabel value={signal.source} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 max-w-2xl">
          {(activitiesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Add a note or schedule a follow-up to start the timeline."
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNoteOpen(true)}>
                    Add note
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setFollowOpen(true)}>
                    Schedule follow-up
                  </Button>
                </div>
              }
            />
          ) : (
            <ActivityTimeline activities={activitiesQuery.data ?? []} />
          )}
        </TabsContent>

        <TabsContent value="calls" className="mt-4 max-w-2xl">
          {linkedCalls.length === 0 ? (
            <EmptyState
              title="No calls yet"
              description={
                unenriched
                  ? canQualifyUnenriched
                    ? `${callActionLabel(opportunity.recordKind)} with intake context, or add USDOT for FMCSA-backed qualification.`
                    : "Add a phone number to call with intake context, or add USDOT to enrich."
                  : canQualifyStage
                    ? `${callActionLabel(opportunity.recordKind)} to capture interest, language, and next step.`
                    : "No qualification calls are linked to this record."
              }
              action={
                unenriched ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => setEnrichOpen(true)}>
                      Add USDOT to enrich
                    </Button>
                    {canQualifyUnenriched ? (
                      <PrimaryAction
                        variant="outline"
                        opportunity={opportunity}
                        carrier={carrier ?? undefined}
                      />
                    ) : null}
                  </div>
                ) : canQualifyStage ? (
                  <PrimaryAction opportunity={opportunity} carrier={carrier ?? undefined} />
                ) : undefined
              }
            />
          ) : (
            <>
              {linkedCalls[0] ? (
                <section className="mb-6">
                  <h3 className="text-sm font-medium">Last qualification call</h3>
                  <div className="mt-3">
                    <CallConclusionFields
                      qualification={linkedCalls[0].qualification}
                      call={linkedCalls[0]}
                      nextStepFallback={opportunity.nextAction}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    nativeButton={false}
                    render={<Link href={`/calls/${linkedCalls[0].id}`} />}
                  >
                    Open call
                  </Button>
                </section>
              ) : null}
            <ul className="divide-y divide-border border-y border-border">
              {linkedCalls.map((call) => (
                <li key={call.id} className="flex items-baseline justify-between gap-4 py-3">
                  <div>
                    <Link href={`/calls/${call.id}`} className="text-sm font-medium hover:underline">
                      {call.englishSummary.slice(0, 120) || "Qualification call"}
                      {call.englishSummary.length > 120 ? "…" : ""}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {call.status} · {call.language} · {formatRelative(call.createdAt)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/calls/${call.id}`} />}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
            </>
          )}
          {opportunity.interestLevel || opportunity.preferredLanguage ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {opportunity.interestLevel ? `Interest ${opportunity.interestLevel}.` : ""}
              {opportunity.preferredLanguage
                ? ` Preferred language ${opportunity.preferredLanguage}.`
                : ""}
              {opportunity.callbackRequested ? " Callback requested." : ""}
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 max-w-2xl">
          {!opportunity.caseId ? (
            <EmptyState
              title="Documents appear after Start service"
              description="Approve service, then start service to open a Docket case."
              action={
                opportunity.consultationStatus === "service_approved" ? (
                  <PrimaryAction opportunity={opportunity} carrier={carrier ?? undefined} />
                ) : undefined
              }
            />
          ) : documents.length === 0 ? (
            <EmptyState
              title="No documents on this case yet"
              description="Open the case in Docket to upload or review items."
              action={
                <Button size="sm" nativeButton={false} render={<Link href={`/docket/${opportunity.caseId}`} />}>
                  Open case
                </Button>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border border-y border-border">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm">
                        {DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                      </p>
                      <p className="text-xs text-muted-foreground">{doc.fileName ?? "No file"}</p>
                    </div>
                    <DocumentStatusBadge status={doc.reviewStatus} />
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/docket/${opportunity.caseId}`} />}>
                  Open case
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 max-w-2xl">
          <EmptyState
            title="Invoices are not available yet"
            description="Billing is out of scope for this screen. Fulfillment documents stay on the service case."
          />
        </TabsContent>
      </Tabs>

      <EnrichUsdotDialog
        opportunityId={opportunity.id}
        defaultUsdot={carrier?.usdot ?? ""}
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        title={censusProfile ? "Enrich with USDOT" : "Add USDOT to enrich"}
        description={
          censusProfile
            ? "Run a live FMCSA lookup on this USDOT to upgrade the Census profile. Creation source stays unchanged."
            : undefined
        }
      />

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
            <DialogDescription>Notes stay on the opportunity activity stream.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!note.trim()) return;
                await mutations.addNote.mutateAsync({ id: opportunity.id, content: note.trim() });
                setNote("");
                setNoteOpen(false);
                toast.success("Note added");
              }}
            >
              Add note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followOpen} onOpenChange={setFollowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule follow-up</DialogTitle>
            <DialogDescription>Sets the next action on this opportunity.</DialogDescription>
          </DialogHeader>
          <Input type="datetime-local" value={followAt} onChange={(event) => setFollowAt(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await mutations.scheduleFollowUp.mutateAsync({
                  id: opportunity.id,
                  at: new Date(followAt).toISOString(),
                });
                setFollowOpen(false);
                toast.success("Follow-up scheduled");
              }}
            >
              Schedule follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss opportunity</DialogTitle>
            <DialogDescription>Use this when the profile is not worth outreach.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await mutations.dismiss.mutateAsync({
                  id: opportunity.id,
                  reason: reason.trim() || "Not a fit",
                });
                setDismissOpen(false);
                toast.success("Opportunity dismissed");
              }}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Lost</DialogTitle>
            <DialogDescription>Records that this opportunity will not convert.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await mutations.markLost.mutateAsync({
                  id: opportunity.id,
                  reason: reason.trim() || "Not proceeding",
                });
                setLostOpen(false);
                toast.success("Opportunity marked Lost");
              }}
            >
              Mark Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
