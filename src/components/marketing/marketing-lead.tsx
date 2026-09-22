import { cn } from "@/lib/utils";

export function MarketingLead({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("mkt-lead", className)}>{children}</p>;
}
