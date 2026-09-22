import type { VoiceCallInput, VoiceProvider } from "@/lib/providers/types";
import { getProviderStatus } from "@/lib/providers/status";
import {
  mapDograhGatheredContext,
  resolveDograhCallResult,
} from "@/lib/qualify/map-qualification";
import { getLiveCall, recordLiveCall, type LiveCallRecord } from "@/lib/providers/vapi";
import type { QualificationResult } from "@/types";

export { mapDograhGatheredContext };

export const DOGRAH_SETUP =
  "Configure DOGRAH_API_URL, DOGRAH_API_KEY, DOGRAH_WORKFLOW_UUID, DOGRAH_WORKFLOW_ID, and DOGRAH_WEBHOOK_SECRET. Use a telephony Start Call workflow (not API-trigger alone).";

function apiBase(): string {
  return (process.env.DOGRAH_API_URL ?? "https://app.dograh.com").replace(/\/$/, "");
}

function apiKey(): string | null {
  return process.env.DOGRAH_API_KEY?.trim() || null;
}

function workflowUuid(): string | null {
  return process.env.DOGRAH_WORKFLOW_UUID?.trim() || null;
}

function workflowNumericId(): string | null {
  return process.env.DOGRAH_WORKFLOW_ID?.trim() || null;
}

export function dograhWebhookSecret(): string | null {
  return process.env.DOGRAH_WEBHOOK_SECRET?.trim() || null;
}

/** Server-only consenting test numbers (digits or E.164). Never expose via NEXT_PUBLIC_*. */
export function dograhAllowedTestNumbers(): string[] {
  const raw = process.env.DOGRAH_ALLOWED_TEST_NUMBERS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/\D/g, ""))
    .filter((digits) => digits.length >= 10);
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isAllowedDograhTestNumber(phone: string): boolean {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10) return false;
  const allowed = dograhAllowedTestNumbers();
  if (allowed.length === 0) return false;
  const last10 = digits.slice(-10);
  return allowed.some((item) => item === digits || item.slice(-10) === last10);
}

export function toE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function isDograhConfigured(): boolean {
  return Boolean(apiKey() && workflowUuid() && workflowNumericId() && dograhWebhookSecret());
}

type DograhRunPayload = {
  id?: number;
  workflow_id?: number;
  is_completed?: boolean;
  mode?: string;
  transcript?: string | null;
  transcript_url?: string | null;
  transcript_public_url?: string | null;
  public_access_token?: string | null;
  recording_url?: string | null;
  recording_public_url?: string | null;
  gathered_context?: Record<string, unknown> | null;
  initial_context?: Record<string, unknown> | null;
  cost_info?: Record<string, unknown> | null;
  usage_info?: Record<string, unknown> | null;
};

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Reject payloads that try to auto-close deals or create cases. */
export function dograhPayloadAttemptsForbiddenActions(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const gathered =
    root.gathered_context && typeof root.gathered_context === "object"
      ? (root.gathered_context as Record<string, unknown>)
      : {};
  const forbiddenKeys = [
    "mark_won",
    "markWon",
    "create_case",
    "createCase",
    "start_service",
    "startService",
    "auto_won",
    "won",
  ];
  for (const key of forbiddenKeys) {
    if (root[key] === true || gathered[key] === true) {
      return `Payload requests forbidden action (${key}). Staff must mark Won or start service manually.`;
    }
  }
  const stage = asString(root.stage) ?? asString(gathered.stage);
  if (stage && ["WON", "won"].includes(stage)) {
    return "Payload attempts to set stage to Won. Staff review is required.";
  }
  return null;
}

export async function startDograhOutboundCall(input: VoiceCallInput): Promise<string> {
  const key = apiKey();
  const uuid = workflowUuid();
  if (!key || !uuid) {
    throw new Error(`Dograh is not configured. ${DOGRAH_SETUP}`);
  }
  if (!isAllowedDograhTestNumber(input.phone)) {
    throw new Error(
      "Phone number is not on the consenting test-number allowlist (DOGRAH_ALLOWED_TEST_NUMBERS).",
    );
  }

  const phone = toE164(input.phone);
  const response = await fetch(`${apiBase()}/api/v1/public/agent/workflow/${encodeURIComponent(uuid)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify({
      phone_number: phone,
      initial_context: {
        ...input.context,
        skyos_record_id: input.leadId,
        phone_number: phone,
      },
    }),
  });

  if (!response.ok) {
    let detail = `Dograh outbound call failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: unknown; message?: string; error?: string };
      if (typeof body.message === "string") detail = body.message;
      else if (typeof body.error === "string") detail = body.error;
      else if (body.detail) detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      // keep status detail
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as {
    status?: string;
    workflow_run_id?: number | string;
    workflow_run_name?: string;
  };
  const runId = payload.workflow_run_id != null ? String(payload.workflow_run_id) : "";
  if (!runId) {
    throw new Error("Dograh did not return a workflow_run_id.");
  }

  recordLiveCall(runId, {
    status: "queued",
    leadId: input.leadId,
    provider: "dograh",
  });
  return runId;
}

