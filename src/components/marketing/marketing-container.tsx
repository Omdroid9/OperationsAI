import { cn } from "@/lib/utils";

export function MarketingContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[var(--mkt-content-max)] px-6 md:px-8", className)}>
      {children}
    </div>
  );
}
