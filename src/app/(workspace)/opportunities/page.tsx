"use client";

import { EmptyState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { StageBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useCarriers, useOpportunityMutations, useProspects } from "@/hooks/use-skyos";
import { creationSourceLabel } from "@/lib/leads/creation";
import { formatRelative } from "@/lib/format";
import {
  outreachReadinessLabel,
  resolveOutreachReadiness,
} from "@/lib/prospects/outreach-readiness";
import {
  DEFAULT_SAVED_PROSPECT_SOURCE_FILTER,
  prospectSourceBucket,
  prospectSourceFilterLabel,
  type SavedProspectSourceFilter,
} from "@/lib/prospects/source-filter";
import type { Opportunity, OutreachReadiness } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Row = Opportunity & {
  carrierName: string;
  usdot: string;
  sourceLabel: string;
  sourceBucket: SavedProspectSourceFilter;
  outreachLabel: string;
  outreachReason: string;
  outreachTone: OutreachReadiness;
};

function outreachToneClass(readiness: OutreachReadiness): string {
  if (readiness === "ready_to_review") return "text-success";
  if (readiness === "needs_review") return "text-amber-800 dark:text-amber-200";
  return "text-muted-foreground";
}

export default function OpportunitiesPage() {
  const opportunities = useProspects();
  const carriers = useCarriers();
  const mutations = useOpportunityMutations();
  const router = useRouter();
  const { demoMode } = useDemoMode();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SavedProspectSourceFilter>(
    DEFAULT_SAVED_PROSPECT_SOURCE_FILTER,
  );
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(row: Row) {
    const confirmed = window.confirm(
      `Remove ${row.carrierName} from Saved Prospects? This cannot be undone from this list.`,
    );
    if (!confirmed) return;
    setRemovingId(row.id);
    try {
      await mutations.removeProspect.mutateAsync(row.id);
      toast.success("Prospect removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove prospect");
    } finally {
      setRemovingId(null);
    }
  }

  const rows = useMemo<Row[]>(() => {
    const carrierMap = new Map((carriers.data ?? []).map((carrier) => [carrier.id, carrier]));
    return (opportunities.data ?? [])
      .map((opportunity) => {
        const bucket = prospectSourceBucket(opportunity.creation.sourceType);
        if (!bucket) return null;
        const carrier = carrierMap.get(opportunity.carrierId);
        const outreach = resolveOutreachReadiness(opportunity, carrier);
        return {
          ...opportunity,
          carrierName: carrier?.legalName ?? opportunity.carrierId,
          usdot: carrier?.usdot ?? "—",
          sourceLabel: creationSourceLabel(opportunity.creation.sourceType),
          sourceBucket: bucket,
          outreachLabel: outreachReadinessLabel(outreach.readiness),
          outreachReason: outreach.reason,
          outreachTone: outreach.readiness,
        } satisfies Row;
      })
      .filter((row): row is Row => row !== null);
  }, [opportunities.data, carriers.data]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (source !== "all" && row.sourceBucket !== source) return false;
      if (!query.trim()) return true;
      const haystack =
        `${row.carrierName} ${row.usdot} ${row.reasonSummary} ${row.sourceLabel}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [rows, query, source]);

  const sourceFilters: SavedProspectSourceFilter[] = [
    "all",
    "census",
    "fmcsa_lookup",
    "regulatory_campaign",
  ];

  const censusCount = rows.filter((row) => row.sourceBucket === "census").length;
  const isCensusFilterEmpty =
    source === "census" && censusCount === 0 && rows.length > 0 && !query.trim();
  const isSearchEmpty = filtered.length === 0 && Boolean(query.trim());
  const isFilterEmpty =
    filtered.length === 0 && rows.length > 0 && !query.trim() && source !== "all";

  return (
    <PageBody className="max-w-none">
      <PageHeader
        title="Saved Prospects"
        description="Carriers you saved from Prospecting (data.transportation.gov Census). Review and outreach happen here."
      />

      {demoMode ? (
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Inbound leads stay in{" "}
          <Link href="/crm" className="text-foreground underline-offset-2 hover:underline">
            CRM
          </Link>
          . Discover new carriers in{" "}
          <Link href="/prospecting" className="text-foreground underline-offset-2 hover:underline">
            Prospecting
          </Link>
          .
        </p>
      ) : (
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Discover carriers in{" "}
          <Link href="/prospecting" className="text-foreground underline-offset-2 hover:underline">
            Prospecting
          </Link>
          , then save approved matches here for review.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search carrier, USDOT, or review note"
          className="w-72"
        />
        <Select
          value={source}
          onValueChange={(value) => setSource(value as SavedProspectSourceFilter)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceFilters.map((item) => (
              <SelectItem key={item} value={item}>
                {prospectSourceFilterLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        {opportunities.isLoading || carriers.isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              isCensusFilterEmpty
                ? "No Census prospects in this list"
                : isSearchEmpty
                  ? "No prospects match this search"
                  : rows.length === 0
                    ? "No saved prospects yet"
                    : isFilterEmpty
                      ? "No prospects match this filter"
                      : "No prospects match this filter"
            }
            description={
              isCensusFilterEmpty
                ? "Switch to All saved, or discover carriers in Prospecting."
                : isSearchEmpty
                  ? "Try a different search term or source filter."
                  : rows.length === 0
                    ? "Discover carriers in Prospecting, then save approved matches here."
                    : "Try a different source filter."
            }
            action={
              isCensusFilterEmpty || rows.length === 0 ? (
                <Button nativeButton={false} render={<Link href="/prospecting" />}>
                  Go to Prospecting
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="h-9 px-2 font-medium">Carrier</th>
                  <th className="h-9 px-2 font-medium">Source</th>
                  <th className="h-9 px-2 font-medium">Why review</th>
                  <th className="h-9 px-2 font-medium">Outreach readiness</th>
                  <th className="h-9 px-2 font-medium">Stage</th>
                  <th className="h-9 px-2 font-medium">Owner</th>
                  <th className="h-9 px-2 font-medium">Next action</th>
                  <th className="h-9 px-2 font-medium">Last activity</th>
                  <th className="sticky right-0 h-9 bg-background px-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border hover:bg-muted/50"
                    onClick={() => router.push(`/opportunities/${row.id}`)}
                  >
                    <td className="h-12 px-2 align-middle">
                      <div className="font-medium text-foreground">{row.carrierName}</div>
                      <div className="font-mono text-xs text-muted-foreground tabular-nums">
                        {row.usdot}
                      </div>
                    </td>
                    <td className="h-12 px-2 align-middle text-muted-foreground">{row.sourceLabel}</td>
                    <td className="h-12 max-w-xs px-2 align-middle text-muted-foreground">
                      <span className="line-clamp-2">{row.reasonSummary}</span>
                    </td>
                    <td className="h-12 max-w-xs px-2 align-middle">
                      <div className={cn("text-sm", outreachToneClass(row.outreachTone))}>
                        {row.outreachLabel}
                      </div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {row.outreachReason}
                      </div>
                    </td>
                    <td className="h-12 px-2 align-middle">
                      <StageBadge stage={row.stage} />
                    </td>
                    <td className="h-12 px-2 align-middle text-muted-foreground">
                      {row.assignedTo ?? "Unassigned"}
                    </td>
                    <td className="h-12 px-2 align-middle text-foreground">{row.nextAction}</td>
                    <td className="h-12 px-2 align-middle text-muted-foreground">
                      <div>{row.lastActivityLabel}</div>
                      <div className="text-xs">{formatRelative(row.lastActivityAt)}</div>
                    </td>
                    <td
                      className="sticky right-0 h-12 bg-background px-2 text-right align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={removingId === row.id}
                        onClick={() => void handleRemove(row)}
                      >
                        {removingId === row.id ? "Removing…" : "Remove"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageBody>
  );
}
