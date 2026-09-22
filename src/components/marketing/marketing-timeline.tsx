import { SkyosStepIcon } from "@/components/marketing/skyos-step-icons";
import { cn } from "@/lib/utils";

export type MarketingTimelineStep = {
  icon: Parameters<typeof SkyosStepIcon>[0]["name"];
  title: string;
  body: string;
};

export function MarketingTimeline({
  steps,
  className,
}: {
  steps: readonly MarketingTimelineStep[];
  className?: string;
}) {
  return (
    <ol className={cn("mkt-stagger relative max-w-2xl", className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 pb-10 last:pb-0">
          <div className="relative flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] text-[var(--mkt-accent)]">
              <SkyosStepIcon name={step.icon} />
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-8 bottom-0 w-px bg-[var(--mkt-border)]"
              />
            ) : null}
          </div>
          <div className="pt-0.5">
            <p className="font-mono text-[11px] text-[var(--mkt-muted)]">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-[var(--mkt-fg)]">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--mkt-muted)]">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
