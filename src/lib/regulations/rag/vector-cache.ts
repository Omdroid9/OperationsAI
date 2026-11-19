import { createHash } from "node:crypto";
import stored from "@/lib/regulations/rag/data/embeddings.gemini-embedding-001.json";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  type EmbeddingTask,
} from "@/lib/regulations/rag/gemini-embeddings";

/**
 * Committed model vectors (Float32, base64) for the corpus and eval queries.
 * The server uses them so indexed notices are never re-embedded per request, and
 * the eval uses them so CI needs no API key. Server-side only: uses node:crypto.
 * `npm run eval:rag:refresh` adds vectors for any text that is not stored yet.
 */
export type VectorFile = {
  model: string;
  dimensions: number;
  vectors: Record<string, string>;
};

const file = stored as VectorFile;
const usable = file.model === EMBEDDING_MODEL && file.dimensions === EMBEDDING_DIMENSIONS;

export function vectorKey(text: string, task: EmbeddingTask): string {
  return createHash("sha256").update(`${task}\n${text}`).digest("hex").slice(0, 24);
}

export function encodeVector(vector: Float32Array): string {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString("base64");
}

export function decodeVector(encoded: string): Float32Array {
  const bytes = Buffer.from(encoded, "base64");
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4).slice();
}

export function storedVector(text: string, task: EmbeddingTask): Float32Array | null {
  if (!usable) return null;
  const encoded = file.vectors[vectorKey(text, task)];
  return encoded ? decodeVector(encoded) : null;
}
