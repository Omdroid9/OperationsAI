const ROWS = [
  {
    action: "Contact a carrier",
    rule: "Outreach starts only when staff save a prospect or place a call, and a call needs consent confirmed first. Public data suggests a carrier is worth reviewing. It does not show they want to buy.",
  },
  {
    action: "Change a record",
    rule: "Fields read from a call or a document stay a draft, labelled with where they came from, until staff confirm them. Values that disagree with the carrier record are pointed out.",
  },
  {
    action: "Flag a client",
    rule: "A regulation match is a suggestion. Staff review the related notices, decide client by client, and approve before any task appears on a case.",
  },
  {
    action: "State a conclusion",
    rule: "Briefings quote or cite the notice. A drafted sentence with a missing citation, a date its source does not contain, or a word like “violation” is removed before anyone reads it.",
  },
] as const;

/** The limits are the product: what stays with staff, and the mechanism that keeps it there. */
export function MarketingSafeguards() {
  return (
    <section
      id="safeguards"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-canvas)]"
      aria-labelledby="safeguards-title"
    >
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-10 px-6 py-20 md:grid-cols-12 md:px-8 md:py-28">
        <div className="md:col-span-4">
          <h2 id="safeguards-title" className="mkt-title-section text-[var(--mkt-ink)]">
            What it will not do on its own
          </h2>
          <p className="mt-4 max-w-[34ch] font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
            Compliance work carries consequences, so the software prepares and a person decides.
          </p>
        </div>
        <dl className="md:col-span-7 md:col-start-6">
          {ROWS.map((row) => (
            <div
              key={row.action}
              className="grid gap-2 border-t border-[var(--mkt-border)] py-6 first:border-t-0 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-8"
            >
              <dt className="font-sans text-base font-medium text-[var(--mkt-ink)]">{row.action}</dt>
              <dd className="font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
                {row.rule}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
