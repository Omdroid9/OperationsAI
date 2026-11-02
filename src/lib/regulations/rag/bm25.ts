import { tokenizeRegulationText } from "@/lib/regulations/rag/embed";

/**
 * Okapi BM25 over an in-memory tokenized corpus.
 * Complements dense lexical embeddings for hybrid RegLens retrieval.
 */
export type Bm25Document = {
  id: string;
  tokens: string[];
};

export type Bm25Index = {
  docs: Bm25Document[];
  df: Map<string, number>;
  avgdl: number;
  N: number;
};

export function buildBm25Index(
  entries: Array<{ id: string; text: string }>,
): Bm25Index {
  const docs = entries.map((entry) => ({
    id: entry.id,
    tokens: tokenizeRegulationText(entry.text),
  }));
  const df = new Map<string, number>();
  let totalLen = 0;
  for (const doc of docs) {
    totalLen += doc.tokens.length;
    const unique = new Set(doc.tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  return {
    docs,
    df,
    avgdl: docs.length === 0 ? 0 : totalLen / docs.length,
    N: docs.length,
  };
}

export function bm25Scores(
  index: Bm25Index,
  query: string,
  options?: { k1?: number; b?: number },
): Map<string, number> {
  const k1 = options?.k1 ?? 1.2;
  const b = options?.b ?? 0.75;
  const queryTokens = tokenizeRegulationText(query);
  const scores = new Map<string, number>();
  if (queryTokens.length === 0 || index.N === 0) return scores;

  for (const doc of index.docs) {
    const tf = new Map<string, number>();
    for (const token of doc.tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    let score = 0;
    for (const token of queryTokens) {
      const freq = tf.get(token) ?? 0;
      if (freq === 0) continue;
      const docFreq = index.df.get(token) ?? 0;
      const idf = Math.log(1 + (index.N - docFreq + 0.5) / (docFreq + 0.5));
      const denom = freq + k1 * (1 - b + b * (doc.tokens.length / (index.avgdl || 1)));
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    if (score > 0) scores.set(doc.id, score);
  }
  return scores;
}

export function rankedIds(scores: Map<string, number>): string[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
