import { ProvenanceLabel } from "@/components/shared/provenance-label";
import { calculateOpportunityScore } from "@/lib/scoring/opportunity-score";
import type { ScoreLine } from "@/types";

export function ScoreExplain({
  lines,
  title = "Why this opportunity?",
}: {
  lines: ScoreLine[];
  title?: string;
}) {
  const total = calculateOpportunityScore(lines);
  const raw = lines.reduce((sum, line) => sum + line.points, 0);

  return (
    <section className="max-w-xl">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each line is a rule that fired. Public data still does not prove they will buy.
      </p>
      <dl className="mt-4 divide-y divide-border border-y border-border">
        {lines.map((line) => (
          <div key={line.key} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="flex items-baseline gap-2 text-sm text-foreground">
              {line.label}
              <ProvenanceLabel value={line.provenance} />
            </dt>
            <dd className="tabular text-sm text-foreground">
              {line.points > 0 ? "+" : ""}
              {line.points}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-sm font-medium text-foreground">Total</dt>
          <dd className="tabular text-sm font-medium text-foreground">{total}</dd>
        </div>
      </dl>
      {raw > 100 ? (
        <p className="mt-2 text-xs text-muted-foreground">Raw contribution {raw}, capped at 100.</p>
      ) : null}
    </section>
  );
}
