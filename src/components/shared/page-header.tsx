import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  meta,
  badge,
  actions,
  className,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-medium tracking-tight text-foreground">{title}</h1>
          {badge}
        </div>
        {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
