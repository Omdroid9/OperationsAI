import { FEDERAL_REGISTER_CORPUS } from "@/lib/regulations/rag/corpus-federal-register";
import {
  buildBm25Index,
  bm25Scores,
  bm25SelfScore,
  rankedIds,
  type Bm25Index,
} from "@/lib/regulations/rag/bm25";
import { SEEDED_REGULATION_CORPUS } from "@/lib/regulations/rag/corpus";
import {
  cosineSimilarity,
  embedText,
  tokenizeRegulationText,
} from "@/lib/regulations/rag/embed";
import { checkTermsAgainstSource } from "@/lib/regulations/rag/faithfulness";
import { reciprocalRankFusion } from "@/lib/regulations/rag/rrf";
import type {
  MatchGrounding,
  RegulationChunk,
  RegulationRagResult,
  RetrievedNotice,
} from "@/lib/regulations/rag/types";
import type { Regulation, RegulationMatch } from "@/types";

const DEFAULT_LIMIT = 4;
const RRF_K = 60;
const CANDIDATE_POOL = 12;

/**
 * Keyless floor: below it nothing is shown, so a notice with no relatives gets an
 * empty panel instead of its nearest unrelated neighbour.
 *
 * A notice passes when it covers at least this share of the query's BM25 term
 * weight, or the query covers this share of the notice's (whichever is larger, so
 * a long pasted notice can still match a short abstract). On real notices, docket
 * relatives score 0.38 and up (median 0.83); the unrelated results this was added
 * to remove scored about 0.11. The value sits between and is in-sample.
 *
 * There is no embedding floor. Notice-to-notice cosines run from about 0.87
 * (same topic) to 0.95+ (same docket), while unrelated nearest neighbours reach
 * 0.89, so no value separates them. With embeddings the nearest notice is always
 * shown and staff review decides.
 */
export const BM25_MIN_SHARE = 0.2;
/** A term found in more than this share of notices says nothing about why two are related. */
const MAX_TERM_DOCUMENT_SHARE = 0.2;
const MAX_DISPLAY_TERMS = 6;

/**
 * bm25 is the keyless default. dense (hashed tokens) and hybrid (dense + bm25)
 * are kept for the eval ablation: on real notices they rank below bm25 alone.
 * embedding (model vectors + BM25, fused) and embedding_only need `semantic` vectors.
 */
export type RetrievalStrategy = "hybrid" | "dense" | "bm25" | "embedding" | "embedding_only";

/** Unit-length model vectors for the query and for chunks, keyed by chunk id. */
export type SemanticVectors = {
  queryVector: Float32Array;
  chunkVectors: Map<string, Float32Array>;
};

/**
 * Which notices are close enough to show, for embedding and BM25 scores alike.
 *
 * Neither score has a stable scale: embedding cosines sit in a narrow band that
 * moves with query length, and BM25 grows with it. A fixed threshold therefore
 * does not separate related from unrelated notices. Instead, cut at the largest
 * score drop among the top `limit` notices and keep everything above it. The rule
 * has no tuned constant and no hand-written term list. It always keeps at least
 * the nearest scored notice, so staff review is still required.
 * Measured in docs/research/eval-latest.md.
 */
export function semanticCutoffIds(scores: Map<string, number>, limit: number): Set<string> {
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return new Set();
  let cut = 1;
  let largestDrop = 0;
  for (let i = 0; i < Math.min(limit, ranked.length - 1); i += 1) {
    const drop = ranked[i][1] - ranked[i + 1][1];
    if (drop > largestDrop) {
      largestDrop = drop;
      cut = i + 1;
    }
  }
  return new Set(ranked.slice(0, cut).map(([id]) => id));
}

type IndexedChunk = {
  chunk: RegulationChunk;
  vector: Float32Array;
  searchable: string;
};

function chunkSearchText(chunk: RegulationChunk): string {
  return [
    chunk.title,
    chunk.title,
    chunk.category,
    chunk.category,
    chunk.affectedSegment,
    chunk.affectedSegment,
    chunk.affectedSegment,
    chunk.requiredAction,
    chunk.tags.join(" "),
    chunk.tags.join(" "),
    chunk.summary,
    chunk.body,
  ].join("\n");
}

