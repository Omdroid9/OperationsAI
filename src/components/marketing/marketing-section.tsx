import { cn } from "@/lib/utils";
import { MarketingContainer } from "@/components/marketing/marketing-container";

export function MarketingSection({
  variant = "default",
  padding = "default",
  container = true,
  className,
  containerClassName,
  children,
}: {
  variant?: "default" | "surface" | "accent" | "hero" | "canvas";
  padding?: "none" | "compact" | "default" | "hero";
  container?: boolean;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  const inner = container ? (
    <MarketingContainer className={containerClassName}>{children}</MarketingContainer>
  ) : (
    children
  );

  return (
    <section
      className={cn(
        padding === "default" && "py-16 md:py-24",
        padding === "compact" && "py-[var(--mkt-section-y-compact)] md:py-14",
        padding === "hero" && "py-[var(--mkt-section-y-hero)] lg:py-[var(--mkt-section-y-hero-lg)]",
        variant === "surface" && "border-y border-[var(--mkt-border)] bg-[var(--mkt-snow)]",
        variant === "accent" && "bg-[var(--mkt-sand)]",
        variant === "canvas" && "bg-[var(--mkt-canvas)]",
        variant === "hero" && "",
        className,
      )}
    >
      {inner}
    </section>
  );
}
