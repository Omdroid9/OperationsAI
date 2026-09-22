"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { OwnerAssignSelect } from "@/components/opportunities/owner-assign";
import { useOpportunityMutations } from "@/hooks/use-skyos";
import { CONSULTATION_STATUS_LABEL, consultationNextAction } from "@/lib/consultation/labels";
import { formatDate, formatRelative } from "@/lib/format";
import type { ConsultationStatus, Opportunity } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

const ACTIVE_STATUSES: ConsultationStatus[] = [
  "needs_follow_up",
  "scheduled",
  "complete",
  "service_approved",
];

export function ConsultationPanel({ opportunity }: { opportunity: Opportunity }) {
  const mutations = useOpportunityMutations();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("2026-08-13T14:00");
  const [note, setNote] = useState("");

  const showPanel =
    ACTIVE_STATUSES.includes(opportunity.consultationStatus) ||
    opportunity.stage === "QUALIFIED" ||
    opportunity.stage === "CONSULTATION";

  if (!showPanel) return null;

  const nextAction = consultationNextAction(opportunity.consultationStatus);

  return (
    <section className="mt-6 max-w-2xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Consultation handoff</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {CONSULTATION_STATUS_LABEL[opportunity.consultationStatus]} · Next: {nextAction}
          </p>
        </div>
        <OwnerAssignSelect opportunityId={opportunity.id} assignedTo={opportunity.assignedTo} />
      </div>

      <dl className="mt-3 grid gap-1 text-sm">
        {opportunity.consultationScheduledAt ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Scheduled</dt>
            <dd>
              {formatDate(opportunity.consultationScheduledAt)} ·{" "}
              {formatRelative(opportunity.consultationScheduledAt)}
            </dd>
          </div>
        ) : null}
        {opportunity.consultationNote ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Note</dt>
            <dd>{opportunity.consultationNote}</dd>
          </div>
        ) : null}
        {opportunity.serviceApprovedAt ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Service approved</dt>
            <dd>{formatDate(opportunity.serviceApprovedAt)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {opportunity.consultationStatus === "needs_follow_up" ? (
          <Button size="sm" onClick={() => setScheduleOpen(true)}>
            Schedule consultation
          </Button>
        ) : null}
        {opportunity.consultationStatus === "scheduled" ? (
          <Button size="sm" onClick={() => setCompleteOpen(true)}>
            Complete consultation
          </Button>
        ) : null}
        {opportunity.consultationStatus === "complete" ? (
          <Button
            size="sm"
            onClick={async () => {
              await mutations.approveService.mutateAsync(opportunity.id);
              toast.success("Service approved");
            }}
            disabled={mutations.approveService.isPending}
          >
            Approve service
          </Button>
        ) : null}
        {!["not_moving_forward", "service_approved", "not_applicable"].includes(
          opportunity.consultationStatus,
        ) ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await mutations.notMovingForward.mutateAsync({
                id: opportunity.id,
                note: "Declined after consultation review.",
              });
              toast.message("Marked not moving forward");
            }}
          >
            Not moving forward
          </Button>
        ) : null}
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule consultation</DialogTitle>
            <DialogDescription>Sets follow-up and moves the record to scheduled.</DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.target.value)}
          />
          <Textarea
            placeholder="Optional note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await mutations.scheduleConsultation.mutateAsync({
                  id: opportunity.id,
                  at: new Date(scheduleAt).toISOString(),
                  note: note.trim() || undefined,
                });
                setScheduleOpen(false);
                setNote("");
                toast.success("Consultation scheduled");
              }}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete consultation</DialogTitle>
            <DialogDescription>Records that the consultation happened. Approve service next.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional summary"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await mutations.completeConsultation.mutateAsync({
                  id: opportunity.id,
                  note: note.trim() || undefined,
                });
                setCompleteOpen(false);
                setNote("");
                toast.success("Consultation complete");
              }}
            >
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
