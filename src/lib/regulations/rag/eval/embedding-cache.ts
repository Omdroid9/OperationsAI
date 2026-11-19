import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  embedWithGemini,
  type EmbeddingTask,
} from "@/lib/regulations/rag/gemini-embeddings";
import {
  decodeVector,
  encodeVector,
  vectorKey,
  type VectorFile,
} from "@/lib/regulations/rag/vector-cache";

const CACHE_PATH = resolve(
  process.cwd(),
  `src/lib/regulations/rag/data/embeddings.${EMBEDDING_MODEL}.json`,
);

const REFRESH_BATCH = 20;
const RATE_LIMIT_WAIT_MS = 62_000;
const MAX_RATE_LIMIT_RETRIES = 6;

/** The free tier limits embeddings per minute; wait out a 429 instead of failing. */
async function embedWithBackoff(texts: string[], task: EmbeddingTask): Promise<Float32Array[]> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await embedWithGemini(texts, task);
    } catch (error) {
      const rateLimited = error instanceof Error && error.message.includes(" 429");
      if (!rateLimited || attempt >= MAX_RATE_LIMIT_RETRIES) throw error;
      await new Promise((done) => setTimeout(done, RATE_LIMIT_WAIT_MS));
    }
  }
}

function load(): VectorFile {
  const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as VectorFile;
  if (parsed.model === EMBEDDING_MODEL && parsed.dimensions === EMBEDDING_DIMENSIONS) return parsed;
  return { model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, vectors: {} };
}

/**
 * Vectors from the committed file, fetching uncached texts only when `refresh` is on.
 * Returns null when a text is uncached and refresh is off.
 */
export async function cachedEmbeddings(
  texts: string[],
  task: EmbeddingTask,
  options: { refresh: boolean },
): Promise<Float32Array[] | null> {
  const cache = load();
  const missing = [...new Set(texts.filter((text) => !cache.vectors[vectorKey(text, task)]))];
  if (missing.length > 0) {
    if (!options.refresh) return null;
    // Small batches, saved as they land, so a rate limit never loses progress.
    for (let i = 0; i < missing.length; i += REFRESH_BATCH) {
      const batch = missing.slice(i, i + REFRESH_BATCH);
      const fresh = await embedWithBackoff(batch, task);
      batch.forEach((text, j) => {
        cache.vectors[vectorKey(text, task)] = encodeVector(fresh[j]);
      });
      const sorted = Object.fromEntries(
        Object.entries(cache.vectors).sort(([x], [y]) => x.localeCompare(y)),
      );
      writeFileSync(CACHE_PATH, `${JSON.stringify({ ...cache, vectors: sorted })}\n`);
    }
  }
  return texts.map((text) => decodeVector(cache.vectors[vectorKey(text, task)]));
}
