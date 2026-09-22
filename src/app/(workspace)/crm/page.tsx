"use client";

import { AddLeadDialog } from "@/components/crm/add-lead-dialog";
import { EmptyState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
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
import { useCarriers, useLeads, useOpportunityMutations } from "@/hooks/use-skyos";
import { formatRelative } from "@/lib/format";
import { PIPELINE_STAGES, STAGE_LABEL } from "@/lib/labels";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABEL,
  leadPriorityFromScore,
  type LeadPriority,
} from "@/lib/leads/priority";
import type { Opportunity, OpportunityStage } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type LeadRow = Opportunity & {
  carrierName: string;
  priority: LeadPriority;
};

export default function CrmPage() {
  const opportunities = useLeads();
  const carriers = useCarriers();
  const mutations = useOpportunityMutations();
  const { demoMode } = useDemoMode();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | OpportunityStage>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | LeadPriority>("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "unassigned" | string>("all");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "csv">("manual");
  const [simulating, setSimulating] = useState(false);

  const rows = useMemo<LeadRow[]>(() => {
    const carrierMap = new Map((carriers.data ?? []).map((carrier) => [carrier.id, carrier]));
    return (opportunities.data ?? [])
      .filter((item) => item.stage !== "DISMISSED")
      .map((item) => ({
        ...item,
        carrierName: carrierMap.get(item.carrierId)?.legalName ?? item.carrierId,
        priority: leadPriorityFromScore(item.score),
      }))
      .sort((a, b) => {
        const priorityRank = { high: 0, medium: 1, low: 2 } as const;
        const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
        if (byPriority !== 0) return byPriority;
        return b.lastActivityAt.localeCompare(a.lastActivityAt);
      });
  }, [opportunities.data, carriers.data]);

  const stageCounts = useMemo(() => {
    const result = {} as Record<OpportunityStage, number>;
    for (const stage of PIPELINE_STAGES) result[stage] = 0;
    for (const row of rows) {
      result[row.stage] = (result[row.stage] ?? 0) + 1;
    }
    return result;
  }, [rows]);

  const owners = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      if (row.assignedTo?.trim()) names.add(row.assignedTo.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (stageFilter !== "all" && row.stage !== stageFilter) return false;
      if (priorityFilter !== "all" && row.priority !== priorityFilter) return false;
      if (ownerFilter === "unassigned" && row.assignedTo?.trim()) return false;
      if (ownerFilter !== "all" && ownerFilter !== "unassigned" && row.assignedTo !== ownerFilter) {
        return false;
      }
      if (followUpOnly && !row.followUpAt) return false;
      if (needle) {
        const haystack =
          `${row.contactName ?? ""} ${row.carrierName} ${row.nextAction} ${row.assignedTo ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, stageFilter, priorityFilter, ownerFilter, followUpOnly, query]);

  async function simulateWebsiteLead() {
    setSimulating(true);
    try {
      const stamp = Date.now();
      const result = await mutations.createLead.mutateAsync({
        input: {
          contactName: "Priya Shah",
          company: `Bay View Hauling ${String(stamp).slice(-4)}`,
          email: `priya.shah.${stamp}@example.com`,
          phone: "5550199888",
          usdot: "",
          state: "CA",
          statedNeed: "Asked about New Entrant compliance help from the website form.",
          owner: "A. Mehta",
          sourceType: "website_form",
          creationMethod: "demo_simulation",
          sourceRef: `demo-website-${stamp}`,
        },
      });
      if (result.status === "invalid") {
        toast.error(result.errors[0] ?? "Simulation failed.");
        return;
      }
      if (result.status === "duplicate_warning") {
        const forced = await mutations.createLead.mutateAsync({
          input: {
            contactName: "Priya Shah",
            company: `Bay View Hauling ${String(stamp).slice(-4)}`,
            email: `priya.shah.${stamp}@example.com`,
            phone: "5550199888",
            usdot: "",
            state: "CA",
            statedNeed: "Asked about New Entrant compliance help from the website form.",
            owner: "A. Mehta",
            sourceType: "website_form",
            creationMethod: "demo_simulation",
            sourceRef: `demo-website-${stamp}`,
          },
          options: { acknowledgeDuplicates: true },
        });
        if (forced.status === "created") {
          toast.success("Simulated website lead created");
          router.push(`/opportunities/${forced.opportunityId}`);
        }
        return;
      }
      toast.success("Simulated website lead created");
      router.push(`/opportunities/${result.opportunityId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <PageBody className="max-w-none">
      <PageHeader
        title="Leads"
        description={
          demoMode
            ? "Inbound leads only. Use Add lead or Simulate website lead. FMCSA discoveries stay in Opportunities."
            : "Inbound leads only. Add manually or import CSV. Live Mode hides demo-seed and simulated website leads."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {demoMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={simulating}
                onClick={() => void simulateWebsiteLead()}
              >
                {simulating ? "Simulating…" : "Simulate website lead"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAddMode("csv");
                setAddOpen(true);
              }}
            >
              Import CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/opportunities")}
            >
              Review prospects
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAddMode("manual");
                setAddOpen(true);
              }}
            >
              Add lead
            </Button>
          </div>
        }
      />

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} initialMode={addMode} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={stageFilter === "all" ? "default" : "outline"}
          onClick={() => setStageFilter("all")}
        >
          All · {rows.length}
        </Button>
        {PIPELINE_STAGES.map((stage) => {
          const count = stageCounts[stage] ?? 0;
          if (count === 0 && stageFilter !== stage) return null;
          return (
            <Button
              key={stage}
              type="button"
              size="sm"
              variant={stageFilter === stage ? "default" : "outline"}
              onClick={() => setStageFilter(stage)}
            >
              {STAGE_LABEL[stage]} · {count}
            </Button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="leads-search" className="mb-1 block text-[11px] text-muted-foreground">
            Search
          </label>
          <Input
            id="leads-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, company, next action, or owner"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Priority</label>
          <Select
            value={priorityFilter}
            onValueChange={(value) =>
              setPriorityFilter(String(value ?? "all") as "all" | LeadPriority)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {LEAD_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {LEAD_PRIORITY_LABEL[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Owner</label>
          <Select
            value={ownerFilter}
            onValueChange={(value) => setOwnerFilter(String(value ?? "all"))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          variant={followUpOnly ? "default" : "outline"}
          onClick={() => setFollowUpOnly((value) => !value)}
        >
          Needs follow-up
        </Button>
      </div>

      <div className="mt-6">
        {opportunities.isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No open leads."
            description={
              demoMode
                ? "Add a lead, import CSV, or Simulate website lead. Demo-seed walkthrough leads also appear here. FMCSA lookups create Prospects, not Leads."
                : "Add a lead or import CSV. Leads come from website forms, referral, CSV, or manual entry — not from FMCSA lookup or CA radar."
            }
            visual={demoMode ? undefined : "desk"}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No leads match these filters."
            description="Clear search or choose All to see the full pipeline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="h-9 pr-3 font-medium">Name / company</th>
                  <th className="h-9 pr-3 font-medium">Stage</th>
                  <th className="h-9 pr-3 font-medium">Priority</th>
                  <th className="h-9 pr-3 font-medium">Recommended next action</th>
                  <th className="h-9 pr-3 font-medium">Owner</th>
                  <th className="h-9 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border hover:bg-muted/40"
                    onClick={() => router.push(`/opportunities/${row.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/opportunities/${row.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                  >
                    <td className="h-11 max-w-[240px] pr-3">
                      <span className="block truncate font-medium">{row.carrierName}</span>
                      {row.contactName ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.contactName}
                        </span>
                      ) : null}
                    </td>
                    <td className="pr-3 text-muted-foreground">{STAGE_LABEL[row.stage]}</td>
                    <td className="pr-3 text-muted-foreground">{LEAD_PRIORITY_LABEL[row.priority]}</td>
                    <td className="max-w-[320px] truncate pr-3">{row.nextAction}</td>
                    <td className="pr-3 text-muted-foreground">{row.assignedTo?.trim() || "Unassigned"}</td>
                    <td className="text-muted-foreground">
                      <span className="block max-w-[220px] truncate">{row.lastActivityLabel}</span>
                      <span className="text-xs">{formatRelative(row.lastActivityAt)}</span>
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
