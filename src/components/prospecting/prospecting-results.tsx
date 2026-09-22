"use client";

import { Button } from "@/components/ui/button";
import type { DiscoveredProspect, OutreachReadiness } from "@/lib/prospecting/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

function readinessTone(readiness: OutreachReadiness): string {
  if (readiness === "ready_to_review") return "text-success";
  if (readiness === "needs_review") return "text-amber-800 dark:text-amber-200";
  return "text-muted-foreground";
}

function formatAddDate(value: string | null): string {
  if (!value || !/^\d{8}$/.test(value)) return "—";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function ProspectingResultsTable({
  prospects,
  savingUsdot,
  onSave,
}: {
  prospects: DiscoveredProspect[];
  savingUsdot: string | null;
  onSave: (prospect: DiscoveredProspect) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (prospects.length === 0) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        No carriers matched these filters in the returned Census page.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {prospects.map((prospect) => {
        const open = expanded === prospect.usdot;
        return (
          <div key={prospect.usdot} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left"
                    onClick={() => setExpanded(open ? null : prospect.usdot)}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">{prospect.legalName}</span>
                  </button>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {prospect.usdot}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {prospect.city}, {prospect.state}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{prospect.reviewReason}</p>
                <p className={cn("mt-1 text-sm", readinessTone(prospect.outreachReadiness))}>
                  {prospect.outreachReason}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums">{prospect.powerUnits} trucks</p>
                  <p>Registered {formatAddDate(prospect.addDate)}</p>
                </div>
                {prospect.alreadyInWorkspace ? (
                  <span className="text-xs text-muted-foreground">
                    In workspace{prospect.duplicateLabel ? ` · ${prospect.duplicateLabel}` : ""}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onSave(prospect)}
                    disabled={savingUsdot === prospect.usdot}
                  >
                    {savingUsdot === prospect.usdot ? "Saving…" : "Save as Prospect"}
                  </Button>
                )}
              </div>
            </div>
            {open ? (
              <dl className="mt-3 grid max-w-3xl gap-x-6 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
                <Field label="Legal name" value={prospect.legalName} source="legal_name" />
                <Field label="DBA" value={prospect.dbaName ?? "—"} source="dba_name" />
                <Field label="USDOT" value={prospect.usdot} source="dot_number" />
                <Field label="Power units" value={String(prospect.powerUnits)} source="power_units" />
                <Field label="Drivers" value={String(prospect.drivers)} source="total_drivers" />
                <Field label="Registered" value={formatAddDate(prospect.addDate)} source="add_date" />
                <Field label="MCS-150 date" value={prospect.mcs150Date ?? "—"} source="mcs150_date" />
                <Field label="Operation" value={prospect.carrierOperation ?? "—"} source="carrier_operation" />
                <Field label="Classification" value={prospect.classdef ?? "—"} source="classdef" />
                <Field label="Phone" value={prospect.phone ?? "—"} source="phone" />
                <Field label="Email" value={prospect.email ?? "—"} source="email_address" />
                <Field label="Officer" value={prospect.officer ?? "—"} source="company_officer_1" />
                <Field label="Suggested service" value={prospect.suggestedService} source="derived" />
                <Field label="Dataset" value="Company Census File (az4n-8mr2)" source="dataset" />
                <Field label="Queried" value={new Date(prospect.queriedAt).toLocaleString()} source="query" />
              </dl>
            ) : null}
            {open && prospect.scoreLines.length > 0 ? (
              <div className="mt-3 max-w-3xl border-t border-border pt-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Ranking signals
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {prospect.scoreLines.map((line) => (
                    <li key={line.key}>
                      +{line.points} · {line.label}{" "}
                      <span className="text-[11px]">({line.field} · FMCSA Census)</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: string;
}) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">
        {label} <span className="text-border">· {source}</span>
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
