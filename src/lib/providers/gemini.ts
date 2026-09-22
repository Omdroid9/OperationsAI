import { SAMPLE_MEDICAL_EXTRACTION, SAMPLE_REGULATION_ANALYSIS } from "@/data/seed";
import type { LLMProvider, StructuredExtractionInput } from "@/lib/providers/types";
import { getProviderStatus } from "@/lib/providers/status";

/** Prefer models this key can call quickly with text. PDF inlineData hangs on generateContent. */
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest"];
const REQUEST_TIMEOUT_MS = 20_000;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export type { GeminiPart };

export interface GeminiExtractionResult<T> {
  value: T;
  live: boolean;
  error?: string;
}

function geminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return key;
}

function invalidKeyHint(key: string): string | null {
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return null;
  return "GEMINI_API_KEY should come from Google AI Studio (starts with AQ. or AIza).";
}

async function readGeminiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; status?: string };
    };
    const message = payload.error?.message?.trim();
    if (message) return message;
  } catch {
    // Fall through to status text.
  }
  return `${response.status} ${response.statusText}`.trim();
}

async function generateJson(parts: GeminiPart[]): Promise<string> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const keyHint = invalidKeyHint(apiKey);
  if (keyHint) {
    throw new Error(keyHint);
  }

  let lastError: unknown;
  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        lastError = new Error(`${model}: ${await readGeminiError(response)}`);
        continue;
      }
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`${model} returned no text`);
        continue;
      }
      return text;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error(`${model}: timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      } else {
        lastError = error;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
}

export const geminiLlmProvider: LLMProvider = {
  async extractStructured<T>(input: StructuredExtractionInput<T>): Promise<T> {
    if (!getProviderStatus().gemini) {
      return input.fallback;
    }
    try {
      const text = await generateJson([
        {
          text: `${input.prompt}\n\nReturn JSON only. Schema:\n${input.schemaDescription}`,
        },
      ]);
      return JSON.parse(text) as T;
    } catch {
      return input.fallback;
    }
  },
};

export async function extractJsonFromParts<T>(
  parts: GeminiPart[],
  fallback: T,
  options?: { allowDemoFallback?: boolean },
): Promise<GeminiExtractionResult<T>> {
  const allowDemoFallback = options?.allowDemoFallback ?? true;
  if (!getProviderStatus().gemini) {
    return {
      value: fallback,
      live: false,
      error: allowDemoFallback
        ? "GEMINI_API_KEY is not set"
        : "GEMINI_API_KEY is not set. Demo fallback is disabled while Demo Mode is off.",
    };
  }
  const apiKey = geminiApiKey();
  if (apiKey) {
    const keyHint = invalidKeyHint(apiKey);
    if (keyHint) {
      return { value: fallback, live: false, error: keyHint };
    }
  }
  try {
    const text = await generateJson(parts);
    return { value: JSON.parse(text) as T, live: true };
  } catch (error) {
    return {
      value: fallback,
      live: false,
      error: error instanceof Error ? error.message : "Gemini request failed",
    };
  }
}

export const GEMINI_REGULATION_FALLBACK = SAMPLE_REGULATION_ANALYSIS;
export const GEMINI_DOCUMENT_FALLBACK = SAMPLE_MEDICAL_EXTRACTION;
