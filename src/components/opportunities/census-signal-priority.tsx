import { outreachReadinessLabel } from "@/lib/prospects/outreach-readiness";
import type { Opportunity, OutreachReadiness } from "@/types";
import { cn } from "@/lib/utils";

function readinessTone(readiness: OutreachReadiness): string {
  if (readiness === "ready_to_review") return "text-success";
  if (readiness === "needs_review") return "text-amber-800 dark:text-amber-200";
  return "text-muted-foreground";
}

export function CensusSignalPriority({ opportunity }: { opportunity: Opportunity }) {
  if (opportunity.discoveryScore == null || !opportunity.outreachReadiness) return null;

  return (
    <div className="mt-4 max-w-2xl border-l-2 border-foreground px-4 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        SkySignal priority
      </p>
      <p className={cn("mt-1 text-sm font-medium", readinessTone(opportunity.outreachReadiness))}>
        <span className="tabular text-foreground">{opportunity.discoveryScore}</span>
        <span className="text-muted-foreground"> · </span>
        {outreachReadinessLabel(opportunity.outreachReadiness)}
      </p>
      {opportunity.reasonSummary ? (
        <p className="mt-1 text-sm text-muted-foreground">{opportunity.reasonSummary}</p>
      ) : null}
    </div>
  );
}
