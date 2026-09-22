"use client";

import { CarrierName } from "@/components/shared/profile-kind";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/empty-state";
import { NextStepPanel } from "@/components/shared/next-step";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { ProvenanceLabel } from "@/components/shared/provenance-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCarriers,
  useCases,
  useInvalidateAll,
  useMatches,
  useRegulation,
  useRegulationMutations,
} from "@/hooks/use-skyos";
import { staffDisplayName } from "@/data/staff";
import { formatDate, formatPercent } from "@/lib/format";
import { MATCH_LABEL } from "@/lib/labels";
import { getProfileKind } from "@/lib/profile";
import { getRegulationRepository } from "@/lib/repositories";
import type { Carrier, RegulationMatch, ServiceCase } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function CustomerMatchList({
  matches,
  carrierMap,
  caseByCarrier,
}: {
  matches: RegulationMatch[];
  carrierMap: Map<string, Carrier>;
  caseByCarrier: Map<string, string>;
}) {
  if (matches.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-medium">Current customers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What may need to change for carriers you already serve.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">No current customers look like a match.</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium">Current customers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        What may need to change for carriers you already serve. Flagging adds a task on their Docket
        case.
      </p>
      <ul className="mt-3 max-w-2xl divide-y divide-border border-y border-border">
        {matches.map((match) => {
          const carrier = carrierMap.get(match.carrierId);
          const caseId = caseByCarrier.get(match.carrierId);
          return (
            <li key={match.carrierId} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CarrierName name={carrier?.legalName ?? match.carrierId} kind={getProfileKind(carrier)} />
                  <p className="mt-1 text-xs text-muted-foreground">{match.reason}</p>
                  <p className="mt-2 text-sm text-foreground">
                    Recommended change: {match.requiredChange}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge
                    label={MATCH_LABEL[match.matchType]}
                    tone={match.matchType === "confirmed" ? "info" : "warning"}
                  />
                  {caseId ? (
                    <Link href={`/docket/${caseId}`} className="text-xs hover:underline">
                      Open case
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function RegLensDetailPage() {
  const params = useParams<{ id: string }>();
  const regulationQuery = useRegulation(params.id);
  const matchesQuery = useMatches(params.id);
  const carriers = useCarriers();
  const cases = useCases();
  const invalidate = useInvalidateAll();
  const regulationMutations = useRegulationMutations();
  const regulation = regulationQuery.data;
  const [relevantOpen, setRelevantOpen] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [reason, setReason] = useState("");

  if (regulationQuery.isLoading) {
    return (
      <PageBody>
        <TableSkeleton />
      </PageBody>
    );
  }
  if (regulationQuery.isError) {
    return (
      <PageBody>
        <ErrorState title="Regulation could not be loaded." />
      </PageBody>
    );
  }
  if (!regulation) {
    return (
      <PageBody>
        <EmptyState title="Regulation not found." />
      </PageBody>
    );
  }

  const carrierMap = new Map((carriers.data ?? []).map((item) => [item.id, item]));
  const caseByCarrier = new Map((cases.data ?? []).map((item) => [item.carrierId, item.id]));
  const customerMatches = (matchesQuery.data ?? []).filter((item) => item.audience === "customer");
  const openCases = (cases.data ?? []).filter((item) => item.status !== "COMPLETE");

  return (
    <PageBody>
      <PageHeader
        title={regulation.title}
        meta={
          <span>
            {regulation.agency}
            <span className="mx-2 text-border">·</span>
            {regulation.category}
            {regulation.documentNumber ? (
              <>
                <span className="mx-2 text-border">·</span>
                <span className="font-mono tabular">{regulation.documentNumber}</span>
              </>
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setRelevantOpen(true)}>
              Mark relevant to case
            </Button>
            <Button
              variant="outline"
              disabled={regulation.customersFlagged}
              onClick={async () => {
                const count = await getRegulationRepository().flagCustomers(regulation.id);
                invalidate();
                toast.success(`${count} current customers flagged with recommended changes`);
              }}
            >
              Flag current customers
            </Button>
          </div>
        }
      />

      <div className="mt-5">
        <NextStepPanel
          title={
            customerMatches.length > 0
              ? "Review current customers, then flag or mark a case"
              : "No current customers matched — mark a case if review is still needed"
          }
          body="Matching is a suggested overlap with customer profiles, not a compliance finding. Mark relevant to case creates a Docket task for the owner."
          action={
            <Button onClick={() => setRelevantOpen(true)}>Mark relevant to case</Button>
          }
        />
      </div>

      <dl className="mt-6 max-w-xl divide-y divide-border border-y border-border">
        {regulation.sourceUrl ? (
          <Field
            label="Source"
            value={
              <a href={regulation.sourceUrl} className="text-info hover:underline" target="_blank" rel="noreferrer">
                Federal Register document
              </a>
            }
          />
        ) : null}
        {regulation.documentNumber ? (
          <Field
            label="Document number"
            value={<span className="font-mono tabular">{regulation.documentNumber}</span>}
          />
        ) : null}
        {regulation.sourceType ? (
          <Field
            label="Provenance"
            value={
              regulation.sourceType === "federal_register"
                ? "Live · Federal Register (FMCSA agency)"
                : regulation.sourceType === "demo_seed"
                  ? "Demo seed"
                  : regulation.sourceType === "manual_paste"
                    ? "Paste"
                    : regulation.sourceType.replace("_", " ")
            }
          />
        ) : null}
        <Field label="Published" value={formatDate(regulation.publishedDate)} />
        <Field label="Effective" value={formatDate(regulation.effectiveDate)} />
        <Field label="Deadline" value={formatDate(regulation.deadline)} />
        <Field label="Affected segment" value={regulation.affectedSegment} />
        <Field label="Recommended review" value={regulation.requiredAction} />
        <Field
          label="Confidence"
          value={
            <span className="tabular">
              {formatPercent(regulation.confidence)} <ProvenanceLabel value="AI_EXTRACTED" />
            </span>
          }
        />
      </dl>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{regulation.sourceSummary}</p>

      <p className="mt-6 text-sm">
        Current customers matched{" "}
        <span className="tabular font-medium">{customerMatches.length}</span>
      </p>

      <CustomerMatchList
        matches={customerMatches}
        carrierMap={carrierMap}
        caseByCarrier={caseByCarrier}
      />

      <Dialog open={relevantOpen} onOpenChange={setRelevantOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark relevant to case</DialogTitle>
            <DialogDescription>
              Creates a review task on the Docket case for the case owner. Review recommended — not a
              compliance conclusion.
            </DialogDescription>
          </DialogHeader>
          <Select value={caseId} onValueChange={(value) => setCaseId(value ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select case" />
            </SelectTrigger>
            <SelectContent>
              {openCases.map((item) => (
                <CaseSelectItem key={item.id} serviceCase={item} carriers={carriers.data ?? []} />
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Why this may affect the case"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelevantOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!caseId.trim() || !reason.trim()}
              onClick={async () => {
                await regulationMutations.markRelevantToCase.mutateAsync({
                  regulationId: regulation.id,
                  caseId,
                  reason: reason.trim(),
                  decidedBy: "You",
                });
                setRelevantOpen(false);
                setReason("");
                toast.success("Case task created for case owner");
              }}
            >
              Mark relevant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}

function CaseSelectItem({
  serviceCase,
  carriers,
}: {
  serviceCase: ServiceCase;
  carriers: Carrier[];
}) {
  const name = carriers.find((item) => item.id === serviceCase.carrierId)?.legalName ?? serviceCase.carrierId;
  return (
    <SelectItem value={serviceCase.id}>
      {name} · {staffDisplayName(serviceCase.ownerId)}
    </SelectItem>
  );
}
