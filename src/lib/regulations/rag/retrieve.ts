import { SEEDED_REGULATION_CORPUS } from "@/lib/regulations/rag/corpus";
import {
  cosineSimilarity,
  embedText,
  overlapTerms,
  tokenizeRegulationText,
} from "@/lib/regulations/rag/embed";
import type {
  MatchGrounding,
  RegulationChunk,
  RegulationRagResult,
  RetrievedNotice,
} from "@/lib/regulations/rag/types";
import type { Regulation, RegulationMatch } from "@/types";

const DEFAULT_LIMIT = 4;
const MIN_SCORE = 0.18;
const MIN_DOMAIN_OVERLAP = 1;

const DOMAIN_TERMS = new Set([
  "new_entrant",
  "eld",
  "hours_of_service",
  "small_fleet",
  "interstate",
  "california",
  "ifta",
  "irp",
  "clearinghouse",
  "hazmat",
  "authority",
  "recordkeeping",
  "driver_qualification",
  "financial_responsibility",
]);

type IndexedChunk = {
  chunk: RegulationChunk;
  vector: Float32Array;
  searchable: string;
};

function chunkSearchText(chunk: RegulationChunk): string {
  // Repeat high-signal fields so category/segment/tags dominate over generic prose.
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

function regulationSearchText(regulation: Pick<
  Regulation,
  "title" | "category" | "affectedSegment" | "requiredAction" | "sourceSummary" | "sourceText"
>): string {
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

function regulationToChunk(regulation: Regulation): RegulationChunk {
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

function whyRelated(score: number, terms: string[]): string {
  if (terms.length === 0) {
    return "Lexical overlap with the seeded notice index. Review recommended — not a legal finding.";
  }
  const shown = terms.slice(0, 4).join(", ");
  const strength = score >= 0.35 ? "Strong" : score >= 0.2 ? "Moderate" : "Weak";
  return `${strength} overlap on: ${shown}. Review recommended — not a legal finding.`;
}

let seededIndex: IndexedChunk[] | null = null;

function getSeededIndex(): IndexedChunk[] {
  if (seededIndex) return seededIndex;
  seededIndex = SEEDED_REGULATION_CORPUS.map((chunk) => {
    const searchable = chunkSearchText(chunk);
    return { chunk, searchable, vector: embedText(searchable) };
  });
  return seededIndex;
}

function buildIndex(
  extras: RegulationChunk[] = [],
  excludeIds: Set<string> = new Set(),
): IndexedChunk[] {
  const byId = new Map<string, IndexedChunk>();
  for (const item of getSeededIndex()) {
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
  },
): RetrievedNotice[] {
  const query = queryText.trim();
  if (!query) return [];

  const exclude = new Set(options?.excludeIds ?? []);
  const extras = (options?.workspaceRegulations ?? [])
    .filter((item) => item.sourceText.trim() || item.sourceSummary.trim())
    .map(regulationToChunk)
    .filter((chunk) => !exclude.has(chunk.id));

  // Also exclude corpus twin of the active seeded regulation when title matches closely.
  const index = buildIndex(extras, exclude);
  const queryVector = embedText(query);

  const queryTokens = new Set(tokenizeRegulationText(query));

  return index
    .map((item) => {
      const base = cosineSimilarity(queryVector, item.vector);
      const terms = overlapTerms(query, item.searchable);
      // Domain gating uses tags/segment/category only — not generic body prose.
      const domainField = [
        item.chunk.category,
        item.chunk.affectedSegment,
        item.chunk.tags.join(" "),
        item.chunk.title,
      ].join(" ");
      const uniqueDomain = [
        ...new Set(
          tokenizeRegulationText(domainField).filter(
            (token) => DOMAIN_TERMS.has(token) && queryTokens.has(token),
          ),
        ),
      ];
      const score = Math.min(1, base + uniqueDomain.length * 0.08);
      return {
        chunk: item.chunk,
        score,
        overlapTerms: uniqueDomain.length > 0
          ? [...uniqueDomain.map((token) => token.replaceAll("_", " ")), ...terms.filter((t) => !uniqueDomain.map((d) => d.replaceAll("_", " ")).includes(t))].slice(0, 6)
          : terms,
        whyRelated: whyRelated(score, terms),
        domainCount: uniqueDomain.length,
      };
    })
    .filter(
      (item) =>
        item.score >= MIN_SCORE &&
        item.overlapTerms.length > 0 &&
        item.domainCount >= MIN_DOMAIN_OVERLAP,
    )
    .sort((a, b) => b.score - a.score || b.domainCount - a.domainCount)
    .slice(0, options?.limit ?? DEFAULT_LIMIT)
    .map(({ domainCount: _domainCount, ...item }) => item satisfies RetrievedNotice);
}

function groundMatches(
  matches: RegulationMatch[],
  similar: RetrievedNotice[],
): MatchGrounding[] {
  const topIds = similar.slice(0, 3).map((item) => item.chunk.id);
  return matches
    .filter((match) => match.matchType !== "unknown")
    .map((match) => ({
      carrierId: match.carrierId,
      matchType: match.matchType,
      profileReason: match.reason,
      supportingNoticeIds: topIds,
      reviewRecommended: true,
    }));
}

export function buildRegulationRagResult(input: {
  regulation: Regulation;
  matches?: RegulationMatch[];
  workspaceRegulations?: Regulation[];
  limit?: number;
}): RegulationRagResult {
  const { regulation } = input;
  const queryText = regulationSearchText(regulation);
  const excludeIds = [
    regulation.id,
    `workspace_${regulation.id}`,
    // Prefer other corpus neighbors over the exact seeded twin of this notice.
    regulation.id === "reg_new-entrant-packet" ? "corpus_new-entrant-packet" : "",
  ].filter(Boolean);

  const similarNotices = retrieveSimilarNotices(queryText, {
    limit: input.limit,
    excludeIds,
    workspaceRegulations: (input.workspaceRegulations ?? []).filter(
      (item) => item.id !== regulation.id,
    ),
  });

  return {
    regulationId: regulation.id,
    queryText,
    method: "lexical_seeded_index",
    similarNotices,
    matchGrounding: groundMatches(input.matches ?? [], similarNotices),
    disclaimer:
      "Similar notices are retrieved from a seeded index by lexical overlap. They suggest possible relevance for staff review and do not prove noncompliance or required action.",
  };
}

export function emptyRegulationRagResult(regulationId: string): RegulationRagResult {
  return {
    regulationId,
    queryText: "",
    method: "lexical_seeded_index",
    similarNotices: [],
    matchGrounding: [],
    disclaimer:
      "Similar notices are retrieved from a seeded index by lexical overlap. They suggest possible relevance for staff review and do not prove noncompliance or required action.",
  };
}
