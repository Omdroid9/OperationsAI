"use client";

import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { CarrierName } from "@/components/shared/profile-kind";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllMatches,
  useCarriers,
  useCases,
  useRegulationMutations,
  useRegulations,
} from "@/hooks/use-skyos";
import { formatDate, formatDateShort } from "@/lib/format";
import { MATCH_LABEL } from "@/lib/labels";
import { getProfileKind } from "@/lib/profile";
import { summarizeAffectedCarriers, type AffectedCarrierSummary } from "@/lib/regulations/match";
import type { Carrier, Regulation, ServiceCase } from "@/types";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function noticeStatus(row: Regulation): { label: string; tone: "info" | "warning" } {
  if (row.sourceType === "federal_register") return { label: "Fetched", tone: "info" };
  if (row.status === "analyzed") return { label: "Analyzed", tone: "info" };
  return { label: "Needs review", tone: "warning" };
}

function noticeSource(row: Regulation): string {
  if (row.sourceType === "federal_register") return "Live FR";
  if (row.sourceType === "demo_seed") return "Demo";
  return "Paste";
}

function isQueueNotice(row: Regulation): boolean {
  if (row.sourceType === "demo_seed") return false;
  return (
    row.sourceType === "federal_register" ||
    row.sourceType === "manual_paste" ||
    row.sourceType == null
  );
}

