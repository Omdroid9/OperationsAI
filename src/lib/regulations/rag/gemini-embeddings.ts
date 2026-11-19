/**
 * Gemini text embeddings for RegLens retrieval (server-side only).
 *
 * Uses gemini-embedding-001 with asymmetric task types. Vectors are truncated to
 * 768 dimensions (Matryoshka) and re-normalized here, which this model requires
 * for any size below its native 3072.
 * Docs: https://ai.google.dev/gemini-api/docs/embeddings
 */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_BATCH = 100;
const MAX_CHARS = 8_000;

export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export type EmbedFn = (
  texts: string[],
  task: EmbeddingTask,
) => Promise<Float32Array[]>;

export function normalizeVector(values: number[]): Float32Array {
  const vector = Float32Array.from(values);
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
  return vector;
}

async function embedBatch(
  apiKey: string,
  texts: string[],
  task: EmbeddingTask,
): Promise<Float32Array[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text: text.slice(0, MAX_CHARS) }] },
            taskType: task,
            outputDimensionality: EMBEDDING_DIMENSIONS,
          })),
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini embeddings ${response.status}: ${detail.slice(0, 200)}`);
    }
    const payload = (await response.json()) as {
      embeddings?: Array<{ values?: number[] }>;
    };
    const embeddings = payload.embeddings ?? [];
    if (
      embeddings.length !== texts.length ||
      embeddings.some((item) => item.values?.length !== EMBEDDING_DIMENSIONS)
    ) {
      throw new Error("Gemini embeddings returned an unexpected shape.");
    }
    return embeddings.map((item) => normalizeVector(item.values!));
  } finally {
    clearTimeout(timer);
  }
}

/** Throws on any failure; callers fall back to lexical retrieval. */
export const embedWithGemini: EmbedFn = async (texts, task) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    out.push(...(await embedBatch(apiKey, texts.slice(i, i + MAX_BATCH), task)));
  }
  return out;
};
