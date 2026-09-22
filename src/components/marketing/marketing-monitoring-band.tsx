import { MarketingButton } from "@/components/marketing/marketing-button";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
import Image from "next/image";
import Link from "next/link";

export function MarketingMonitoringBand() {
  return (
    <section className="relative bg-[var(--mkt-brand)]">
      <div className="grid lg:min-h-[min(70vh,620px)] lg:grid-cols-12">
        <figure className="relative min-h-[300px] lg:col-span-7 lg:min-h-full">
          <Image
            src="/marketing/monitoring-signal.webp"
            alt="Abstract map showing compliance monitoring signals along a transport corridor"
            fill
            className="mkt-photo-neutral object-cover object-[center_42%]"
            sizes="(max-width: 1024px) 100vw, 58vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/25 lg:to-black/40"
            aria-hidden="true"
          />
        </figure>

        <div className="mkt-on-dark flex flex-col justify-center px-6 py-14 md:px-12 lg:col-span-5 lg:px-14 lg:py-20 xl:px-16">
          <p className="font-sans text-sm text-[var(--mkt-on-dark-faint)]">SkyOS monitoring</p>
          <h2 className="mt-5 mkt-title-section text-[clamp(1.85rem,3vw,2.75rem)] leading-[1.12]">
            Focus on what may need review
          </h2>
          <MarketingSectionRule tone="accent" className="mt-5" />
          <p className="mt-6 font-sans text-base leading-relaxed text-[var(--mkt-on-dark-muted)] md:text-lg">
            Renewal calendars and regulation matches help staff prioritize follow-up. Public data
            suggests possible relevance—it does not prove noncompliance or purchasing intent.
          </p>
          <p className="mt-5 max-w-md font-sans text-sm leading-relaxed text-[var(--mkt-on-dark-faint)] md:text-base">
            SkyOS connects intake through ongoing monitoring so specialists see company context,
            service cases, and attention items in one workspace.
          </p>
          <div className="mt-10 flex flex-col items-start gap-5">
            <MarketingButton href="#reglens" variant="on-dark">
              RegLens features
            </MarketingButton>
            <Link href="#modules" className="mkt-text-link-on-dark">
              All features
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
