import {
  MarketingAccordion,
  MarketingIntroSplit,
  MarketingMonitoringBand,
  MarketingPrimaryButton,
  MarketingProductHero,
  MarketingProductPreview,
  MarketingProofStrip,
  MarketingSectionRule,
  MarketingUnderTheHood,
  MarketingVoiceSection,
} from "@/components/marketing";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SkyOS — operations workspace for compliance teams",
  description:
    "Staff product for trucking compliance: prospecting, CRM, voice qualification, Docket cases, and RegLens—with explainable scores and human review.",
};

const LOOP = [
  {
    title: "Detect",
    body: "Inbound forms and optional Census / FMCSA discovery surface carriers worth review.",
  },
  {
    title: "Review",
    body: "Explainable scores, signals, and company context before outreach.",
  },
  {
    title: "Qualify",
    body: "Consent-gated voice call; transcript and fields update the record after staff review.",
  },
  {
    title: "Convert",
    body: "CRM stages through consultation, approval, and Won—without losing the story.",
  },
  {
    title: "Fulfill",
    body: "Docket cases track documents, extracted fields, tasks, and renewals.",
  },
  {
    title: "Monitor",
    body: "RegLens matches regulations to clients and prospects who may need follow-up.",
  },
] as const;

const MODULES = [
  {
    id: "overview",
    name: "Overview",
    body: "Attention items composed from the same records as CRM, Docket, and RegLens—what needs a human today.",
    points: ["Cross-module attention queue", "Demo walkthrough entry points", "Live status of providers"],
  },
  {
    id: "prospecting",
    name: "Prospecting",
    body: "Search and score carriers from public operating profiles. Label contact gaps so cold outreach is honest.",
    points: [
      "USDOT / name lookup via FMCSA when configured",
      "Explainable priority lines (new entrant, fleet fit, authority, phone on file)",
      "CA New Entrant radar for batch discovery",
      "Save prospects into the opportunity queue",
    ],
  },
  {
    id: "opportunities",
    name: "Opportunities",
    body: "Review-worthy carriers and saved prospects with stage, score breakdown, and recommended next action.",
    points: [
      "Why this opportunity? score explain",
      "Phone on file / not on file filters",
      "Notes, follow-ups, dismiss, mark won or lost",
    ],
  },
  {
    id: "crm",
    name: "CRM and inbound leads",
    body: "Website walkthrough requests and staff-entered leads land with provenance. Stage and next action stay on one record.",
    points: [
      "Inbound intake form → lead",
      "Stages through consultation and service approval",
      "Language, owner, and follow-up on the same opportunity",
    ],
  },
  {
    id: "voice-agent",
    name: "Voice agent",
    body: "Outbound qualification calls with consent gates. The agent collects answers; staff decide what the record means.",
    points: [
      "Start call from the opportunity (Dograh when live)",
      "Allowlisted numbers and consent checkbox",
      "Call summary + structured fields for review",
      "Never auto-Won, never opens Docket alone",
    ],
  },
  {
    id: "docket",
    name: "Docket",
    body: "Won work becomes a service case: documents, field extraction for review, tasks, and renewal calendars.",
    points: [
      "Case checklist and task tracking",
      "Document upload with structured extraction",
      "Insufficient-extraction warning instead of fake sample data",
      "Confirm fields before they drive the case",
    ],
  },
  {
    id: "reglens",
    name: "RegLens",
    body: "Intake regulation text, structure the impact, and match clients or prospects who may need follow-up.",
    points: [
      "Paste or inbox notices",
      "Structured analysis (deadline, segment, required action)",
      "Carrier / prospect matching",
      "Create opportunity campaign from a notice",
    ],
  },
  {
    id: "modes",
    name: "Demo and live modes",
    body: "Seeded walkthrough survives provider failure. Live mode uses Supabase, FMCSA, voice, and extraction when keys are present.",
    points: [
      "Demo store + optional cloud workspace sync",
      "Invite-only staff auth when configured",
      "Source-of-truth vs inferred data stays labeled",
    ],
  },
] as const;

const FAQ = [
  {
    id: "what",
    question: "What is SkyOS?",
    answer:
      "An operations workspace for trucking compliance teams. It covers prospecting, inbound CRM, voice qualification, Docket cases, and RegLens monitoring in one product.",
  },
  {
    id: "who",
    question: "Who is it for?",
    answer:
      "Staff who run compliance service operations—not a carrier-facing consulting storefront. The public page explains the product; daily work starts from Access product.",
  },
  {
    id: "voice",
    question: "What does the voice agent do?",
    answer:
      "It runs a consent-gated qualification call, then returns a transcript and fields. Staff review those fields. The agent does not mark deals Won, open cases, or give legal advice.",
  },
  {
    id: "hood",
    question: "What runs under the hood?",
    answer:
      "Deterministic score rules, optional Dograh calls, document field extraction for Confirm, and Federal Register / FMCSA notice fetch in RegLens. Demo mode works without live keys.",
  },
  {
    id: "data",
    question: "Does public FMCSA data prove a carrier needs outreach?",
    answer:
      "No. Public operating data may suggest possible relevance for review. It does not prove purchasing intent, noncompliance, or that a service is required.",
  },
  {
    id: "demo",
    question: "Can I try it without API keys?",
    answer:
      "Yes. Demo mode runs the full loop with seeded data. Access product from this page; live providers are optional.",
  },
] as const;

