const PARTS = [
  {
    term: "Priority scores",
    detail: "Fixed rules over public fields: new-entrant timing, fleet size, authority, phone on file. Each score shows the lines that produced it.",
  },
  {
    term: "Voice calls",
    detail: "Dograh places calls in live mode. Demo mode replays a stored multilingual call.",
  },
  {
    term: "Document fields",
    detail: "CDLs and medical certificates are read into draft fields with a confidence label. Low-quality reads show a warning instead of sample data.",
  },
  {
    term: "Regulation matching",
    detail: "Notices are matched to carriers by operating profile, then grounded against similar prior notices. A match means review recommended, not a legal finding.",
  },
  {
    term: "Demo and live",
    detail: "Demo mode runs the full loop on seeded data and keeps working when a provider fails. Live mode uses Supabase, FMCSA, Dograh, and extraction when keys are set.",
  },
] as const;

export function MarketingUnderTheHood() {
  return (
    <section
      id="under-the-hood"
      className="scroll-mt-24 border-t border-[var(--mkt-border)] bg-[var(--mkt-canvas)]"
      aria-labelledby="hood-title"
    >
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-10 px-6 py-20 md:grid-cols-12 md:px-8 md:py-28">
        <div className="md:col-span-4">
          <h2 id="hood-title" className="text-[clamp(1.75rem,3vw,2.5rem)] text-[var(--mkt-ink)]">
            Under the hood
          </h2>
          <p className="mt-4 max-w-sm font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
            Models read calls and documents. Staff make every decision that changes a record.
          </p>
        </div>
        <dl className="divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)] md:col-span-7 md:col-start-6">
          {PARTS.map((part) => (
            <div key={part.term} className="grid gap-1 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="font-sans text-base font-medium text-[var(--mkt-ink)]">{part.term}</dt>
              <dd className="font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
                {part.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
