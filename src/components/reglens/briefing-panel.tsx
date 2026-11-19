"use client";

import { ProvenanceLabel } from "@/components/shared/provenance-label";
import type { Briefing, BriefingKind } from "@/lib/regulations/briefing";

const SECTION_TITLE: Record<BriefingKind, string> = {
  what_it_says: "What the notice says",
  related_notice: "Related earlier notices",
  review_step: "Staff may want to check",
};
const ORDER: BriefingKind[] = ["what_it_says", "related_notice", "review_step"];

export function BriefingPanel({
  briefing,
  loading,
}: {
  briefing: Briefing | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="mt-8 max-w-2xl" aria-busy="true">
        <h2 className="text-sm font-medium">Briefing</h2>
        <p className="mt-2 text-sm text-muted-foreground">Preparing briefing…</p>
      </section>
    );
  }
  if (!briefing || briefing.points.length === 0) {
    return (
      <section className="mt-8 max-w-2xl">
        <h2 className="text-sm font-medium">Briefing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No briefing yet. Add source text to this notice to prepare one.
        </p>
      </section>
    );
  }

  // Number only the sources that a statement actually cites.
  const citedIds = [...new Set(briefing.points.flatMap((point) => point.citations))];
  const cited = briefing.sources.filter((source) => citedIds.includes(source.id));
  const numberOf = new Map(cited.map((source, index) => [source.id, index + 1]));

  return (
    <section className="mt-8 max-w-2xl" aria-labelledby="briefing-title">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 id="briefing-title" className="text-sm font-medium">
          Briefing
        </h2>
        {briefing.method === "model_cited" ? (
          <ProvenanceLabel value="AI_EXTRACTED" />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Quoted from sources
          </span>
        )}
      </div>

      {ORDER.map((kind) => {
        const points = briefing.points.filter((point) => point.kind === kind);
        if (points.length === 0) return null;
        return (
          <div key={kind} className="mt-4">
            <h3 className="text-xs text-muted-foreground">{SECTION_TITLE[kind]}</h3>
            <ul className="mt-1 space-y-2">
              {points.map((point, index) => (
                <li key={`${kind}-${index}`} className="text-sm leading-6 text-foreground">
                  {point.text}{" "}
                  {point.citations.map((id) => (
                    <a
                      key={id}
                      href={`#briefing-source-${numberOf.get(id)}`}
                      className="font-mono text-xs tabular text-info hover:underline"
                      aria-label={`Source ${numberOf.get(id)}`}
                    >
                      [{numberOf.get(id)}]
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <ol className="mt-4 space-y-1 border-t border-border pt-3">
        {cited.map((source) => (
          <li
            key={source.id}
            id={`briefing-source-${numberOf.get(source.id)}`}
            className="text-xs text-muted-foreground"
          >
            <span className="font-mono tabular">[{numberOf.get(source.id)}]</span>{" "}
            {source.url ? (
              <a href={source.url} className="hover:underline" target="_blank" rel="noreferrer">
                {source.title}
              </a>
            ) : (
              source.title
            )}
            {source.documentNumber ? (
              <span className="font-mono tabular"> · {source.documentNumber}</span>
            ) : null}
          </li>
        ))}
      </ol>

      {briefing.dropped.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {briefing.dropped.length} drafted{" "}
          {briefing.dropped.length === 1 ? "statement was" : "statements were"} removed because a
          cited notice did not support {briefing.dropped.length === 1 ? "it" : "them"}.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{briefing.disclaimer}</p>
    </section>
  );
}
