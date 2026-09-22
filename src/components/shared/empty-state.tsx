import { EmptyState as AstryxEmptyState } from "@astryxdesign/core/EmptyState";
import Image from "next/image";

const VISUALS = {
  desk: {
    src: "/workspace/empty-desk.webp",
    alt: "Quiet operations desk with folders and a closed laptop",
  },
  ops: {
    src: "/workspace/ops-still.webp",
    alt: "Compliance workspace still life",
  },
} as const;

export function EmptyState({
  title,
  description,
  action,
  visual,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  visual?: keyof typeof VISUALS;
}) {
  const image = visual ? VISUALS[visual] : null;

  return (
    <AstryxEmptyState
      title={title}
      description={description}
      headingLevel={2}
      icon={
        image ? (
          <span className="relative mb-1 block aspect-[16/7] w-full max-w-md overflow-hidden rounded-[8px]">
            <Image src={image.src} alt={image.alt} fill className="object-cover object-center" sizes="28rem" />
          </span>
        ) : undefined
      }
      actions={action}
    />
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-10 items-center gap-4">
          <div className="h-3 w-40 animate-pulse rounded-sm bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-muted" />
          <div className="ml-auto h-3 w-12 animate-pulse rounded-sm bg-muted" />
        </div>
      ))}
    </div>
  );
}
