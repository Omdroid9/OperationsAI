"use client";

import { MarketingPrimaryButton } from "@/components/marketing/marketing-button";
import { MarketingProductShot } from "@/components/marketing/marketing-product-shot";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export function MarketingProductHero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-hero-anim]", {
        y: 8,
        duration: 0.5,
        stagger: 0.08,
        ease: "expo.out",
        clearProps: "transform",
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="border-b border-[var(--mkt-border)] bg-[var(--mkt-canvas)]"
      aria-labelledby="hero-title"
    >
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] items-end gap-10 px-6 pt-28 md:grid-cols-12 md:gap-12 md:px-8 md:pt-32">
        <div data-hero-anim className="md:col-span-7">
          <h1 id="hero-title" className="mkt-title-hero text-[var(--mkt-ink)]">
            Staff workspace for a trucking compliance agency
          </h1>
          <p className="mt-5 max-w-[42ch] font-sans text-lg leading-relaxed text-[var(--mkt-ink-muted)]">
            Carriers never log in. Staff take inbound work from review to an open service case.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <MarketingPrimaryButton href="/access">Access product</MarketingPrimaryButton>
            <Link href="#product" className="mkt-text-link">
              See the product
            </Link>
          </div>
        </div>
        <div data-hero-anim className="md:col-span-5">
          <MarketingProductShot
            src="/marketing/ops-compliance-desk.webp"
            alt="A compliance desk with files, a laptop, and a truck outside the window"
            aspectClassName="aspect-[4/3]"
            objectFit="cover"
            sizes="(max-width: 768px) 100vw, 28rem"
            priority
          />
        </div>
      </div>

      <div data-hero-anim className="mx-auto mt-12 max-w-[88rem] px-4 pb-12 sm:px-6 md:mt-16 md:px-8">
        <MarketingProductShot
          src="/marketing/product-shots/17-overview-v3.png"
          alt="SkyOS Overview listing inbound leads and cases that need staff attention today"
          title="Overview"
          caption="What staff open: inbound work on the left, open cases on the right."
          priority
          className="shadow-[0_18px_48px_-24px_rgba(28,25,23,0.28)]"
        />
      </div>
    </section>
  );
}
