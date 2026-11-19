import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createInitialState } from "@/data/seed";
import {
  buildDocketQueries,
  runDocketEval,
  type DocketStratum,
  type DocketSummary,
} from "@/lib/regulations/rag/eval/docket-eval";
import { cachedEmbeddings } from "@/lib/regulations/rag/eval/embedding-cache";
import { GOLDEN_CASES } from "@/lib/regulations/rag/eval/golden";
import {
  runCase,
  summarize,
  type CaseResult,
  type Summary,
} from "@/lib/regulations/rag/eval/metrics";
import { noticeSourceText } from "@/lib/regulations/rag/faithfulness";
import { EMBEDDING_MODEL } from "@/lib/regulations/rag/gemini-embeddings";
import { tokenizeRegulationText } from "@/lib/regulations/rag/embed";
import {
  FEDERAL_REGISTER_CORPUS,
  FEDERAL_REGISTER_FETCHED_AT,
  DEMO_CORPUS,
  SEEDED_REGULATION_CORPUS,
  buildRegulationRagResult,
  chunkEmbeddingText,
  regulationEmbeddingText,
  retrieveSimilarNotices,
  type RetrievalStrategy,
  type SemanticVectors,
} from "@/lib/regulations/rag";

const K = 4;
const DOCKET_K = 5;
const LEXICAL: RetrievalStrategy[] = ["dense", "bm25", "hybrid"];
const EMBEDDING: RetrievalStrategy[] = ["embedding_only", "embedding"];
const REFRESH = process.env.EVAL_REFRESH_EMBEDDINGS === "1";
const REPORT_PATH = resolve(process.cwd(), "docs/research/eval-latest.md");
const JSON_PATH = resolve(process.cwd(), "src/lib/regulations/rag/eval/latest.json");

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
const short = (id: string) => id.replace(/^(corpus|fr)_/, "");

// --- Vectors (committed cache; fetched only with EVAL_REFRESH_EMBEDDINGS=1) ---------

const seed = createInitialState();
const sampleRegulation = seed.regulations.find((r) => r.id === "reg_new-entrant-packet")!;

const sampleDocVectors = await cachedEmbeddings(
  SEEDED_REGULATION_CORPUS.map(chunkEmbeddingText),
  "RETRIEVAL_DOCUMENT",
  { refresh: REFRESH },
);
const realDocVectors = await cachedEmbeddings(
  FEDERAL_REGISTER_CORPUS.map(chunkEmbeddingText),
  "RETRIEVAL_DOCUMENT",
  { refresh: REFRESH },
);
const queryVectors = await cachedEmbeddings(
  GOLDEN_CASES.map((g) => g.query),
  "RETRIEVAL_QUERY",
  { refresh: REFRESH },
);
// The walkthrough notice is embedded as a notice, the way the product does it.
const walkthroughVector = await cachedEmbeddings(
  [regulationEmbeddingText(sampleRegulation)],
  "RETRIEVAL_DOCUMENT",
  { refresh: REFRESH },
);
const hasVectors =
  sampleDocVectors != null &&
  realDocVectors != null &&
  queryVectors != null &&
  walkthroughVector != null;
const sampleChunkVectors = new Map(
  SEEDED_REGULATION_CORPUS.map((chunk, i) => [chunk.id, sampleDocVectors?.[i] ?? new Float32Array()]),
);
const realChunkVectors = new Map(
  FEDERAL_REGISTER_CORPUS.map((chunk, i) => [chunk.id, realDocVectors?.[i] ?? new Float32Array()]),
);
const STRATEGIES = hasVectors ? [...LEXICAL, ...EMBEDDING] : LEXICAL;

// --- Part 1: real Federal Register notices, docket-linked relevance -----------------

const docketQueries = buildDocketQueries(FEDERAL_REGISTER_CORPUS);
const STRATA: DocketStratum[] = ["rules_and_notices", "medical_exemption_series"];
const docket = new Map<string, DocketSummary>();
for (const stratum of STRATA) {
  const queries = docketQueries.filter((q) => q.stratum === stratum);
  for (const strategy of STRATEGIES) {
    docket.set(
      `${stratum}:${strategy}`,
      runDocketEval(
        FEDERAL_REGISTER_CORPUS,
        queries,
        strategy,
        DOCKET_K,
        hasVectors ? realChunkVectors : undefined,
      ),
    );
  }
}
const docketOf = (stratum: DocketStratum, strategy: RetrievalStrategy) =>
  docket.get(`${stratum}:${strategy}`)!;

// --- Part 2: hand-written golden queries over the illustrative sample corpus --------

const semanticFor = (queryIndex: number): SemanticVectors | undefined =>
  hasVectors ? { queryVector: queryVectors[queryIndex], chunkVectors: sampleChunkVectors } : undefined;

const golden = new Map<RetrievalStrategy, CaseResult[]>(
  STRATEGIES.map((strategy) => [
    strategy,
    GOLDEN_CASES.map((g, i) => runCase(g, strategy, K, semanticFor(i))),
  ]),
);
const byKind = (results: CaseResult[], kind: CaseResult["kind"]) =>
  summarize(results.filter((r) => r.kind === kind));