function regulationSearchText(
  regulation: Pick<
    Regulation,
    "title" | "category" | "affectedSegment" | "requiredAction" | "sourceSummary" | "sourceText"
  >,
): string {
  return [
    regulation.title,
    regulation.title,
    regulation.category,
    regulation.category,
    regulation.affectedSegment,
    regulation.affectedSegment,
    regulation.affectedSegment,
    regulation.requiredAction,
    regulation.sourceSummary,
    regulation.sourceText,
  ].join("\n");
}

export function regulationToChunk(regulation: Regulation): RegulationChunk {
  return {
    id: `workspace_${regulation.id}`,
    title: regulation.title,
    agency: regulation.agency,
    category: regulation.category,
    documentNumber: regulation.documentNumber ?? null,
    publishedDate: regulation.publishedDate,
    affectedSegment: regulation.affectedSegment,
    requiredAction: regulation.requiredAction,
    summary: regulation.sourceSummary,
    body: regulation.sourceText || regulation.sourceSummary,
    tags: [regulation.category, regulation.affectedSegment].filter(Boolean),
    source: "workspace",
    sourceUrl: regulation.sourceUrl,
  };
}

/** Natural-language text sent to the embedding model for a notice. */
export function chunkEmbeddingText(chunk: RegulationChunk): string {
  return [chunk.title, chunk.affectedSegment, chunk.requiredAction, chunk.summary, chunk.body]
    .filter(Boolean)
    .join("\n");
}

export function regulationEmbeddingText(regulation: Regulation): string {
  return chunkEmbeddingText(regulationToChunk(regulation));
}

function whyRelated(terms: string[], usesEmbedding: boolean): string {
  if (terms.length === 0) {
    return usesEmbedding
      ? "Similar in meaning to this notice's text; no shared key terms. Review recommended — not a legal finding."
      : "Shares wording with this notice. Review recommended — not a legal finding.";
  }
  return `Shares terms with this notice: ${terms.slice(0, 4).join(", ")}. Review recommended — not a legal finding.`;
}

/** The index product code retrieves from: published Federal Register documents. */
export const PRODUCT_CORPUS: RegulationChunk[] = FEDERAL_REGISTER_CORPUS;

/**
 * Demo Mode adds the illustrative sample notices so the fictional walkthrough
 * notice has relatives to show. They are labelled "Sample" wherever displayed.
 */
export const DEMO_CORPUS: RegulationChunk[] = [
  ...SEEDED_REGULATION_CORPUS,
  ...FEDERAL_REGISTER_CORPUS,
];

/** Terms the query and notice share, rarest first, skipping ones common to the whole index. */
function informativeSharedTerms(
  queryTokens: Set<string>,
  searchable: string,
  bm25Index: Bm25Index,
): string[] {
  const shared = [...new Set(tokenizeRegulationText(searchable))].filter((token) =>
    queryTokens.has(token),
  );
  const maxDf = bm25Index.N >= 20 ? bm25Index.N * MAX_TERM_DOCUMENT_SHARE : Infinity;
  return shared
    .map((token) => ({ token, df: bm25Index.df.get(token) ?? 0 }))
    .filter((item) => item.df <= maxDf)
    .sort((a, b) => a.df - b.df || a.token.localeCompare(b.token))
    .slice(0, MAX_DISPLAY_TERMS)
    .map((item) => item.token.replaceAll("_", " "));
}

const indexedCorpora = new WeakMap<RegulationChunk[], IndexedChunk[]>();

function getCorpusIndex(corpus: RegulationChunk[]): IndexedChunk[] {
  let indexed = indexedCorpora.get(corpus);
  if (!indexed) {
    indexed = corpus.map((chunk) => {
      const searchable = chunkSearchText(chunk);
      return { chunk, searchable, vector: embedText(searchable) };
    });
    indexedCorpora.set(corpus, indexed);
  }
  return indexed;
}

function buildIndex(
  corpus: RegulationChunk[],
  extras: RegulationChunk[] = [],
  excludeIds: Set<string> = new Set(),
): IndexedChunk[] {
  const byId = new Map<string, IndexedChunk>();
  for (const item of getCorpusIndex(corpus)) {
    if (excludeIds.has(item.chunk.id)) continue;
    byId.set(item.chunk.id, item);
  }
  for (const chunk of extras) {
    if (excludeIds.has(chunk.id)) continue;
    const searchable = chunkSearchText(chunk);
    byId.set(chunk.id, { chunk, searchable, vector: embedText(searchable) });
  }
  return [...byId.values()];
}

