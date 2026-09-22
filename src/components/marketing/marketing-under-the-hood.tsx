import Image from "next/image";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";

const PARTS = [
  {
    title: "Priority scores",
    body: "Rules from public fields—new entrant timing, fleet fit, authority, phone on file. Each line shows why the score moved.",
  },
  {
    title: "Document extraction",
    body: "Upload a CDL or medical certificate. Fields come back as a draft with a confidence label. Staff Confirm before dates drive the case.",
  },
  {
    title: "Regulation fetch",
    body: "RegLens pulls Federal Register / FMCSA notices when live. Matching is overlap on operating profile—not a legal opinion.",
  },
  {
    title: "Demo vs live",
    body: "Demo mode runs the full loop on seeded data if providers fail. Live mode uses Supabase, FMCSA, Dograh, and extraction when keys are set.",
  },
] as const;

export function MarketingUnderTheHood() {
  return (
    <section
      id="under-the-hood"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
      aria-label="Under the hood"
    >
      <div className="mx-auto max-w-[88rem] px-6 py-16 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="font-sans text-sm text-[var(--mkt-ink-faint)]">Under the hood</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.85rem,3.5vw,2.75rem)] tracking-tight text-[var(--mkt-ink)]">
              Simple for staff. Explicit about automation.
            </h2>
            <MarketingSectionRule tone="brand" className="mt-5" />
            <p className="mt-6 font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
              Models help extract text and structure calls. They do not decide outreach, Won,
              or compliance outcomes. Provenance stays visible: source data vs inferred fields.
            </p>
          </div>

          <ul className="space-y-8 lg:col-span-7 lg:pt-2">
            {PARTS.map((part) => (
              <li
                key={part.title}
                className="border-b border-[var(--mkt-border)] pb-8 last:border-b-0 last:pb-0"
              >
                <p className="font-sans text-base font-medium text-[var(--mkt-ink)]">{part.title}</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)] md:text-base">
                  {part.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <figure className="mt-14 overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-canvas)]">
          <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
            <Image
              src="/presentations/shots/10-docket-confirm.png"
              alt="Confirm extracted document fields before they drive the Docket case"
              fill
              quality={85}
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 88rem"
            />
          </div>
          <figcaption className="border-t border-[var(--mkt-border)] px-5 py-4 md:px-6">
            <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">
              Confirm extracted fields
            </p>
            <p className="mt-1 font-sans text-sm text-[var(--mkt-ink-muted)]">
              Extraction is a draft. A person confirms names and dates before fulfillment trusts them.
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
