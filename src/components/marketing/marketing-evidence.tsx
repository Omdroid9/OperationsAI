import { getEvalReport, type DocketRow } from "@/lib/regulations/rag/eval/report";

const pct = (value: number) => `${Math.round(value * 100)}%`;
const mono = "font-[family-name:var(--font-geist-mono)]";

const LABEL: Record<string, string> = {
  bm25: "Without an embedding provider",
  embedding: "With embeddings",
};

function Row({ label, row }: { label: string; row: DocketRow }) {
  return (
    <tr>
      <th scope="row" className="border-t border-[var(--mkt-border)] py-3 pr-4 text-left font-sans text-sm font-normal text-[var(--mkt-ink)]">
        {label}
      </th>
      <td className={`${mono} border-t border-[var(--mkt-border)] py-3 pr-4 text-right text-sm text-[var(--mkt-ink)]`}>
        {row.queries}
      </td>
      <td className={`${mono} border-t border-[var(--mkt-border)] py-3 pr-4 text-right text-sm text-[var(--mkt-ink)]`}>
        {pct(row.gatedPrecision)}
      </td>
      <td className={`${mono} border-t border-[var(--mkt-border)] py-3 text-right text-sm text-[var(--mkt-ink)]`}>
        {pct(row.gatedRecall)}
      </td>
    </tr>
  );
}

/** Published test results for Similar notices, including the case where it does badly. */
export function MarketingEvidence() {
  const report = getEvalReport();
  const rules = report.docket.find((group) => group.stratum === "rules_and_notices");
  const series = report.docket.find((group) => group.stratum === "medical_exemption_series");
  if (!rules) return null;
  const shown = rules.rows.filter((row) => LABEL[row.strategy]);
  const weak = series?.rows.find((row) => row.strategy === "embedding");

  return (
    <section
      id="evidence"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
      aria-labelledby="evidence-title"
    >
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-10 px-6 py-20 md:grid-cols-12 md:px-8 md:py-28">
        <div className="md:col-span-4">
          <h2 id="evidence-title" className="mkt-title-section text-[var(--mkt-ink)]">
            Tested on real notices
          </h2>
          <p className="mt-4 max-w-[36ch] font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
            Similar notices is checked against {report.corpus.size} FMCSA documents from the
            Federal Register. Two documents count as related when the Register files them under
            the same docket, so nobody wrote the answers by hand.
          </p>
        </div>
        <div className="min-w-0 md:col-span-7 md:col-start-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className="pb-3 pr-4 text-left font-sans text-xs font-normal text-[var(--mkt-ink-faint)]">
                    Rules and notices
                  </th>
                  <th scope="col" className="pb-3 pr-4 text-right font-sans text-xs font-normal text-[var(--mkt-ink-faint)]">
                    Documents tested
                  </th>
                  <th scope="col" className="pb-3 pr-4 text-right font-sans text-xs font-normal text-[var(--mkt-ink-faint)]">
                    Shown and related
                  </th>
                  <th scope="col" className="pb-3 text-right font-sans text-xs font-normal text-[var(--mkt-ink-faint)]">
                    Related and shown
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <Row key={row.strategy} label={LABEL[row.strategy]} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[62ch] font-sans text-xs leading-relaxed text-[var(--mkt-ink-faint)]">
            “Shown and related” is the share of displayed notices that really were related.
            “Related and shown” is the share of related notices that reached the page.
          </p>
          {weak ? (
            <p className="mt-6 max-w-[62ch] border-t border-[var(--mkt-border)] pt-6 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
              <span className="font-medium text-[var(--mkt-ink)]">Where it does badly.</span>{" "}
              Medical exemption notices repeat nearly the same text under rolling dockets. On
              those {weak.queries} documents only {pct(weak.gatedPrecision)} of shown notices were
              related, so staff should treat similar notices there as weak. Results are from the
              snapshot of {report.corpus.fetchedAt} and are a retrieval test, not a measure of legal
              accuracy.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
