import {
  MarketingAccordion,
  MarketingEvidence,
  MarketingLoop,
  MarketingPrimaryButton,
  MarketingProductHero,
  MarketingProductShot,
  MarketingSafeguards,
  MarketingSpecimen,
} from "@/components/marketing";
import { getLandingSpecimen } from "@/lib/marketing/specimen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkyOS — run a trucking compliance desk from one workspace",
  description:
    "Staff workspace for a trucking compliance agency: leads, qualification calls, Docket cases and regulation watch. Extracted values show their source and staff approve before anything reaches a case.",
};

const FAQ = [
  {
    id: "who",
    question: "Who is SkyOS for?",
    answer:
      "Staff at a trucking compliance agency — the shop that helps carriers with authority, filings, renewals, and documents. Carriers never log in.",
  },
  {
    id: "data",
    question: "Does public FMCSA data prove a carrier needs a service?",
    answer:
      "No. Public operating data suggests possible relevance for review. It does not prove purchasing intent, noncompliance, or that a service is required.",
  },
  {
    id: "demo",
    question: "Can I try it without API keys?",
    answer:
      "Yes. Demo mode runs the full loop on seeded data. Live providers are optional.",
  },
  {
    id: "affiliation",
    question: "Is SkyOS affiliated with FMCSA?",
    answer:
      "No. SkyOS is an independent product. It is not affiliated with FMCSA and does not guarantee regulatory outcomes.",
  },
] as const;

export default function MarketingHomePage() {
  const specimen = getLandingSpecimen();
  return (
    <>
      <MarketingProductHero
        specimen={specimen ? <MarketingSpecimen specimen={specimen} /> : undefined}
      />

      <MarketingLoop />

      <MarketingSafeguards />

      <MarketingEvidence />

      <section
        id="use-case"
        className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-canvas)]"
        aria-labelledby="use-case-title"
      >
        <div className="mx-auto grid max-w-[var(--mkt-content-max)] items-center gap-10 px-6 py-20 md:grid-cols-12 md:px-8 md:py-28">
          <div className="md:col-span-5">
            <h2 id="use-case-title" className="mkt-title-section text-[var(--mkt-ink)]">
              Built for the agency, not the carrier
            </h2>
            <p className="mt-4 font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
              SkyOS is for the shop that handles authority, filings, renewals and driver documents
              on behalf of carriers. Staff sign in. Carriers never do. It works alongside the
              judgment of the people doing the filing and does not replace it.
            </p>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <MarketingProductShot
              src="/marketing/ops-compliance-desk.webp"
              alt="A compliance desk with files, a laptop, and a truck outside the window"
              aspectClassName="aspect-[16/10]"
              objectFit="cover"
              sizes="(max-width: 768px) 100vw, 36rem"
            />
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-24 border-t border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
        aria-labelledby="faq-title"
      >
        <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-10 px-6 py-20 md:grid-cols-12 md:px-8 md:py-28">
          <h2
            id="faq-title"
            className="text-[clamp(1.75rem,3vw,2.5rem)] text-[var(--mkt-ink)] md:col-span-4"
          >
            Questions
          </h2>
          <div className="md:col-span-7 md:col-start-6">
            <MarketingAccordion items={FAQ} />
          </div>
        </div>
      </section>

      <section id="cta" className="mkt-on-dark scroll-mt-24 bg-[var(--mkt-brand)]">
        <div className="mx-auto flex max-w-[var(--mkt-content-max)] flex-col gap-8 px-6 py-16 md:flex-row md:items-end md:justify-between md:px-8 md:py-20">
          <div className="max-w-xl">
            <h2 className="mkt-title-section">Walk the whole loop on demo data</h2>
            <p className="mt-4 font-sans text-base leading-relaxed text-[var(--mkt-on-dark-muted)]">
              The demo workspace covers every step, from a new lead to a regulation follow-up. No
              API keys are needed.
            </p>
          </div>
          <MarketingPrimaryButton href="/access" variant="on-dark">
            Access product
          </MarketingPrimaryButton>
        </div>
      </section>
    </>
  );
}
