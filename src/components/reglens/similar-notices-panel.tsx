"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/format";
import type { RegulationRagResult } from "@/lib/regulations/rag";
import { cn } from "@/lib/utils";

export function SimilarNoticesPanel({
  result,
  loading,
  reviewed,
  onReviewed,
}: {
  result: RegulationRagResult | undefined;
  loading?: boolean;
  reviewed: boolean;
  onReviewed: () => void;
}) {
  if (loading) {
    return (
      <section className="mt-8" aria-busy="true">
        <h2 className="text-sm font-medium">Similar notices</h2>
        <p className="mt-2 text-sm text-muted-foreground">Retrieving seeded notice index…</p>
      </section>
    );
  }

  const notices = result?.similarNotices ?? [];

  return (
    <section className="mt-8" aria-labelledby="similar-notices-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="similar-notices-title" className="text-sm font-medium">
            Similar notices
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Retrieved from a seeded notice index by lexical overlap. Suggests possible relevance —
            not a compliance finding.
          </p>
        </div>
        <StatusBadge label={reviewed ? "Reviewed" : "Needs review"} tone={reviewed ? "success" : "warning"} />
      </div>

      {notices.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No similar notices above the overlap threshold. Profile matching still stands on its own.
        </p>
      ) : (
        <ul className="mt-4 max-w-2xl divide-y divide-border border-y border-border">
          {notices.map((item) => (
            <li key={item.chunk.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.chunk.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.chunk.agency}
                    <span className="mx-1.5 text-border">·</span>
                    {item.chunk.category}
                    {item.chunk.documentNumber ? (
                      <>
                        <span className="mx-1.5 text-border">·</span>
                        <span className="font-mono tabular">{item.chunk.documentNumber}</span>
                      </>
                    ) : null}
                    <span className="mx-1.5 text-border">·</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
                      Retrieved
                    </span>
                  </p>
                </div>
                <p className="shrink-0 font-mono text-xs tabular text-muted-foreground">
                  {formatPercent(item.score)}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.chunk.summary}</p>
              <p className="mt-2 text-sm text-foreground">{item.whyRelated}</p>
              {item.overlapTerms.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Overlap: {item.overlapTerms.join(", ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 max-w-2xl text-xs text-muted-foreground">{result?.disclaimer}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={reviewed ? "outline" : "default"}
          onClick={onReviewed}
          className={cn(reviewed && "text-muted-foreground")}
        >
          {reviewed ? "Marked reviewed" : "Mark similar notices reviewed"}
        </Button>
        {!reviewed ? (
          <p className="text-xs text-muted-foreground">
            Required before flagging current customers.
          </p>
        ) : null}
      </div>
    </section>
  );
}