export function retrieveSimilarNotices(
  queryText: string,
  options?: {
    limit?: number;
    excludeIds?: string[];
    workspaceRegulations?: Regulation[];
    /** Ablation switch for the eval harness. Defaults to embedding when vectors are given, else bm25. */
    strategy?: RetrievalStrategy;
    semantic?: SemanticVectors;
    /** Notices to search. Defaults to the product corpus. */
    corpus?: RegulationChunk[];
    /** Eval only: false returns the fused ranking without the relevance gate. */
    gate?: boolean;
  },
): RetrievedNotice[] {
  const query = queryText.trim();
  if (!query) return [];

  const exclude = new Set(options?.excludeIds ?? []);
  const extras = (options?.workspaceRegulations ?? [])
    .filter((item) => item.sourceText.trim() || item.sourceSummary.trim())
    .map(regulationToChunk)
    .filter((chunk) => !exclude.has(chunk.id));

  const index = buildIndex(options?.corpus ?? PRODUCT_CORPUS, extras, exclude);
  if (index.length === 0) return [];

  const queryVector = embedText(query);
  const queryTokens = new Set(tokenizeRegulationText(query));

  const denseScores = new Map<string, number>();
  for (const item of index) {
    denseScores.set(item.chunk.id, cosineSimilarity(queryVector, item.vector));
  }
  const denseRanking = rankedIds(denseScores).slice(0, CANDIDATE_POOL);

  const bm25Index = buildBm25Index(
    index.map((item) => ({ id: item.chunk.id, text: item.searchable })),
  );
  const bm25 = bm25Scores(bm25Index, query);
  const bm25Ranking = rankedIds(bm25).slice(0, CANDIDATE_POOL);

  const semantic = options?.semantic;
  const semanticScores = new Map<string, number>();
  if (semantic) {
    for (const item of index) {
      const vector = semantic.chunkVectors.get(item.chunk.id);
      if (vector) {
        semanticScores.set(item.chunk.id, cosineSimilarity(semantic.queryVector, vector));
      }
    }
  }
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const semanticRanking = rankedIds(semanticScores).slice(0, CANDIDATE_POOL);

  const requested = options?.strategy ?? (semantic ? "embedding" : "bm25");
  // Without vectors an embedding strategy cannot run; use the lexical path.
  const strategy: RetrievalStrategy =
    semanticScores.size === 0 && (requested === "embedding" || requested === "embedding_only")
      ? "bm25"
      : requested;
  const usesEmbedding = strategy === "embedding" || strategy === "embedding_only";
  const rankings =
    strategy === "dense"
      ? [denseRanking]
      : strategy === "bm25"
        ? [bm25Ranking]
        : strategy === "embedding_only"
          ? [semanticRanking]
          : strategy === "embedding"
            ? [semanticRanking, bm25Ranking]
            : [denseRanking, bm25Ranking];
  const rrfScores = reciprocalRankFusion(rankings, { k: RRF_K });
  const fusedIds = [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // The gate reads the score that best reflects the strategy's own notion of closeness.
  const gateScores = usesEmbedding ? semanticScores : strategy === "dense" ? denseScores : bm25;
  const keep = semanticCutoffIds(gateScores, limit);
  const topBm25 = Math.max(0, ...bm25.values());
  const selfBm25 = bm25SelfScore(bm25Index, query);
  const byId = new Map(index.map((item) => [item.chunk.id, item]));
  const aboveFloor = (id: string): boolean => {
    if (usesEmbedding || strategy === "dense") return true;
    const score = bm25.get(id) ?? 0;
    const selfNotice = bm25SelfScore(bm25Index, byId.get(id)?.searchable ?? "");
    const share = Math.max(
      selfBm25 > 0 ? score / selfBm25 : 0,
      selfNotice > 0 ? score / selfNotice : 0,
    );
    return share >= BM25_MIN_SHARE;
  };

  return fusedIds
    .filter((id) => options?.gate === false || (keep.has(id) && aboveFloor(id)))
    .slice(0, limit)
    .map((id) => {
      const item = byId.get(id)!;
      const bm25Score = bm25.get(id) ?? 0;
      const semanticScore = usesEmbedding ? semanticScores.get(id) : undefined;
      const candidates = informativeSharedTerms(queryTokens, item.searchable, bm25Index);
      const checked = checkTermsAgainstSource(candidates, item.chunk);
      return {
        chunk: item.chunk,
        // Closeness on the strategy's own scale: cosine, or BM25 relative to the best match.
        score: semanticScore ?? (topBm25 > 0 ? bm25Score / topBm25 : 0),
        denseScore: denseScores.get(id) ?? 0,
        bm25Score,
        rrfScore: rrfScores.get(id) ?? 0,
        overlapTerms: checked.supported,
        unattestedTerms: checked.unsupported,
        whyRelated: whyRelated(checked.supported, usesEmbedding),
        citationFaithfulness: candidates.length === 0 ? null : checked.score,
        ...(semanticScore != null ? { semanticScore } : {}),
      } satisfies RetrievedNotice;
    });
}

const LEXICAL_DISCLAIMER =
  "Similar notices are ranked by shared terms (BM25). Displayed overlap terms are checked against each notice's text. They suggest possible relevance for staff review and do not prove noncompliance or required action.";
const EMBEDDING_DISCLAIMER =
  "Similar notices are ranked by embedding similarity and BM25, fused by reciprocal rank fusion. Displayed overlap terms are checked against each notice's text; a notice matched on meaning alone has no terms to check. They suggest possible relevance for staff review and do not prove noncompliance or required action.";

/** A notice is not "similar" to itself: match on document number, else on title. */
function isSameNotice(regulation: Regulation, chunk: RegulationChunk): boolean {
  if (regulation.documentNumber && chunk.documentNumber) {
    return regulation.documentNumber === chunk.documentNumber;
  }
  const normalize = (value: string) => tokenizeRegulationText(value).join(" ");
  return normalize(regulation.title) === normalize(chunk.title);
}

function groundMatches(
  matches: RegulationMatch[],
  similar: RetrievedNotice[],
): MatchGrounding[] {
  const top = similar.slice(0, 3);
  return matches
    .filter((match) => match.matchType !== "unknown")
    .map((match) => ({
      carrierId: match.carrierId,
      matchType: match.matchType,
      profileReason: match.reason,
      supportingNoticeIds: top.map((item) => item.chunk.id),
      supportingTitles: top.map((item) => item.chunk.title),
      reviewRecommended: true,
    }));
}

export function buildRegulationRagResult(input: {
  regulation: Regulation;
  matches?: RegulationMatch[];
  workspaceRegulations?: Regulation[];
  limit?: number;
  /** Model vectors for this regulation and the index. Omit for lexical retrieval. */
  semantic?: SemanticVectors;
  corpus?: RegulationChunk[];
}): RegulationRagResult {
  const { regulation } = input;
  const corpus = input.corpus ?? PRODUCT_CORPUS;
  const queryText = regulationSearchText(regulation);
  const excludeIds = [
    regulation.id,
    `workspace_${regulation.id}`,
    ...corpus.filter((chunk) => isSameNotice(regulation, chunk)).map(
      (chunk) => chunk.id,
    ),
  ];

  const similarNotices = retrieveSimilarNotices(queryText, {
    limit: input.limit,
    semantic: input.semantic,
    corpus,
    excludeIds,
    workspaceRegulations: (input.workspaceRegulations ?? []).filter(
      (item) => item.id !== regulation.id,
    ),
  });

  const usedEmbedding = similarNotices.some((notice) => notice.semanticScore != null);

  return {
    regulationId: regulation.id,
    queryText,
    method: usedEmbedding ? "hybrid_bm25_embedding_rrf" : "bm25",
    similarNotices,
    matchGrounding: groundMatches(input.matches ?? [], similarNotices),
    disclaimer: usedEmbedding ? EMBEDDING_DISCLAIMER : LEXICAL_DISCLAIMER,
  };
}

export function emptyRegulationRagResult(regulationId: string): RegulationRagResult {
  return {
    regulationId,
    queryText: "",
    method: "bm25",
    similarNotices: [],
    matchGrounding: [],
    disclaimer: LEXICAL_DISCLAIMER,
  };
}
