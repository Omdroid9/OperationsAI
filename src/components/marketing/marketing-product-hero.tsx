"use client";

import { MarketingPrimaryButton } from "@/components/marketing/marketing-button";
import { MarketingProductShot } from "@/components/marketing/marketing-product-shot";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
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
        opacity: 0,
        y: 10,
        duration: 0.55,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-b border-[var(--mkt-border)] bg-[var(--mkt-canvas)]"
      aria-label="Product introduction"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(28,25,23,0.06),transparent_55%),radial-gradient(ellipse_at_90%_10%,rgba(28,25,23,0.04),transparent_45%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[var(--mkt-content-max)] px-6 pt-28 md:px-8 md:pt-32">
        <p
          data-hero-anim
          className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,5vw,3.5rem)] tracking-tight text-[var(--mkt-ink)]"
        >
          SkyOS
        </p>
        <h1
          data-hero-anim
          className="mt-3 max-w-2xl font-sans text-[clamp(1.35rem,2.8vw,1.85rem)] font-medium leading-snug tracking-tight text-[var(--mkt-ink-muted)]"
        >
          From inbound lead to compliance case—in one staff product.
        </h1>
        <div data-hero-anim>
          <MarketingSectionRule tone="brand" className="mt-5" />
        </div>
        <p
          data-hero-anim
          className="mt-6 max-w-xl font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)] md:text-[1.05rem]"
        >
          Prospecting, CRM, voice qualification, Docket, and RegLens. Scores you can explain. Staff
          review before anything counts as done.
        </p>
        <div data-hero-anim className="mt-8 flex flex-wrap items-center gap-5">
          <MarketingPrimaryButton href="/access">Access product</MarketingPrimaryButton>
          <Link href="#product" className="mkt-text-link">
            See product screens
          </Link>
        </div>
      </div>

      <div data-hero-anim className="relative mx-auto mt-12 max-w-[88rem] px-4 pb-10 sm:px-6 md:mt-16 md:px-8">
        <MarketingProductShot
          src="/marketing/product-shots/02-opportunities.png"
          alt="SkyOS Overview needs-attention board"
          pathLabel="skyos.app / overview"
          aspectClassName="aspect-[16/9] md:aspect-[21/10]"
          priority
          className="rounded-b-[10px] shadow-[0_24px_60px_-28px_rgba(28,25,23,0.35)]"
        />
      </div>
    </section>
  );
}
