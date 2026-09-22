import { cn } from "@/lib/utils";

export function MarketingEyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("mkt-eyebrow", className)}>{children}</p>;
}
