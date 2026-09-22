"use client";

import { AddLeadDialog } from "@/components/crm/add-lead-dialog";
import { ErrorState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/hooks/use-demo-mode";
import {
  useAttentionItems,
  useCarriers,
  useCases,
  useOpportunities,
} from "@/hooks/use-skyos";
import type { AttentionCategory, AttentionItem, AttentionLane, AttentionTone } from "@/lib/attention";
import { partitionAttention } from "@/lib/attention";
import { DEMO_TODAY, formatDate } from "@/lib/format";
import { creationSourceLabel } from "@/lib/leads/creation";
import { cn } from "@/lib/utils";
import type { Carrier, Opportunity, ServiceCase } from "@/types";
import Link from "next/link";
import { useState } from "react";

const URGENCY_LABEL: Record<AttentionTone, string> = {
  danger: "Urgent",
  warning: "Due",
  info: "Review",
};

const toneDot: Record<AttentionTone, string> = {
  danger: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

const LANE_COPY: Record<
  AttentionLane,
  { title: string; empty: string; href?: string; hrefLabel?: string }
> = {
  inbound: {
    title: "Inbound",
    empty: "Website forms, Meta ads, CSV, and manual leads land here.",
    href: "/crm",
    hrefLabel: "Open CRM",
  },
  work: {
    title: "Work",
    empty: "Follow-ups, consultations, documents, and regulations show here.",
  },
  discovery: {
    title: "Discoveries",
    empty: "Saved FMCSA and Census prospects that still need review show here.",
    href: "/opportunities",
    hrefLabel: "Open Saved Prospects",
  },
};

const DISCOVERY_PREVIEW = 5;

function nextActionForCategory(category: AttentionCategory, opportunity?: Opportunity): string {
  if (opportunity?.nextAction) return opportunity.nextAction;
  switch (category) {
    case "opportunity":
      return "Review opportunity";
    case "follow_up":
      return "Follow up";
    case "document_review":
      return "Confirm document";
    case "document_expiring":
      return "Review expiration";
    case "regulation":
      return "Analyze regulation";
    case "consultation":
      return "Schedule consultation";
    case "service_approval":
      return "Approve service";
    case "task":
      return "Complete task";
    default:
      return "Open";
  }
}

function resolveOpportunityId(href: string): string | null {
  const match = href.match(/^\/opportunities\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function resolveCaseId(href: string): string | null {
  const match = href.match(/^\/docket\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function presentRow(
  item: AttentionItem,
  opportunities: Opportunity[],
  carriers: Carrier[],
  cases: ServiceCase[],
): {
  company: string;
  contact: string | null;
  source: string | null;
  reason: string;
  nextAction: string;
  listLabel: string | null;
} {
  const opportunityId = resolveOpportunityId(item.href);
  const opportunity = opportunityId
    ? opportunities.find((entry) => entry.id === opportunityId)
    : undefined;
  const caseId = resolveCaseId(item.href);
  const serviceCase = caseId ? cases.find((entry) => entry.id === caseId) : undefined;
  const carrierId = opportunity?.carrierId ?? serviceCase?.carrierId;
  const carrier = carrierId ? carriers.find((entry) => entry.id === carrierId) : undefined;

  const company =
    carrier?.legalName ??
    (item.category === "regulation" ? item.detail : null) ??
    item.title.replace(/\s+needs review$/i, "").replace(/^Follow-up due ·\s*/i, "") ??
    "Record";

  const listLabel =
    opportunity?.recordKind === "lead"
      ? "CRM"
      : opportunity?.recordKind === "prospect"
        ? "Saved Prospects"
        : null;

  return {
    company,
    contact: opportunity?.contactName ?? null,
    source: opportunity ? creationSourceLabel(opportunity.creation.sourceType) : null,
    reason: item.detail || item.title,
    nextAction: nextActionForCategory(item.category, opportunity),
    listLabel,
  };
}

function CountBar({
  inbound,
  work,
  discovery,
}: {
  inbound: number;
  work: number;
  discovery: number;
}) {
  const total = inbound + work + discovery;
  const segments = [
    { key: "inbound", count: inbound, className: "bg-info", label: "Inbound" },
    { key: "work", count: work, className: "bg-warning", label: "Work" },
    { key: "discovery", count: discovery, className: "bg-muted-foreground/40", label: "Discoveries" },
  ] as const;

  return (
    <div className="mt-5">
      <div className="grid grid-cols-3 gap-4">
        {segments.map((segment) => (
          <div key={segment.key}>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {segment.label}
            </p>
            <p className="mt-0.5 text-[22px] font-medium tabular tracking-tight">{segment.count}</p>
          </div>
        ))}
      </div>
      <div
        className="mt-3 flex h-1.5 overflow-hidden rounded-[3px] bg-muted"
        role="img"
        aria-label={
          total === 0
            ? "No items in inbound, work, or discoveries"
            : `Inbound ${inbound}, work ${work}, discoveries ${discovery}`
        }
      >
        {total === 0 ? (
          <span className="h-full w-full bg-muted" />
        ) : (
          segments.map((segment) =>
            segment.count > 0 ? (
              <span
                key={segment.key}
                className={cn("h-full min-w-0", segment.className)}
                style={{ flexGrow: segment.count }}
                title={`${segment.label} ${segment.count}`}
              />
            ) : null,
          )
        )}
      </div>
    </div>
  );
}

function AttentionList({
  items,
  opportunities,
  carriers,
  cases,
  showSource,
}: {
  items: AttentionItem[];
  opportunities: Opportunity[];
  carriers: Carrier[];
  cases: ServiceCase[];
  showSource?: boolean;
}) {
  return (
    <ul className="divide-y divide-border border-t border-border">
      {items.map((item) => {
        const presented = presentRow(item, opportunities, carriers, cases);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="block py-3 hover:bg-muted/40"
            >
              <p className="text-sm font-medium text-foreground">{presented.company}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {showSource && presented.source ? `${presented.source} · ${presented.reason}` : presented.reason}
              </p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[item.tone])} aria-hidden />
                <span>{URGENCY_LABEL[item.tone]}</span>
                <span aria-hidden>·</span>
                <span>{presented.nextAction}</span>
                {presented.listLabel ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{presented.listLabel}</span>
                  </>
                ) : null}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function OverviewPage() {
  const { demoMode, ready } = useDemoMode();
  const attention = useAttentionItems();
  const opportunities = useOpportunities();
  const carriers = useCarriers();
  const cases = useCases();
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "csv">("manual");

  const items = attention.data ?? [];
  const lanes = partitionAttention(items);
  const opps = opportunities.data ?? [];
  const carrierList = carriers.data ?? [];
  const caseList = cases.data ?? [];
  const discoveryPreview = lanes.discovery.slice(0, DISCOVERY_PREVIEW);
  const discoveryHidden = Math.max(0, lanes.discovery.length - DISCOVERY_PREVIEW);

  if (!ready || attention.isLoading || opportunities.isLoading) {
    return (
      <PageBody>
        <TableSkeleton rows={6} />
      </PageBody>
    );
  }

  if (attention.isError) {
    return (
      <PageBody>
        <ErrorState
          title="Attention queue could not be loaded."
          description={
            demoMode
              ? "Demo records are still available after reset."
              : "Try again. Live Mode only shows records from your workspace."
          }
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Today · {formatDate(DEMO_TODAY.toISOString())}
        </p>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight">Needs attention</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inbound leads from forms and ads stay separate from FMCSA discoveries. Public Census data
          is a signal to review—not a request for service.
        </p>
      </div>

      <CountBar
        inbound={lanes.inbound.length}
        work={lanes.work.length}
        discovery={lanes.discovery.length}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-3 lg:gap-8">
        {(["inbound", "work", "discovery"] as const).map((lane) => {
          const list =
            lane === "discovery" ? discoveryPreview : lanes[lane];
          const copy = LANE_COPY[lane];
          return (
            <section key={lane} aria-labelledby={`lane-${lane}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`lane-${lane}`} className="text-sm font-medium tracking-tight">
                  {copy.title}
                </h2>
                <p className="tabular text-sm text-muted-foreground">{lanes[lane].length}</p>
              </div>
              {list.length === 0 ? (
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                  {copy.empty}
                </p>
              ) : (
                <AttentionList
                  items={list}
                  opportunities={opps}
                  carriers={carrierList}
                  cases={caseList}
                  showSource={lane !== "work"}
                />
              )}
              {lane === "inbound" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setAddMode("manual");
                      setAddOpen(true);
                    }}
                  >
                    Add lead
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddMode("csv");
                      setAddOpen(true);
                    }}
                  >
                    Import CSV
                  </Button>
                  {lanes.inbound.length > 0 && copy.href ? (
                    <Link href={copy.href} className="text-sm font-medium text-foreground hover:underline">
                      {copy.hrefLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {lane === "discovery" && lanes.discovery.length > 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {discoveryHidden > 0
                    ? `${discoveryHidden} more in Saved Prospects. `
                    : null}
                  <Link href="/opportunities" className="font-medium text-foreground hover:underline">
                    {copy.hrefLabel}
                  </Link>
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} initialMode={addMode} />
    </PageBody>
  );
}
