import { MarketingLead } from "@/components/marketing/marketing-lead";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
import { MarketingTitle } from "@/components/marketing/marketing-title";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MarketingSectionIntro({
  title,
  lead,
  className,
  titleSize = "section",
  showRule = true,
}: {
  title: ReactNode;
  lead?: string;
  className?: string;
  titleSize?: "section" | "page";
  showRule?: boolean;
  /** @deprecated Kickers removed — ignored */
  eyebrow?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <MarketingTitle as="h2" size={titleSize === "page" ? "page" : "section"}>
        {title}
      </MarketingTitle>
      {showRule ? <MarketingSectionRule /> : null}
      {lead ? <MarketingLead className="mt-5">{lead}</MarketingLead> : null}
    </div>
  );
}
