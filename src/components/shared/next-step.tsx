import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export function NextStepPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <aside className="border-l-2 border-foreground bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Do this next
      </p>
      <h2 className="mt-1 text-[15px] font-medium tracking-tight">{title}</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-3 flex items-center gap-2">{action}</div> : null}
    </aside>
  );
}

export function StartHere({
  href,
  kicker,
  title,
  body,
  actionLabel,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border border-border bg-card px-4 py-3">
      <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-[6px] sm:block">
        <Image
          src="/workspace/ops-still.webp"
          alt=""
          fill
          className="object-cover object-center"
          sizes="96px"
        />
      </div>
      <div className="min-w-0 max-w-xl flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{kicker}</p>
        <p className="mt-1 text-[15px] font-medium tracking-tight">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <Button nativeButton={false} render={<Link href={href} />}>
        {actionLabel}
      </Button>
    </div>
  );
}
