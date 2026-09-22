import { MarketingSplitHero } from "@/components/marketing/marketing-split-hero";
import type { ReactNode } from "react";

/** Inner-page banner — same height and overlay as the home hero. */
export function MarketingBannerHeader({
  title,
  lead,
  imageSrc,
  imageAlt,
  footer,
}: {
  title: ReactNode;
  lead?: string;
  imageSrc: string;
  imageAlt: string;
  footer?: ReactNode;
}) {
  return (
    <MarketingSplitHero
      title={title}
      lead={lead}
      imageSrc={imageSrc}
      imageAlt={imageAlt}
      actions={footer}
    />
  );
}
