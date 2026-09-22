import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
import Link from "next/link";
import type { ReactNode } from "react";

export function MarketingIntroSplit({
  headline,
  children,
  linkHref,
  linkLabel,
  id = "work",
}: {
  headline: ReactNode;
  children: ReactNode;
  linkHref?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 bg-[var(--mkt-snow)]">
      <div className="mx-auto max-w-[var(--mkt-content-max)] px-6 py-16 md:px-8 md:py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-[family-name:var(--font-display)] text-3xl leading-snug text-[var(--mkt-ink)] md:text-[2.35rem] text-balance">
              {headline}
            </p>
            <MarketingSectionRule />
          </div>
          <div className="space-y-5 md:col-span-7 md:col-start-6">
            {children}
            {linkHref && linkLabel ? (
              <p className="pt-2 font-sans text-sm text-[var(--mkt-ink-muted)]">
                <Link href={linkHref} className="mkt-text-link">
                  {linkLabel}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
