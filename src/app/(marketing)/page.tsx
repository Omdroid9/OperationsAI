import {
  MarketingAccordion,
  MarketingPrimaryButton,
  MarketingProductHero,
  MarketingScreens,
  MarketingUseCase,
} from "@/components/marketing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkyOS — staff workspace for a trucking compliance agency",
  description:
    "Staff workspace for a trucking compliance agency. Carriers never log in. Intake, voice qualification, CRM, Docket cases, and RegLens monitoring, with human review.",
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
  return (
    <>
      <MarketingProductHero />

      <MarketingUseCase />

      <MarketingScreens />

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
            <h2 className="mkt-title-section">Run the demo loop</h2>
            <p className="mt-4 font-sans text-base leading-relaxed text-[var(--mkt-on-dark-muted)]">
              Seeded data covers every step, from first review to regulation follow-up.
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
