const PROOF = [
  {
    title: "Explainable scores",
    body: "Priority lines come from observable fields—registration timing, fleet fit, authority, contact on file.",
  },
  {
    title: "Human review gates",
    body: "Outreach, service start, document confirmation, and regulation follow-ups stay staff decisions.",
  },
  {
    title: "One record",
    body: "Intake, qualification, cases, documents, and monitoring share context instead of retyped notes.",
  },
  {
    title: "Careful claims",
    body: "Public data suggests possible relevance. It does not prove intent, noncompliance, or outcomes.",
  },
] as const;

export function MarketingProofStrip() {
  return (
    <section
      className="border-y border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
      aria-label="SkyOS product principles"
    >
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-8 px-6 py-10 md:grid-cols-4 md:gap-6 md:px-8 md:py-12">
        {PROOF.map((item) => (
          <div key={item.title}>
            <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">{item.title}</p>
            <p className="mt-1.5 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
