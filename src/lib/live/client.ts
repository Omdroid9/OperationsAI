import { demoModeHeaders, getDemoModeClient } from "@/lib/mode/demo-mode";
import type { ProviderStatus } from "@/lib/providers/status";
import type { NormalizedFmcsaCarrier } from "@/lib/providers/types";
import type { QualificationResult } from "@/types";

function withDemoMode(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...demoModeHeaders(getDemoModeClient()),
      ...(init?.headers ?? {}),
    },
  };
}

export async function fetchProviderStatus(): Promise<ProviderStatus & { demoMode?: boolean }> {
  const response = await fetch("/api/status", withDemoMode({ cache: "no-store" }));
  if (!response.ok) {
    return { supabase: false, fmcsa: false, gemini: false, vapi: false, gladia: false, dograh: false };
  }
  const payload = (await response.json()) as {
    providers?: ProviderStatus;
    demoMode?: boolean;
  };
  return {
    ...(payload.providers ?? {
      supabase: false,
      fmcsa: false,
      gemini: false,
      vapi: false,
      gladia: false,
      dograh: false,
    }),
    demoMode: payload.demoMode,
  };
}

export async function lookupCarrierByUsdot(usdot: string): Promise<NormalizedFmcsaCarrier> {
  const response = await fetch(
    "/api/carriers/lookup",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usdot }),
    }),
  );
  const payload = (await response.json()) as { carrier?: NormalizedFmcsaCarrier; error?: string };
  if (!response.ok || !payload.carrier) {
    throw new Error(payload.error ?? "FMCSA lookup unavailable.");
  }
  return payload.carrier;
}

export async function analyzeRegulationLive(text: string): Promise<{ analysis: unknown; live: boolean }> {
  const response = await fetch(
    "/api/reglens/analyze",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
  );
  const payload = (await response.json()) as { analysis?: unknown; live?: boolean; error?: string };
  if (!response.ok || !payload.analysis) {
    throw new Error(payload.error ?? "Analysis unavailable.");
  }
  return { analysis: payload.analysis, live: Boolean(payload.live) };
}

export async function extractDocumentLive(
  file: File,
  caseId: string,
  documentType: string,
): Promise<{ extraction: unknown; fileName: string; live: boolean; insufficient?: boolean }> {
  const form = new FormData();
  form.append("file", file);
  form.append("caseId", caseId);
  form.append("documentType", documentType);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  let response: Response;
  try {
    response = await fetch(
      "/api/docket/extract",
      withDemoMode({ method: "POST", body: form, signal: controller.signal }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Extraction timed out. Retry, or use a clearer PDF/image.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const payload = (await response.json()) as {
    extraction?: unknown;
    fileName?: string;
    live?: boolean;
    insufficient?: boolean;
    error?: string;
    hint?: string;
  };
  if (!response.ok || !payload.extraction) {
    throw new Error(payload.error ?? payload.hint ?? "Extraction unavailable.");
  }
  if (!payload.live) {
    throw new Error(
      payload.hint ?? "Live extraction failed. Confirm the file is a readable PDF or image, then retry.",
    );
  }
  return {
    extraction: payload.extraction,
    fileName: payload.fileName ?? file.name,
    live: true,
    insufficient: Boolean(payload.insufficient),
  };
}

export async function startQualification(input: {
  leadId: string;
  phone?: string;
  consent?: boolean;
  context?: Record<string, string>;
}): Promise<{
  mode: "live" | "simulated" | "failed";
  callId?: string;
  reason?: string;
  error?: string;
  provider?: string;
}> {
  const response = await fetch(
    "/api/qualify",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  const payload = (await response.json()) as {
    mode?: "live" | "simulated" | "failed";
    callId?: string;
    reason?: string;
    error?: string;
    provider?: string;
  };
  if (!response.ok) {
    return {
      mode: "failed",
      error: payload.error ?? "Live voice failed. Simulated qualification is unavailable.",
      reason: payload.reason,
      provider: payload.provider,
    };
  }
  return {
    mode: payload.mode === "live" ? "live" : payload.mode === "failed" ? "failed" : "simulated",
    callId: payload.callId,
    reason: payload.reason,
    error: payload.error,
    provider: payload.provider,
  };
}

export async function pollQualification(callId: string): Promise<{
  status: string;
  transcript?: string;
  transcriptUrl?: string | null;
  qualification?: QualificationResult;
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  live?: boolean;
  error?: string;
  provider?: string;
}> {
  const response = await fetch(
    `/api/qualify/${encodeURIComponent(callId)}`,
    withDemoMode({ cache: "no-store" }),
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      status?: string;
    };
    return { status: payload.status ?? "failed", error: payload.error };
  }
  return (await response.json()) as {
    status: string;
    transcript?: string;
    qualification?: QualificationResult;
    recordingUrl?: string | null;
    durationSeconds?: number | null;
    live?: boolean;
    error?: string;
    provider?: string;
  };
}

export async function runCaNewEntrantRadar(input?: {
  limit?: number;
  requirePhone?: boolean;
}): Promise<{
  carriers: Array<NormalizedFmcsaCarrier & { radarScore: number; hasPhone: boolean }>;
  matched: number;
  withPhone: number;
  note?: string;
  error?: string;
}> {
  const response = await fetch(
    "/api/radar/ca-new-entrant",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    }),
  );
  const payload = (await response.json()) as {
    carriers?: Array<NormalizedFmcsaCarrier & { radarScore: number; hasPhone: boolean }>;
    matched?: number;
    withPhone?: number;
    note?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Radar unavailable.");
  }
  return {
    carriers: payload.carriers ?? [],
    matched: payload.matched ?? 0,
    withPhone: payload.withPhone ?? 0,
    note: payload.note,
  };
}

export const PROVIDER_LABELS: Record<keyof ProviderStatus, string> = {
  fmcsa: "FMCSA",
  gemini: "Gemini",
  vapi: "Vapi",
  gladia: "Gladia",
  supabase: "Supabase",
  dograh: "Dograh",
};
