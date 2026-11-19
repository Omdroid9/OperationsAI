"use client";

import type { ImpactRunView, ImpactStepStatus } from "@/lib/regulations/impact-run";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<ImpactStepStatus, string> = {
  done: "Done",
  waiting_on_staff: "Waiting on you",
  pending: "Not yet",
  blocked: "Blocked",
};

/** The route from notice to case tasks, showing which steps ran on their own and which need staff. */
export function ImpactRunPanel({ view }: { view: ImpactRunView }) {
  return (
    <section className="mt-8 max-w-2xl" aria-labelledby="impact-run-title">
      <h2 id="impact-run-title" className="text-sm font-medium">
        Steps to case tasks
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The first four steps run on their own. The last three are yours; no case task is created
        before approval.
      </p>
      <ol className="mt-3 divide-y divide-border border-y border-border">
        {view.steps.map((step, index) => (
          <li key={step.id} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-x-3 py-2.5">
            <span className="font-mono text-xs tabular text-muted-foreground">{index + 1}</span>
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                {step.label}
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {step.automated ? "Automatic" : "Staff"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
            </div>
            <span
              className={cn(
                "text-xs",
                step.status === "done" && "text-success",
                step.status === "waiting_on_staff" && "font-medium text-warning",
                step.status === "pending" && "text-muted-foreground",
                step.status === "blocked" && "font-medium text-destructive",
              )}
            >
              {STATUS_TEXT[step.status]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
