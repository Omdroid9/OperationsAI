import { cn } from "@/lib/utils";
import { WORKFLOW_STEPS, type WorkflowStepId } from "@/lib/workflow";
import Link from "next/link";

export function WorkflowLane({
  current,
  compact = false,
}: {
  current?: WorkflowStepId;
  compact?: boolean;
}) {
  return (
    <ol className={cn("grid gap-px overflow-hidden rounded-[8px] border border-border bg-border", compact ? "grid-cols-5" : "grid-cols-1 sm:grid-cols-5")}>
      {WORKFLOW_STEPS.map((step) => {
        const active = current === step.id;
        return (
          <li key={step.id} className="bg-card">
            <Link
              href={step.href}
              className={cn(
                "flex h-full flex-col gap-1 px-3 py-2.5 transition-colors duration-150",
                active ? "bg-foreground text-background" : "hover:bg-muted/80",
              )}
            >
              <span className={cn("font-mono text-[10px] tracking-wide", active ? "text-background/70" : "text-muted-foreground")}>
                {step.n}
              </span>
              <span className="text-[13px] font-medium">{step.label}</span>
              {compact ? null : (
                <span className={cn("text-[11px] leading-4", active ? "text-background/75" : "text-muted-foreground")}>
                  {step.job}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
