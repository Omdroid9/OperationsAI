"use client";

import { MarketingPrimaryButton } from "@/components/marketing/marketing-button";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP);

export function MarketingProductHero({ specimen }: { specimen?: ReactNode }) {
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
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] items-center gap-12 px-6 pb-20 pt-28 md:grid-cols-12 md:gap-10 md:px-8 md:pb-28 md:pt-36">
        <div data-hero-anim className="md:col-span-6">
          <h1 id="hero-title" className="mkt-title-hero text-[var(--mkt-ink)]">
            Run a trucking compliance desk from one workspace
          </h1>
          <p className="mt-6 max-w-[46ch] font-sans text-lg leading-relaxed text-[var(--mkt-ink-muted)]">
            Leads, qualification calls, service cases and regulation watch, built for the staff
            who do the work. Every extracted value shows its source, and nothing lands on a
            carrier’s case until a person approves it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <MarketingPrimaryButton href="/access">Access product</MarketingPrimaryButton>
            <Link href="#loop" className="mkt-text-link">
              See how it works
            </Link>
          </div>
        </div>
        {specimen ? (
          <div data-hero-anim className="md:col-span-6 lg:col-span-5 lg:col-start-8">
            {specimen}
          </div>
        ) : null}
      </div>
    </section>
  );
}
