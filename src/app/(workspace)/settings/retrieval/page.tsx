import { PageBody } from "@/components/shared/page-body";
import { getEvalReport, type DocketRow, type GoldenRow } from "@/lib/regulations/rag/eval/report";

export const metadata = { title: "Retrieval quality · SkyOS" };

const STRATEGY_LABEL: Record<string, string> = {
  bm25: "Shared terms (BM25)",
  dense: "Hashed tokens",
  hybrid: "Hashed tokens + BM25",
  embedding_only: "Embeddings",
  embedding: "Embeddings + BM25",
};
const IN_USE: Record<string, string> = {
  bm25: "Demo Mode and no-key fallback",
  embedding: "Live Mode",
};

const pct = (value: number) => `${Math.round(value * 100)}%`;
const shortId = (id: string) => id.replace(/^(corpus|fr)_/, "");

function Th({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`border-b border-border py-2 pr-4 text-xs font-normal text-muted-foreground ${numeric ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}
function Td({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <td className={`border-b border-border py-2 pr-4 text-sm ${numeric ? "text-right font-mono tabular" : ""}`}>
      {children}
    </td>
  );
}
function StrategyCell({ strategy }: { strategy: string }) {
  return (
    <Td>
      {STRATEGY_LABEL[strategy] ?? strategy}
      {IN_USE[strategy] ? (
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {IN_USE[strategy]}
        </span>
      ) : null}
    </Td>
  );
}

function DocketTable({ rows, k }: { rows: DocketRow[]; k: number }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <Th>Method</Th>
            <Th numeric>Notices tested</Th>
            <Th numeric>Related found in top {k}</Th>
            <Th numeric>Shown and related</Th>
            <Th numeric>Related and shown</Th>
            <Th numeric>Avg shown</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.strategy}>
              <StrategyCell strategy={row.strategy} />
              <Td numeric>{row.queries}</Td>
              <Td numeric>{pct(row.recallAtK)}</Td>
              <Td numeric>{pct(row.gatedPrecision)}</Td>
              <Td numeric>{pct(row.gatedRecall)}</Td>
              <Td numeric>{row.gatedShown.toFixed(1)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoldenTable({ rows, k }: { rows: GoldenRow[]; k: number }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr>
            <Th>Method</Th>
            <Th numeric>Queries</Th>
            <Th numeric>Expected found in top {k}</Th>
            <Th numeric>Shown and expected</Th>
            <Th numeric>No result</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.strategy}>
              <StrategyCell strategy={row.strategy} />
              <Td numeric>{row.cases}</Td>
              <Td numeric>{pct(row.recallAtK)}</Td>
              <Td numeric>{pct(row.precisionAtK)}</Td>
              <Td numeric>{row.emptyResultCases}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RetrievalQualityPage() {
  const report = getEvalReport();
  const rules = report.docket.find((group) => group.stratum === "rules_and_notices");
  const series = report.docket.find((group) => group.stratum === "medical_exemption_series");
  const keyword = report.golden.find((group) => group.kind === "keyword");
  const paraphrase = report.golden.find((group) => group.kind === "paraphrase");

  return (
    <PageBody>
      <div className="max-w-4xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight">Retrieval quality</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          How well Similar notices finds related documents, measured on {report.corpus.size} FMCSA
          documents from the Federal Register (snapshot {report.corpus.fetchedAt}). These numbers
          come from the last committed test run, not from live traffic.
        </p>

        {rules ? (
          <section className="mt-8" aria-labelledby="quality-real">
            <h2 id="quality-real" className="text-sm font-medium">
              Real notices: finding documents in the same docket
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Two documents count as related when the Federal Register lists them under the same
              docket or rule number, such as a proposed rule and its final rule. Nobody wrote these
              answers by hand. Each document is used as the search and must find its relatives.
            </p>
            <DocketTable rows={rules.rows} k={report.docketK} />
            <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
              “Shown and related” is the share of displayed notices that really are related.
              “Related and shown” is the share of related notices that made it onto the page.
            </p>
          </section>
        ) : null}

        {series ? (
          <section className="mt-8" aria-labelledby="quality-series">
            <h2 id="quality-series" className="text-sm font-medium">
              Known weak spot: medical exemption notices
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Epilepsy, hearing and similar exemption notices repeat nearly the same text under
              rolling dockets. No text-based method can tell which batch belongs to which docket, so
              every method scores low. Treat similar notices on these documents as weak.
            </p>
            <DocketTable rows={series.rows} k={report.docketK} />
          </section>
        ) : null}

        {keyword && paraphrase ? (
          <section className="mt-8" aria-labelledby="quality-golden">
            <h2 id="quality-golden" className="text-sm font-medium">
              Written test searches
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {report.goldenCases.length} searches against 8 sample notices. Some use the notices’
              own wording; others describe the same topic in different words. The display cutoff was
              tuned while looking at this set, so the real-notice results above are the stronger
              evidence.
            </p>
            <h3 className="mt-4 text-xs text-muted-foreground">Same wording as the notices</h3>
            <GoldenTable rows={keyword.rows} k={report.goldenK} />
            <h3 className="mt-5 text-xs text-muted-foreground">Different wording</h3>
            <GoldenTable rows={paraphrase.rows} k={report.goldenK} />

            <h3 className="mt-6 text-xs text-muted-foreground">Each search</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    <Th>Search</Th>
                    <Th>Expected</Th>
                    <Th>Shared terms returned</Th>
                    <Th>Embeddings returned</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.goldenCases.map((item) => (
                    <tr key={item.id} className="align-top">
                      <Td>{item.query}</Td>
                      <Td>
                        <span className="font-mono text-xs">{item.relevant.map(shortId).join(", ")}</span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs">
                          {item.bm25.map(shortId).join(", ") || "nothing"}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs">
                          {item.embedding ? item.embedding.map(shortId).join(", ") || "nothing" : "not run"}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <p className="mt-8 max-w-2xl text-xs text-muted-foreground">
          Embeddings: {report.model}. Similar notices suggest possible relevance for staff review.
          They are not a compliance finding.
        </p>
      </div>
    </PageBody>
  );
}