// --- Part 3: what the product shows ------------------------------------------------

const walkthroughKeyless = buildRegulationRagResult({
  regulation: sampleRegulation,
  workspaceRegulations: seed.regulations,
  limit: K,
});
const walkthroughEmbedding = hasVectors
  ? buildRegulationRagResult({
      regulation: sampleRegulation,
      workspaceRegulations: seed.regulations,
      limit: K,
      semantic: { queryVector: walkthroughVector[0], chunkVectors: realChunkVectors },
    })
  : null;

const shownNotices = [
  ...GOLDEN_CASES.flatMap((g) =>
    retrieveSimilarNotices(g.query, { limit: K, corpus: SEEDED_REGULATION_CORPUS }),
  ),
  ...docketQueries
    .slice(0, 60)
    .flatMap((q) =>
      retrieveSimilarNotices(chunkEmbeddingText(q.chunk), { limit: K, excludeIds: [q.chunk.id] }),
    ),
];
const withLabelOnlyTerms = shownNotices.filter(
  (n) => n.citationFaithfulness != null && n.citationFaithfulness < 1,
).length;

// --- Report ------------------------------------------------------------------------

function docketRow(label: string, s: DocketSummary): string {
  return `| ${label} | ${s.queries} | ${pct(s.recallAtK)} | ${s.mrr.toFixed(2)} | ${pct(s.gatedPrecision)} | ${pct(s.gatedRecall)} | ${s.gatedShown.toFixed(1)} | ${s.gatedEmpty} |`;
}
function goldenRow(label: string, s: Summary): string {
  return `| ${label} | ${s.cases} | ${pct(s.recallAtK)} | ${pct(s.precisionAtK)} | ${s.mrr.toFixed(2)} | ${s.forbiddenHitCases} | ${s.emptyResultCases} |`;
}

