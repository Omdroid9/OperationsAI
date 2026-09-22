import { cn } from "@/lib/utils";

type MarketingSectionRuleProps = {
  className?: string;
  /** brand (default) | accent (on brand fields) | soft (on dark non-brand) */
  tone?: "brand" | "accent" | "soft";
};

/** Short hairline under titles — matches Huckleberry SectionRule. */
export function MarketingSectionRule({
  className = "",
  tone = "brand",
}: MarketingSectionRuleProps) {
  const toneClass =
    tone === "accent"
      ? "mkt-rule-accent"
      : tone === "soft"
        ? "mkt-rule-soft"
        : "mkt-rule-brand";

  return (
    <span
      className={cn(toneClass, "mt-5 block", className)}
      aria-hidden="true"
    />
  );
}
