import { cn } from "@/lib/utils";

export function MarketingTitle({
  as: Tag = "h2",
  size = "section",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  size?: "hero" | "page" | "section" | "card";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        size === "hero" && "mkt-title-hero",
        size === "page" && "mkt-title-page",
        size === "section" && "mkt-title-section",
        size === "card" && "mkt-title-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