describe("RegLens retrieval eval", () => {
  it("writes the report", () => {
    const docketHeader = [
      `| Strategy | Queries | Recall@${DOCKET_K} (ranking) | MRR | Shown: precision | Shown: recall | Avg shown | Empty |`,
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ];
    const goldenHeader = [
      `| Strategy | Cases | Recall@${K} | Precision@${K} | MRR | Forbidden hits | Empty |`,
      "| --- | --- | --- | --- | --- | --- | --- |",
    ];
    const lines = [
      "# RegLens retrieval eval",
      "",
      "Generated by `npm run eval:rag`. Do not edit by hand.",
      "",
      "Strategies: `bm25` is the keyless default. `dense` (hashed tokens) and `hybrid` (dense + bm25, RRF) are kept as ablations. `embedding_only` and `embedding` (vectors + bm25, RRF) use " +
        `${EMBEDDING_MODEL} vectors from the committed cache${hasVectors ? "" : " — MISSING: run `npm run eval:rag:refresh` with GEMINI_API_KEY set"}.`,
      "",
      "## 1. Real notices: does a document retrieve its docket relatives?",
      "",
      `Corpus: ${FEDERAL_REGISTER_CORPUS.length} FMCSA documents from the Federal Register API (snapshot ${FEDERAL_REGISTER_FETCHED_AT}). Two documents are related when they share a docket id or RIN, so no label was written by hand. Each labelled document is the query and is excluded from its own results.`,
      "",
      "\"Ranking\" columns ignore the display cutoff. \"Shown\" columns measure what staff would see after the cutoff.",
      "",
      "### Rules and notices",
      "",
      ...docketHeader,
      ...STRATEGIES.map((s) => docketRow(s, docketOf("rules_and_notices", s))),
      "",
      "### Medical exemption series (reported separately)",
      "",
      "Epilepsy, hearing and similar exemption notices are near-identical boilerplate published under rolling dockets. Text similarity cannot tell which batch belongs to which docket, so every strategy scores low here. This is a limit of the label, and of text-only retrieval for this document type.",
      "",
      ...docketHeader,
      ...STRATEGIES.map((s) => docketRow(s, docketOf("medical_exemption_series", s))),
      "",
      "## 2. Hand-written queries over the 8-notice illustrative sample",
      "",
      `${GOLDEN_CASES.length} queries in \`src/lib/regulations/rag/eval/golden.ts\`. Keyword queries use the notices' vocabulary; paraphrase queries avoid it. The display cutoff was chosen while looking at this set, so treat these as in-sample; section 1 is the out-of-sample check.`,
      "",
      "### Keyword queries",
      "",
      ...goldenHeader,
      ...STRATEGIES.map((s) => goldenRow(s, byKind(golden.get(s)!, "keyword"))),
      "",
      "### Paraphrase queries",
      "",
      ...goldenHeader,
      ...STRATEGIES.map((s) => goldenRow(s, byKind(golden.get(s)!, "paraphrase"))),
      "",
      "## 3. Displayed overlap terms",
      "",
      `${shownNotices.length} notices shown across both sets with the keyless default. ${withLabelOnlyTerms} had a candidate term that matched an assigned label but not the notice text; those terms are not displayed.`,
      "",
      "## 4. Seeded walkthrough notice against the real corpus",
      "",
      `\`${sampleRegulation.id}\` is a fictional notice. Keyless: ${walkthroughKeyless.similarNotices.map((n) => `${short(n.chunk.id)} "${n.chunk.title.slice(0, 60)}"`).join("; ") || "none"}.`,
      ...(walkthroughEmbedding
        ? [
            "",
            `Embedding: ${walkthroughEmbedding.similarNotices.map((n) => `${short(n.chunk.id)} "${n.chunk.title.slice(0, 60)}" (${n.semanticScore?.toFixed(2)})`).join("; ") || "none"}.`,
          ]
        : []),
      "",
    ];
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, lines.join("\n"));

    // Same numbers, for the in-app retrieval quality page.
    writeFileSync(
      JSON_PATH,
      `${JSON.stringify(
        {
          model: EMBEDDING_MODEL,
          hasVectors,
          corpus: { size: FEDERAL_REGISTER_CORPUS.length, fetchedAt: FEDERAL_REGISTER_FETCHED_AT },
          docketK: DOCKET_K,
          goldenK: K,
          docket: STRATA.map((stratum) => ({
            stratum,
            rows: STRATEGIES.map((strategy) => ({ strategy, ...docketOf(stratum, strategy) })),
          })),
          golden: (["keyword", "paraphrase"] as const).map((kind) => ({
            kind,
            rows: STRATEGIES.map((strategy) => ({ strategy, ...byKind(golden.get(strategy)!, kind) })),
          })),
          goldenCases: GOLDEN_CASES.map((g, i) => ({
            id: g.id,
            kind: g.kind,
            query: g.query,
            relevant: g.relevant,
            bm25: golden.get("bm25")![i].retrieved,
            embedding: golden.get("embedding")?.[i].retrieved ?? null,
          })),
        },
        null,
        1,
      )}\n`,
    );
  });

  it("has cached vectors for both corpora and the golden set", () => {
    // If this fails, a corpus or the golden set changed: run `npm run eval:rag:refresh`.
    expect(hasVectors).toBe(true);
  });

  it("keyless retrieval finds docket relatives in real notices", () => {
    const bm25 = docketOf("rules_and_notices", "bm25");
    expect(bm25.mrr).toBeGreaterThanOrEqual(0.9);
    expect(bm25.gatedPrecision).toBeGreaterThanOrEqual(0.85);
    expect(bm25.gatedRecall).toBeGreaterThanOrEqual(0.8);
  });

  it("embedding retrieval finds docket relatives in real notices", () => {
    if (!hasVectors) return;
    const embedding = docketOf("rules_and_notices", "embedding");
    expect(embedding.mrr).toBeGreaterThanOrEqual(0.9);
    expect(embedding.gatedPrecision).toBeGreaterThanOrEqual(0.85);
    expect(embedding.gatedRecall).toBeGreaterThanOrEqual(0.85);
    expect(embedding.gatedEmpty).toBe(0);
  });

  it("keyless retrieval holds on keyword queries and returns nothing forbidden", () => {
    const bm25 = golden.get("bm25")!;
    expect(byKind(bm25, "keyword").recallAtK).toBeGreaterThanOrEqual(0.8);
    expect(byKind(bm25, "keyword").mrr).toBeGreaterThanOrEqual(0.95);
    expect(summarize(bm25).forbiddenHitCases).toBe(0);
  });

  it("embedding retrieval recovers paraphrased queries", () => {
    if (!hasVectors) return;
    const embedding = golden.get("embedding")!;
    expect(byKind(embedding, "paraphrase").recallAtK).toBeGreaterThanOrEqual(0.9);
    expect(byKind(embedding, "keyword").recallAtK).toBeGreaterThanOrEqual(0.9);
    expect(summarize(embedding).precisionAtK).toBeGreaterThanOrEqual(0.9);
    expect(summarize(embedding).forbiddenHitCases).toBe(0);
  });

  it("only displays overlap terms attested in the notice text", () => {
    for (const notice of shownNotices) {
      const source = new Set(tokenizeRegulationText(noticeSourceText(notice.chunk)));
      for (const term of notice.overlapTerms) {
        const attested = tokenizeRegulationText(term).every((token) => source.has(token));
        expect(attested, `${notice.chunk.id}: "${term}"`).toBe(true);
      }
    }
  });

  it("the demo walkthrough notice shows its sample relatives and never itself", () => {
    const ids = buildRegulationRagResult({
      regulation: sampleRegulation,
      corpus: DEMO_CORPUS,
    }).similarNotices.map((n) => n.chunk.id);
    expect(ids).toContain("corpus_eld-mandate-refresh");
    expect(ids).not.toContain("corpus_new-entrant-packet");
  });

  it("keyless retrieval shows nothing when no notice is close", () => {
    // The fictional walkthrough notice has no relatives among real notices.
    expect(walkthroughKeyless.similarNotices).toEqual([]);
  });
});
