import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
import Image from "next/image";
import type { ReactNode } from "react";

export function MarketingSplitHero({
  title,
  lead,
  imageSrc,
  imageAlt,
  actions,
}: {
  title: ReactNode;
  lead?: string;
  imageSrc: string;
  imageAlt: string;
  actions?: ReactNode;
  /** @deprecated */
  eyebrow?: string;
}) {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="mkt-banner-frame">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          quality={90}
          className="object-cover object-[center_40%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/62 to-black/28"
          aria-hidden="true"
        />
        <div className="mkt-banner-copy">
          <div className="mkt-on-dark max-w-xl">
            <h1 className="mkt-title-hero">{title}</h1>
            <MarketingSectionRule tone="accent" className="mt-5" />
            {lead ? (
              <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-white md:text-[1.05rem]">
                {lead}
              </p>
            ) : null}
            {actions ? <div className="mt-8 flex flex-wrap items-center gap-5">{actions}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
