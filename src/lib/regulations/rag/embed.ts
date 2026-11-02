const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "this",
  "must",
  "should",
  "may",
  "not",
  "their",
  "they",
  "when",
  "where",
  "which",
  "will",
]);

/** Domain phrases kept as single tokens so ELD / New Entrant overlap is stable. */
const PHRASES: Array<[RegExp, string]> = [
  [/\bnew\s+entrant\b/gi, "new_entrant"],
  [/\belectronic\s+logging\s+device\b/gi, "eld"],
  [/\bhours[\s-]+of[\s-]+service\b/gi, "hours_of_service"],
  [/\bsmall\s+fleet\b/gi, "small_fleet"],
  [/\bdriver\s+qualification\b/gi, "driver_qualification"],
  [/\bfinancial\s+responsibility\b/gi, "financial_responsibility"],
  [/\bclearinghouse\b/gi, "clearinghouse"],
];

export const EMBEDDING_DIM = 256;

export function tokenizeRegulationText(input: string): string[] {
  let text = input.toLowerCase();
  for (const [pattern, token] of PHRASES) {
    text = text.replace(pattern, ` ${token} `);
  }
  return text
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic bag-of-tokens embedding.
 * Demo-safe: no network, no API keys, stable across reloads.
 */
export function embedText(input: string, dim = EMBEDDING_DIM): Float32Array {
  const vector = new Float32Array(dim);
  const tokens = tokenizeRegulationText(input);
  if (tokens.length === 0) return vector;

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  for (const [token, count] of counts) {
    const index = hashToken(token) % dim;
    const weight = 1 + Math.log(count);
    const sign = hashToken(`s:${token}`) % 2 === 0 ? 1 : -1;
    vector[index] += sign * weight;
  }

  let norm = 0;
  for (let i = 0; i < dim; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i += 1) vector[i] /= norm;
  return vector;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
  return sum;
}

export function overlapTerms(query: string, candidate: string, limit = 6): string[] {
  const querySet = new Set(tokenizeRegulationText(query));
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of tokenizeRegulationText(candidate)) {
    if (!querySet.has(token) || seen.has(token)) continue;
    seen.add(token);
    terms.push(token.replaceAll("_", " "));
    if (terms.length >= limit) break;
  }
  return terms;
}
