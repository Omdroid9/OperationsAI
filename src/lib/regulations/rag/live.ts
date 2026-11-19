import {
  embedWithGemini,
  type EmbedFn,
} from "@/lib/regulations/rag/gemini-embeddings";
import {
  PRODUCT_CORPUS,
  buildRegulationRagResult,
  chunkEmbeddingText,
  regulationEmbeddingText,
  regulationToChunk,
} from "@/lib/regulations/rag/retrieve";
import type { RegulationChunk, RegulationRagResult } from "@/lib/regulations/rag/types";
import { storedVector } from "@/lib/regulations/rag/vector-cache";
import type { Regulation, RegulationMatch } from "@/types";

/** Notice vectors kept for the life of the server process, keyed by embedded text. */
const documentVectorCache = new Map<string, Float32Array>();
const MAX_CACHED_VECTORS = 2_000;

async function documentVectors(texts: string[], embed: EmbedFn): Promise<Float32Array[]> {
  // Indexed notices ship with committed vectors; only new text reaches the provider.
  for (const text of texts) {
    if (documentVectorCache.has(text)) continue;
    const stored = storedVector(text, "RETRIEVAL_DOCUMENT");
    if (stored) documentVectorCache.set(text, stored);
  }
  const missing = [...new Set(texts.filter((text) => !documentVectorCache.has(text)))];
  if (missing.length > 0) {
    const fresh = await embed(missing, "RETRIEVAL_DOCUMENT");
    if (documentVectorCache.size + missing.length > MAX_CACHED_VECTORS) {
      documentVectorCache.clear();
    }
    missing.forEach((text, i) => documentVectorCache.set(text, fresh[i]));
  }
  return texts.map((text) => documentVectorCache.get(text)!);
}

export type LiveRagOutcome = {
  result: RegulationRagResult;
  /** True when model embeddings ranked the notices; false when lexical retrieval was used. */
  live: boolean;
  error?: string;
};

/**
 * Embedding-backed similar notices, with lexical retrieval as the fallback.
 * Any provider failure (no key, timeout, bad response) returns the lexical result
 * and says so; it never throws.
 */
export async function buildRegulationRagResultLive(
  input: {
    regulation: Regulation;
    matches?: RegulationMatch[];
    workspaceRegulations?: Regulation[];
    limit?: number;
    corpus?: RegulationChunk[];
  },
  embed: EmbedFn = embedWithGemini,
): Promise<LiveRagOutcome> {
  try {
    const chunks = [
      ...(input.corpus ?? PRODUCT_CORPUS),
      ...(input.workspaceRegulations ?? [])
        .filter((item) => item.id !== input.regulation.id)
        .filter((item) => item.sourceText.trim() || item.sourceSummary.trim())
        .map(regulationToChunk),
    ];
    // The notice under review is embedded the same way as the index: similarity
    // between two notices is symmetric, and this is the setup the eval measures.
    const [vectors, [queryVector]] = await Promise.all([
      documentVectors(chunks.map(chunkEmbeddingText), embed),
      documentVectors([regulationEmbeddingText(input.regulation)], embed),
    ]);
    const chunkVectors = new Map(chunks.map((chunk, i) => [chunk.id, vectors[i]]));
    const result = buildRegulationRagResult({
      ...input,
      semantic: { queryVector, chunkVectors },
    });
    return { result, live: result.method === "hybrid_bm25_embedding_rrf" };
  } catch (error) {
    return {
      result: buildRegulationRagResult(input),
      live: false,
      error: error instanceof Error ? error.message : "Embedding request failed",
    };
  }
}
