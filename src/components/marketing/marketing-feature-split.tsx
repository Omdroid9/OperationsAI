import { MarketingSectionIntro } from "@/components/marketing/marketing-section-intro";
import { MarketingSection } from "@/components/marketing/marketing-section";
import Image from "next/image";
import type { ReactNode } from "react";

export function MarketingFeatureSplit({
  title,
  lead,
  imageSrc,
  imageAlt,
  imagePosition = "right",
  children,
}: {
  title: ReactNode;
  lead?: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "left" | "right";
  children: React.ReactNode;
  /** @deprecated */
  eyebrow?: string;
}) {
  const image = (
    <div className="mkt-media relative min-h-[280px] aspect-[16/10] lg:min-h-[360px] lg:aspect-[4/3]">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover object-center"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </div>
  );

  return (
    <MarketingSection padding="default">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className={imagePosition === "left" ? "lg:order-2" : undefined}>
          <MarketingSectionIntro title={title} lead={lead} />
          {children}
        </div>
        <div className={imagePosition === "left" ? "lg:order-1" : undefined}>{image}</div>
      </div>
    </MarketingSection>
  );
}
