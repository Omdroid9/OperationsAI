import type { VoiceCallInput, VoiceProvider } from "@/lib/providers/types";
import { getProviderStatus } from "@/lib/providers/status";
import {
  getPersistedLiveCall,
  recordPersistedLiveCall,
} from "@/lib/supabase/live-calls";

type LiveCallStatus = "queued" | "in_progress" | "completed" | "failed";

export interface LiveCallRecord {
  status: LiveCallStatus;
  transcript?: string;
  transcriptUrl?: string | null;
  endedAt?: string;
  qualification?: unknown;
  leadId?: string;
  provider?: "dograh" | "vapi";
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  applied?: boolean;
  /** Provider or SkyOS reason when status is failed. */
  error?: string | null;
}

const liveCalls = new Map<string, LiveCallRecord>();

export async function getLiveCall(callId: string): Promise<LiveCallRecord | null> {
  const memory = liveCalls.get(callId);
  const persisted = await getPersistedLiveCall(callId);
  if (!memory && !persisted) return null;
  return {
    status: memory?.status ?? persisted?.status ?? "queued",
    transcript: memory?.transcript ?? persisted?.transcript,
    transcriptUrl: memory?.transcriptUrl ?? persisted?.transcriptUrl,
    endedAt: memory?.endedAt ?? persisted?.endedAt,
    qualification: memory?.qualification ?? persisted?.qualification,
    leadId: memory?.leadId ?? persisted?.leadId,
    provider: memory?.provider ?? persisted?.provider,
    recordingUrl: memory?.recordingUrl ?? persisted?.recordingUrl,
    durationSeconds: memory?.durationSeconds ?? persisted?.durationSeconds,
    applied: memory?.applied ?? persisted?.applied,
    error: memory?.error ?? null,
  };
}

export function recordLiveCall(callId: string, patch: Partial<LiveCallRecord>) {
  const current = liveCalls.get(callId) ?? { status: "queued" as const };
  const next = { ...current, ...patch };
  liveCalls.set(callId, next);
  void recordPersistedLiveCall(callId, next);
}

const VAPI_STATUS: Record<string, LiveCallStatus> = {
  queued: "queued",
  ringing: "queued",
  "in-progress": "in_progress",
  forwarding: "in_progress",
  ended: "completed",
};

export async function refreshLiveCallFromVapi(callId: string): Promise<LiveCallRecord | null> {
  if (!process.env.VAPI_API_KEY) return getLiveCall(callId);
  try {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
      cache: "no-store",
    });
    if (!response.ok) return getLiveCall(callId);
    const payload = (await response.json()) as {
      status?: string;
      transcript?: string;
      artifact?: { transcript?: string };
      endedAt?: string;
    };
    const existing = await getLiveCall(callId);
    const mapped = VAPI_STATUS[payload.status ?? ""] ?? existing?.status ?? "in_progress";
    recordLiveCall(callId, {
      status: mapped,
      transcript: payload.transcript ?? payload.artifact?.transcript,
      endedAt: payload.endedAt,
    });
  } catch {
    // Keep the in-memory record if Vapi cannot be reached.
  }
  return getLiveCall(callId);
}

function qualificationPrompt(context: Record<string, string>): string {
  return `You are a qualification assistant calling on behalf of SkyOS.
Identify yourself clearly. Support English, Spanish, Hindi, Punjabi, and Marathi, including code-switching.
Be concise, polite, and allow interruption. Never invent regulations. Never claim public data proves noncompliance.
Honor opt-out. Offer human follow-up.

Known public information:
${Object.entries(context)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

Goals:
1. Confirm the business/person.
2. Confirm fleet size.
3. Ask whether compliance is handled internally or externally.
4. Ask whether New Entrant preparation is already addressed if relevant.
5. Determine whether they want a human follow-up and when.
6. End politely if uninterested.`;
}

export const vapiVoiceProvider: VoiceProvider = {
  async startCall(input: VoiceCallInput) {
    const status = getProviderStatus();
    if (!status.vapi) {
      throw new Error("Live voice is not configured.");
    }
    const serverUrl =
      process.env.VAPI_SERVER_URL ||
      (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/vapi` : null);

    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: { number: input.phone },
        assistant: {
          name: "SkyOS Qualification",
          firstMessage:
            "Hello, I'm calling on behalf of SkyOS. You can continue in English, Spanish, Hindi, Punjabi, or Marathi. Which language would you prefer?",
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: qualificationPrompt(input.context) }],
          },
          transcriber: status.gladia
            ? {
                provider: "gladia",
                model: "solaria-1",
                language: "multi",
              }
            : {
                provider: "deepgram",
                model: "nova-2",
                language: "en",
              },
          voice: process.env.ELEVENLABS_API_KEY
            ? { provider: "11labs", voiceId: process.env.ELEVENLABS_VOICE_ID ?? "rachel" }
            : { provider: "vapi", voiceId: "Elliot" },
          ...(serverUrl ? { serverUrl } : {}),
        },
        metadata: { leadId: input.leadId },
      }),
    });
    if (!response.ok) {
      let detail = `Vapi start failed (${response.status})`;
      try {
        const errBody = (await response.json()) as { message?: string; error?: string };
        detail = errBody.message || errBody.error || detail;
      } catch {
        // Keep status-only detail.
      }
      throw new Error(detail);
    }
    const payload = (await response.json()) as { id?: string };
    const callId = payload.id ?? `vapi_${Date.now()}`;
    recordLiveCall(callId, { status: "queued", leadId: input.leadId });
    return callId;
  },
  async getCallStatus(callId: string) {
    const live = await getLiveCall(callId);
    return live?.status ?? "failed";
  },
};
