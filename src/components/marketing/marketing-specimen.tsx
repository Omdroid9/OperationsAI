import type { Specimen } from "@/lib/marketing/specimen";

const mono = "font-[family-name:var(--font-geist-mono)]";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * A real Federal Register rule shown the way RegLens shows it: related notices
 * found by retrieval, then statements quoted from the notices they cite.
 */
export function MarketingSpecimen({ specimen }: { specimen: Specimen }) {
  const { notice, similar, briefing } = specimen;
  // Two statements from the rule itself, then one from a notice found as related.
  const points = [
    ...briefing.points.filter((point) => point.kind === "what_it_says").slice(0, 2),
    ...briefing.points.filter((point) => point.kind === "related_notice").slice(0, 1),
  ];
  const cited = briefing.sources.filter((source) =>
    points.some((point) => point.citations.includes(source.id)),
  );
  const numberOf = new Map(cited.map((source, index) => [source.id, index + 1]));

  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-snow)] shadow-[0_24px_60px_-36px_rgba(28,25,23,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--mkt-border)] px-5 py-3">
          <p className={`${mono} text-[0.6875rem] tracking-[0.06em] text-[var(--mkt-ink-faint)]`}>
            FEDERAL REGISTER · {notice.documentNumber}
          </p>
          <p className="rounded-[4px] bg-[#fef3c7] px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-[#92400e]">
            Needs review
          </p>
        </div>

        <div className="px-5 pt-4">
          <p className="font-sans text-[0.9375rem] font-medium leading-snug text-[var(--mkt-ink)]">
            {notice.title}
          </p>
          <p className="mt-1 font-sans text-xs text-[var(--mkt-ink-faint)]">
            FMCSA · {notice.category} · {formatDate(notice.publishedDate)}
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--mkt-border)] px-5 py-4">
          <p className="font-sans text-xs text-[var(--mkt-ink-faint)]">Briefing</p>
          <ul className="mt-2 space-y-2.5">
            {points.map((point, index) => (
              <li
                key={index}
                className="font-sans text-[0.8125rem] leading-relaxed text-[var(--mkt-ink)]"
              >
                {point.text}{" "}
                {point.citations.map((id) => (
                  <span key={id} className={`${mono} text-[0.6875rem] text-[var(--mkt-ink-faint)]`}>
                    [{numberOf.get(id)}]
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>

        <ol className="space-y-1.5 border-t border-[var(--mkt-border)] bg-[var(--mkt-canvas)] px-5 py-3.5">
          {cited.map((source) => (
            <li key={source.id} className="flex gap-2 font-sans text-xs text-[var(--mkt-ink-muted)]">
              <span className={`${mono} shrink-0 text-[0.6875rem] text-[var(--mkt-ink-faint)]`}>
                [{numberOf.get(source.id)}]
              </span>
              <span className="min-w-0">
                <span className="line-clamp-1">{source.title}</span>
                <span className={`${mono} text-[0.6875rem] text-[var(--mkt-ink-faint)]`}>
                  {source.documentNumber}
                  {similar.some((item) => item.chunk.id === source.id) ? " · found as related" : " · this rule"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
        A real FMCSA rule, processed by the product. Every sentence is quoted from the notice it
        cites.
      </figcaption>
    </figure>
  );
}