export async function fetchDograhWorkflowRun(runId: string): Promise<DograhRunPayload | null> {
  const key = apiKey();
  const workflowId = workflowNumericId();
  if (!key || !workflowId) return null;
  const response = await fetch(
    `${apiBase()}/api/v1/workflow/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}`,
    {
      headers: { "X-API-Key": key },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  return (await response.json()) as DograhRunPayload;
}

function isHttpUrl(value: string | null): value is string {
  return Boolean(value && (value.startsWith("https://") || value.startsWith("http://")));
}

function transcriptDownloadUrl(token: string, preferredHost?: string | null): string {
  const host =
    preferredHost && isHttpUrl(preferredHost)
      ? new URL(preferredHost).origin
      : apiBase();
  return `${host}/api/v1/public/download/workflow/${encodeURIComponent(token)}/transcript?inline=true`;
}

function transcriptFromRun(run: DograhRunPayload, existing?: LiveCallRecord | null): string {
  const publicUrl = asString(run.transcript_public_url);
  if (isHttpUrl(publicUrl)) return publicUrl;
  const token = asString(run.public_access_token);
  if (token) return transcriptDownloadUrl(token, publicUrl);
  const direct = asString(run.transcript_url);
  if (isHttpUrl(direct)) return direct;
  const inline = asString(run.transcript);
  if (inline && isHttpUrl(inline)) return inline;
  if (inline && !inline.includes("/") && !inline.endsWith(".txt")) return inline;
  return existing?.transcript ?? "";
}

export async function refreshLiveCallFromDograh(
  runId: string,
  options?: { allowTranscriptExtraction?: boolean },
): Promise<LiveCallRecord | null> {
  const existing = await getLiveCall(runId);
  try {
    const run = await fetchDograhWorkflowRun(runId);
    if (!run) return existing;
    const completed = Boolean(run.is_completed);
    const gatheredError =
      completed &&
      run.gathered_context &&
      typeof run.gathered_context === "object" &&
      (run.gathered_context as Record<string, unknown>).error
        ? String((run.gathered_context as Record<string, unknown>).error)
        : null;

    let qualification: QualificationResult | null | undefined =
      existing?.qualification && typeof existing.qualification === "object"
        ? (existing.qualification as QualificationResult)
        : undefined;
    let transcriptText = existing?.transcript ?? "";
    let transcriptUrl = existing?.transcriptUrl ?? null;

    if (completed && !gatheredError) {
      const resolved = await resolveDograhCallResult({
        gathered: run.gathered_context ?? undefined,
        transcriptInlineOrUrl: transcriptFromRun(run, existing),
        allowTranscriptExtraction: options?.allowTranscriptExtraction ?? true,
      });
      qualification = resolved.qualification ?? qualification;
      transcriptText = resolved.transcriptText || transcriptText;
      transcriptUrl = resolved.transcriptUrl ?? transcriptUrl;
    }

    // Wait for gathered fields or transcript. A finished phone call is not a failed
    // qualification just because artifacts are a few seconds late.
    const runFailed = Boolean(gatheredError);
    const status = runFailed
      ? "failed"
      : qualification
        ? "completed"
        : completed
          ? "in_progress"
          : existing?.status === "failed"
            ? "failed"
            : "in_progress";

    recordLiveCall(runId, {
      status,
      transcript: transcriptText || transcriptUrl || "",
      transcriptUrl,
      recordingUrl:
        asString(run.recording_public_url) ??
        asString(run.recording_url) ??
        existing?.recordingUrl,
      qualification: qualification ?? existing?.qualification,
      endedAt: completed || runFailed ? new Date().toISOString() : existing?.endedAt,
      leadId: existing?.leadId ?? asString(run.initial_context?.["skyos_record_id"]) ?? undefined,
      provider: "dograh",
      durationSeconds:
        asNumber(run.usage_info?.["duration_seconds"]) ??
        asNumber(run.cost_info?.["call_duration_seconds"]) ??
        asNumber(run.cost_info?.["duration_seconds"]) ??
        existing?.durationSeconds,
      error:
        gatheredError ??
        (runFailed
          ? "Call ended before qualification was captured. Retry the call."
          : existing?.error),
    });
  } catch {
    // Keep prior memory if Dograh cannot be reached.
  }
  return getLiveCall(runId);
}

export const dograhVoiceProvider: VoiceProvider = {
  async startCall(input) {
    if (!getProviderStatus().dograh) {
      throw new Error(`Dograh is not configured. ${DOGRAH_SETUP}`);
    }
    return startDograhOutboundCall(input);
  },
  async getCallStatus(callId) {
    const live = await refreshLiveCallFromDograh(callId);
    return live?.status ?? "failed";
  },
};
