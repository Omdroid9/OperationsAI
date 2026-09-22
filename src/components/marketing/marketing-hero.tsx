"use client";

import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP);

export function MarketingHero({
  imageSrc,
  imageAlt,
  title,
  lead,
  brand,
  children,
  secondaryHref,
  secondaryLabel,
}: {
  imageSrc: string;
  imageAlt: string;
  title: ReactNode;
  lead: string;
  /** Product name shown above the headline (brand-first product pages). */
  brand?: string;
  children?: ReactNode;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const copy = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(":scope > *", {
        opacity: 0,
        y: 8,
        duration: 0.65,
        stagger: 0.05,
        ease: "power2.out",
      });
    },
    { scope: copy },
  );

  return (
    <section className="relative w-full overflow-hidden">
      <div className="mkt-banner-frame">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          quality={75}
          className="object-cover object-[center_40%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/62 to-black/28"
          aria-hidden="true"
        />
        <div className="mkt-banner-copy">
          <div ref={copy} className="mkt-on-dark max-w-xl">
            {brand ? (
              <p className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.5vw,2.5rem)] tracking-tight text-white">
                {brand}
              </p>
            ) : null}
            <h1 className={`mkt-title-hero ${brand ? "mt-2 text-[clamp(1.65rem,3.2vw,2.35rem)] font-normal text-white/95" : ""}`}>
              {title}
            </h1>
            <MarketingSectionRule tone="accent" className="mt-5" />
            <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-white md:text-[1.05rem]">
              {lead}
            </p>
            {children || secondaryHref ? (
              <div className="mt-8 flex flex-wrap items-center gap-5">
                {children}
                {secondaryHref && secondaryLabel ? (
                  <Link
                    href={secondaryHref}
                    className="border-b border-white/70 pb-0.5 font-sans text-sm text-white hover:border-white"
                  >
                    {secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
