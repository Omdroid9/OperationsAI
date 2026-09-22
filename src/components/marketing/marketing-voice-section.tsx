import Image from "next/image";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";

const HOOD = [
  {
    title: "Consent first",
    body: "Staff confirm the person agreed to an outbound call. Live numbers sit on a server allowlist.",
  },
  {
    title: "Call provider",
    body: "Dograh places the qualification call when live mode is on. Demo mode uses a stored multilingual call.",
  },
  {
    title: "What comes back",
    body: "Transcript and structured fields land on the opportunity. Nothing auto-marks Won or opens a Docket case.",
  },
  {
    title: "Staff review",
    body: "A person reads the summary, edits fields if needed, then moves the stage. The agent never promises service or legal advice.",
  },
] as const;

export function MarketingVoiceSection() {
  return (
    <section
      id="voice"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-canvas)]"
      aria-label="Voice qualification"
    >
      <div className="mx-auto max-w-[88rem] px-6 py-16 md:px-8 md:py-24">
        <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">Voice agent</p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.85rem,3.5vw,2.75rem)] tracking-tight text-[var(--mkt-ink)]">
          Qualify on a call. Keep the story on the record.
        </h2>
        <MarketingSectionRule tone="brand" className="mt-5" />
        <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
          From an opportunity, staff start a qualification call. The voice agent asks operational
          questions. After the call, SkyOS shows a summary and fields for review—not as automatic
          truth.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <figure className="overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-snow)]">
            <div className="flex aspect-[16/11] flex-col justify-center gap-4 bg-[var(--mkt-canvas)] px-6 py-8 md:px-8">
              <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">
                Start qualification call
              </p>
              <p className="font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
                Staff confirm consent, enter an allowlisted test number, then start the Dograh call.
                The agent must not mark Won, open a case, or give legal advice.
              </p>
              <ul className="space-y-2 font-sans text-sm text-[var(--mkt-ink-muted)]">
                <li className="flex gap-2">
                  <span aria-hidden className="text-[var(--mkt-ink)]">
                    ✓
                  </span>
                  Consent confirmed
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="text-[var(--mkt-ink)]">
                    ✓
                  </span>
                  Number on server allowlist
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="text-[var(--mkt-ink)]">
                    ✓
                  </span>
                  Staff review after the call
                </li>
              </ul>
            </div>
            <figcaption className="border-t border-[var(--mkt-border)] px-5 py-4">
              <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">
                Start qualification call
              </p>
              <p className="mt-1 font-sans text-sm text-[var(--mkt-ink-muted)]">
                Consent and allowlist before Dograh dials.
              </p>
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-snow)]">
            <div className="relative aspect-[16/11] w-full">
              <Image
                src="/presentations/shots/07-call-summary.png"
                alt="Call summary with extracted qualification fields"
                fill
                quality={85}
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 44rem"
              />
            </div>
            <figcaption className="border-t border-[var(--mkt-border)] px-5 py-4">
              <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">Call summary</p>
              <p className="mt-1 font-sans text-sm text-[var(--mkt-ink-muted)]">
                Transcript fields update the CRM after a person reviews them.
              </p>
            </figcaption>
          </figure>
        </div>

        <div className="mt-14 border-t border-[var(--mkt-border)] pt-12">
          <p className="font-sans text-sm text-[var(--mkt-ink-faint)]">Under the hood</p>
          <h3 className="mt-2 font-sans text-lg font-medium text-[var(--mkt-ink)]">
            What happens on a qualification call
          </h3>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOOD.map((item) => (
              <li key={item.title}>
                <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">{item.title}</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
