"use client";

import { ProspectingFiltersBar } from "@/components/prospecting/prospecting-filters";
import { ProspectingResultsTable } from "@/components/prospecting/prospecting-results";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useCarriers, useOpportunityMutations, useProspects } from "@/hooks/use-skyos";
import { searchProspecting } from "@/lib/live/prospecting-client";
import { buildWorkspaceDuplicateIndex } from "@/lib/prospecting/dedupe";
import { defaultProspectingFilters } from "@/lib/prospecting/search";
import type { DiscoveredProspect, ProspectingSearchResult } from "@/lib/prospecting/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function ProspectingPage() {
  const router = useRouter();
  const { demoMode } = useDemoMode();
  const mutations = useOpportunityMutations();
  const prospectsQuery = useProspects();
  const carriersQuery = useCarriers();
  const [filters, setFilters] = useState(defaultProspectingFilters());
  const [result, setResult] = useState<ProspectingSearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingUsdot, setSavingUsdot] = useState<string | null>(null);

  const workspaceDedupe = useMemo(() => {
    return buildWorkspaceDuplicateIndex(
      carriersQuery.data ?? [],
      prospectsQuery.data ?? [],
    );
  }, [carriersQuery.data, prospectsQuery.data]);

  const runSearch = useCallback(
    async (nextFilters = filters) => {
      setBusy(true);
      setError(null);
      try {
        const payload = await searchProspecting(nextFilters);
        const prospects = payload.prospects.map((row) => ({
          ...row,
          alreadyInWorkspace: workspaceDedupe.usdots.has(row.usdot.replace(/\D/g, "")),
          duplicateLabel: workspaceDedupe.labels.get(row.usdot.replace(/\D/g, "")) ?? null,
        }));
        setResult({ ...payload, prospects });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Prospecting search failed.");
        setResult(null);
      } finally {
        setBusy(false);
      }
    },
    [filters, workspaceDedupe],
  );

  useEffect(() => {
    void runSearch(defaultProspectingFilters());
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prospects = result?.prospects ?? [];

  const insights = useMemo(() => {
    const highPriority = prospects.filter((row) => row.score >= 60).length;
    const recent = prospects.filter((row) =>
      row.scoreLines.some((line) => line.key.startsWith("REGISTRATION_") && line.points >= 25),
    ).length;
    const onboardingFit = prospects.filter(
      (row) => row.suggestedService.toLowerCase().includes("onboarding") && row.powerUnits <= 10,
    ).length;
    return { highPriority, recent, onboardingFit };
  }, [prospects]);

  async function handleSave(prospect: DiscoveredProspect) {
    if (!result) return;
    setSavingUsdot(prospect.usdot);
    try {
      const saved = await mutations.ingestCensusProspect.mutateAsync({
        usdot: prospect.usdot,
        legalName: prospect.legalName,
        dbaName: prospect.dbaName,
        city: prospect.city,
        state: prospect.state,
        powerUnits: prospect.powerUnits,
        drivers: prospect.drivers,
        phone: prospect.phone,
        email: prospect.email,
        carrierOperation: prospect.carrierOperation,
        classdef: prospect.classdef,
        addDate: prospect.addDate,
        sourceRef: `az4n-8mr2 · ${result.sourceUrl}`,
        queriedAt: prospect.queriedAt,
        reviewReason: prospect.reviewReason,
        outreachReadiness: prospect.outreachReadiness,
        outreachReadinessReason: prospect.outreachReason,
        discoveryScore: prospect.score,
      });
      toast.success("Prospect saved to Saved Prospects");
      router.push(`/opportunities/${saved.opportunityId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save prospect.");
    } finally {
      setSavingUsdot(null);
    }
  }

  return (
    <PageBody>
      <PageHeader
        title="Prospecting"
        meta={
          <span>
            SkySignal · FMCSA Company Census · {demoMode ? "Demo or live query" : "Live Census query"}
          </span>
        }
      />

      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Discover carriers in your target market from public FMCSA Census data. Results stay here until
        you save an approved carrier as a Prospect. Contact details are not outreach consent.
      </p>

      <div className="mt-6">
        <ProspectingFiltersBar
          filters={filters}
          onChange={setFilters}
          onSearch={() => void runSearch(filters)}
          busy={busy}
        />
      </div>

      {result ? (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <InsightCard
            label="High priority"
            value={insights.highPriority}
            hint="Score 60+ on returned fields"
          />
          <InsightCard
            label="Recently registered"
            value={insights.recent}
            hint="Within 12 months"
          />
          <InsightCard
            label="Onboarding fit"
            value={insights.onboardingFit}
            hint="Small fleet · onboarding service"
          />
          <p className="self-center text-xs text-muted-foreground">
            {result.live ? "Live Census query" : "Demo mock results"} · Queried{" "}
            {new Date(result.queriedAt).toLocaleString()} · {result.totalEligible} shown
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        {busy && !result ? (
          <p className="py-10 text-sm text-muted-foreground">Querying FMCSA Census…</p>
        ) : error ? (
          <ErrorState title="Prospecting search failed." description={error} />
        ) : !result ? (
          <EmptyState
            title="Run a Census search"
            description="Set filters and search to review carriers in your target market."
          />
        ) : (
          <>
            <ProspectingResultsTable
              prospects={prospects}
              savingUsdot={savingUsdot}
              onSave={handleSave}
            />
            {result.totalEligible >= result.limit ? (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || filters.offset === 0}
                  onClick={() => {
                    const next = { ...filters, offset: Math.max(filters.offset - result.limit, 0) };
                    setFilters(next);
                    void runSearch(next);
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || prospects.length < result.limit}
                  onClick={() => {
                    const next = { ...filters, offset: filters.offset + result.limit };
                    setFilters(next);
                    void runSearch(next);
                  }}
                >
                  Next page
                </Button>
                <span className="text-xs text-muted-foreground">
                  Offset {filters.offset} · limit {result.limit}
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageBody>
  );
}

function InsightCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="min-w-[140px] border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-medium tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