export default function MarketingHomePage() {
  return (
    <>
      <MarketingProductHero />

      <MarketingProductPreview />

      <MarketingVoiceSection />

      <MarketingUnderTheHood />

      <MarketingIntroSplit
        id="about"
        headline={
          <>
            One operating loop.
            <br />
            <em className="italic text-[var(--mkt-ink-muted)]">Context stays with the record.</em>
          </>
        }
        linkHref="#modules"
        linkLabel="See all features"
      >
        <p className="font-sans text-base leading-[1.8] text-[var(--mkt-ink-muted)] md:text-lg">
          Compliance shops usually split work across a form inbox, a spreadsheet CRM, a phone,
          document folders, and a regulation feed. SkyOS keeps that path in one product so staff are
          not rebuilding the story at every handoff.
        </p>
        <p className="font-sans text-base leading-[1.8] text-[var(--mkt-ink)] md:text-lg">
          Standalone product brand for portfolio and evaluation. Not affiliated with FMCSA or a
          single employer. Does not guarantee regulatory outcomes.
        </p>
      </MarketingIntroSplit>

      <MarketingProofStrip />

      <section id="loop" className="scroll-mt-24 bg-[var(--mkt-snow)]">
        <div className="mx-auto max-w-[var(--mkt-content-max)] px-6 py-16 md:px-8 md:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-0">
            <div className="lg:col-span-5 lg:pr-14 lg:pt-4">
              <p className="font-sans text-sm text-[var(--mkt-ink-faint)]">Operating loop</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3.25rem)] tracking-tight text-balance text-[var(--mkt-ink)]">
                Detect → qualify → fulfill → monitor
              </h2>
              <MarketingSectionRule tone="brand" className="mt-5" />
              <p className="mt-8 border-l-2 border-[color-mix(in_srgb,var(--mkt-brand)_35%,transparent)] pl-5 font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--mkt-ink)] md:text-2xl">
                Inbound first. Public-data discovery is secondary when contact data supports review.
              </p>
            </div>
            <ol className="lg:col-span-7 lg:pl-8">
              {LOOP.map((step, index) => (
                <li
                  key={step.title}
                  className="border-b border-[var(--mkt-border)] py-5 first:border-t first:border-[var(--mkt-border)] md:py-6"
                >
                  <p className="font-sans text-sm font-medium text-[var(--mkt-ink-faint)]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-sans text-base font-medium text-[var(--mkt-ink)] md:text-[1.05rem]">
                    {step.title}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)] md:text-base">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="modules" className="scroll-mt-24 border-t border-[var(--mkt-border)] bg-[var(--mkt-canvas)]">
        <div className="mx-auto max-w-[var(--mkt-content-max)] px-6 py-16 md:px-8 md:py-24">
          <p className="font-sans text-sm text-[var(--mkt-ink-faint)]">Features</p>
          <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.85rem,3.5vw,2.75rem)] tracking-tight text-[var(--mkt-ink)]">
            Everything in the workspace
          </h2>
          <MarketingSectionRule tone="brand" className="mt-5" />
          <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
            Modules below map to real routes in the product. Access the product to run the seeded
            demo loop end to end.
          </p>

          <ul className="mt-12 divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
            {MODULES.map((mod) => (
              <li key={mod.id} id={mod.id} className="scroll-mt-28 py-8 md:py-10">
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-10">
                  <div>
                    <h3 className="font-sans text-base font-medium text-[var(--mkt-ink)] md:text-lg">
                      {mod.name}
                    </h3>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)] md:text-base">
                      {mod.body}
                    </p>
                  </div>
                  <ul className="space-y-2.5 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)] md:pt-1">
                    {mod.points.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span
                          aria-hidden
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--mkt-accent)]"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MarketingMonitoringBand />

      <section id="faq" className="scroll-mt-24 bg-[var(--mkt-snow)]">
        <div className="mx-auto max-w-[var(--mkt-content-max)] px-6 py-16 md:px-8 md:py-24">
          <div className="grid gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-4">
              <p className="font-sans text-sm text-[var(--mkt-ink-faint)]">FAQ</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.75rem,3vw,2.5rem)] tracking-tight text-[var(--mkt-ink)]">
                Common questions
              </h2>
              <MarketingSectionRule tone="brand" className="mt-5" />
            </div>
            <div className="md:col-span-8">
              <MarketingAccordion items={FAQ} />
            </div>
          </div>
        </div>
      </section>

      <section id="cta" className="mkt-on-dark scroll-mt-24 bg-[var(--mkt-brand)]">
        <div className="mx-auto flex max-w-[var(--mkt-content-max)] flex-col gap-6 px-6 py-14 md:flex-row md:items-end md:justify-between md:gap-12 md:px-8 md:py-20">
          <div className="max-w-xl">
            <h2 className="mkt-title-section text-balance">Access the product</h2>
            <MarketingSectionRule tone="accent" />
            <p className="mt-4 font-sans text-base leading-relaxed text-[var(--mkt-on-dark-muted)]">
              Run Opportunities → Qualify → Won → Docket → RegLens on seeded data, or connect live
              providers when you are ready.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <MarketingPrimaryButton href="/access" variant="on-dark">
              Access product
            </MarketingPrimaryButton>
            <Link href="#product" className="mkt-text-link-on-dark">
              See product screens
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