export default function RegLensPage() {
  const regulations = useRegulations();
  const matchesQuery = useAllMatches();
  const carriers = useCarriers();
  const cases = useCases();
  const regulationMutations = useRegulationMutations();
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const notices = useMemo(
    () => (regulations.data ?? []).filter(isQueueNotice),
    [regulations.data],
  );

  const lastFetch = useMemo(() => {
    const times = notices.map((row) => row.fetchedAt).filter((value): value is string => Boolean(value));
    if (times.length === 0) return null;
    return times.sort().at(-1) ?? null;
  }, [notices]);

  const customers = useMemo(
    () =>
      summarizeAffectedCarriers(notices, matchesQuery.data ?? {}).filter(
        (item) => item.audience === "customer",
      ),
    [notices, matchesQuery.data],
  );

  const carrierMap = useMemo(
    () => new Map((carriers.data ?? []).map((item) => [item.id, item])),
    [carriers.data],
  );
  const caseByCarrier = useMemo(
    () => new Map((cases.data ?? []).map((item) => [item.carrierId, item])),
    [cases.data],
  );

  async function fetchNotices() {
    setFetching(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/reglens/fetch", { method: "POST" });
      const payload = (await response.json()) as {
        ok: boolean;
        entries?: Parameters<typeof regulationMutations.importFederalRegister.mutateAsync>[0];
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.entries) {
        throw new Error(payload.error ?? "Fetch failed");
      }
      const result = await regulationMutations.importFederalRegister.mutateAsync(payload.entries);
      if (result.imported === 0 && result.skipped > 0) {
        toast.message("These notices are already in the queue. Clear processed, then fetch again.");
        return;
      }
      toast.success(`${result.imported} notices fetched`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fetch failed";
      setFetchError(message);
      toast.error(message);
    } finally {
      setFetching(false);
    }
  }

  async function clearProcessed() {
    const count = await regulationMutations.clearFederalRegister.mutateAsync();
    toast.success(`${count} notice${count === 1 ? "" : "s"} cleared`);
  }

  async function analyzePaste() {
    const text = pasteText.trim();
    if (text.length < 40) {
      setAnalyzeError("Paste at least a short notice before analyzing.");
      return;
    }
    setAnalyzeError(null);
    try {
      const regulation = await regulationMutations.analyze.mutateAsync(text);
      setPasteText("");
      toast.success("Notice analyzed", { description: regulation.title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis unavailable.";
      setAnalyzeError(message);
      toast.error(message);
    }
  }

  const loading = regulations.isLoading || matchesQuery.isLoading;
  const failed = regulations.isError || matchesQuery.isError;

  return (
    <PageBody className="max-w-none">
      <PageHeader
        title="RegLens"
        description="Paste a notice or fetch the latest FMCSA notices, then review current customers that may be affected. Not a legal opinion."
        meta={
          lastFetch ? (
            <span>
              Last fetch {formatDate(lastFetch)}
              <span className="mx-2 text-border">·</span>
              {notices.length} in queue
            </span>
          ) : notices.length > 0 ? (
            `${notices.length} in queue`
          ) : (
            "No notices this session"
          )
        }
        actions={
          <>
            <Button variant="outline" disabled={notices.length === 0} onClick={() => void clearProcessed()}>
              Clear processed
            </Button>
            <Button disabled={fetching} onClick={() => void fetchNotices()}>
              {fetching ? "Fetching…" : "Fetch latest FMCSA notices"}
            </Button>
          </>
        }
      />

      {fetchError ? <p className="mt-3 text-sm text-destructive">{fetchError}</p> : null}

      <section className="mt-8 max-w-2xl">
        <h2 className="text-sm font-medium">Paste for review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze a notice against current customers. Review recommended — not a finding.
        </p>
        <Textarea
          className="mt-3 min-h-32"
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
          placeholder="Paste FMCSA or Federal Register text for this session."
          disabled={regulationMutations.analyze.isPending}
          aria-label="Notice text to analyze"
        />
        {analyzeError ? <p className="mt-2 text-sm text-destructive">{analyzeError}</p> : null}
        <div className="mt-3">
          <Button
            disabled={regulationMutations.analyze.isPending || pasteText.trim().length < 40}
            onClick={() => void analyzePaste()}
          >
            {regulationMutations.analyze.isPending ? "Analyzing…" : "Analyze notice"}
          </Button>
        </div>
      </section>

      <AffectedCustomersSection
        rows={customers}
        carrierMap={carrierMap}
        caseByCarrier={caseByCarrier}
        loading={loading}
      />

      <section className="mt-10">
        <h2 className="text-sm font-medium">Notices</h2>
        {loading ? (
          <div className="mt-3">
            <TableSkeleton rows={6} />
          </div>
        ) : failed ? (
          <ErrorState title="Notices could not be loaded." />
        ) : notices.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No notices in queue"
              description="Paste a notice or fetch the latest FMCSA notices to start a review session. Clear processed when this batch is done."
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-24" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="h-9 pr-4 font-medium">Title</th>
                  <th className="h-9 px-2 font-medium">Doc #</th>
                  <th className="h-9 px-2 font-medium">Agency</th>
                  <th className="h-9 px-2 font-medium">Published</th>
                  <th className="h-9 px-2 font-medium">Status</th>
                  <th className="h-9 pl-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((row) => {
                  const status = noticeStatus(row);
                  return (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                      <td className="h-11 max-w-0 pr-4">
                        <Link
                          href={`/reglens/${row.id}`}
                          className="block truncate font-medium hover:underline"
                          title={row.title}
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-2 font-mono text-xs text-muted-foreground tabular">
                        {row.documentNumber ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 text-muted-foreground">{row.agency}</td>
                      <td className="whitespace-nowrap px-2 tabular text-muted-foreground">
                        {formatDateShort(row.publishedDate)}
                      </td>
                      <td className="whitespace-nowrap px-2">
                        <StatusBadge label={status.label} tone={status.tone} />
                      </td>
                      <td className="whitespace-nowrap pl-2 text-xs text-muted-foreground">
                        {noticeSource(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageBody>
  );
}

function AffectedCustomersSection({
  rows,
  carrierMap,
  caseByCarrier,
  loading,
}: {
  rows: AffectedCarrierSummary[];
  carrierMap: Map<string, Carrier>;
  caseByCarrier: Map<string, ServiceCase>;
  loading: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium">Current customers</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Customers whose operating profile may overlap this batch. Review recommended — not a finding.
      </p>
      {loading ? (
        <div className="mt-3">
          <TableSkeleton rows={4} />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No current customers look like a match for this batch.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col />
              <col className="w-36" />
              <col />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="h-9 pr-4 font-medium">Carrier</th>
                <th className="h-9 px-2 font-medium">Match</th>
                <th className="h-9 px-2 font-medium">Notice</th>
                <th className="h-9 pl-2 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const carrier = carrierMap.get(row.carrierId);
                const serviceCase = caseByCarrier.get(row.carrierId);
                return (
                  <tr key={row.carrierId} className="border-b border-border hover:bg-muted/50">
                    <td className="h-11 max-w-0 pr-4">
                      <span className="block truncate">
                        <CarrierName
                          name={carrier?.legalName ?? row.carrierId}
                          kind={getProfileKind(carrier)}
                        />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {row.reason}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <StatusBadge
                        label={MATCH_LABEL[row.matchType]}
                        tone={row.matchType === "confirmed" ? "info" : "warning"}
                      />
                    </td>
                    <td className="max-w-0 px-2">
                      <Link
                        href={`/reglens/${row.regulationId}`}
                        className="block truncate hover:underline"
                        title={row.regulationTitle}
                      >
                        {row.regulationTitle}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap pl-2">
                      {serviceCase ? (
                        <Link href={`/docket/${serviceCase.id}`} className="text-xs hover:underline">
                          Case
                        </Link>
                      ) : (
                        <Link href={`/reglens/${row.regulationId}`} className="text-xs hover:underline">
                          Notice
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
