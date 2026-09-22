import { getSupabase } from "@/lib/supabase/server";

export interface PersistedLiveCall {
  status: "queued" | "in_progress" | "completed" | "failed";
  transcript?: string;
  transcriptUrl?: string | null;
  endedAt?: string;
  qualification?: unknown;
  leadId?: string;
  provider?: "dograh" | "vapi";
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  applied?: boolean;
}

export async function getPersistedLiveCall(callId: string): Promise<PersistedLiveCall | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("live_calls")
    .select("*")
    .eq("provider_call_id", callId)
    .maybeSingle();
  if (error || !data) return null;
  const meta =
    data.metadata_json && typeof data.metadata_json === "object"
      ? (data.metadata_json as Record<string, unknown>)
      : {};
  return {
    status: data.status as PersistedLiveCall["status"],
    transcript: data.transcript ?? undefined,
    transcriptUrl: typeof meta.transcriptUrl === "string" ? meta.transcriptUrl : null,
    recordingUrl: typeof meta.recordingUrl === "string" ? meta.recordingUrl : null,
    durationSeconds:
      typeof meta.durationSeconds === "number" ? meta.durationSeconds : undefined,
    provider: meta.provider === "dograh" || meta.provider === "vapi" ? meta.provider : undefined,
    applied: meta.applied === true,
    endedAt: data.ended_at ?? undefined,
    qualification: data.qualification_json ?? undefined,
    leadId: data.lead_id ?? undefined,
  };
}

export async function recordPersistedLiveCall(
  callId: string,
  patch: Partial<PersistedLiveCall> & { leadId?: string },
) {
  const supabase = getSupabase();
  if (!supabase) return;
  const current = (await getPersistedLiveCall(callId)) ?? { status: "queued" as const };
  const transcriptUrl = patch.transcriptUrl ?? current.transcriptUrl ?? null;
  const recordingUrl = patch.recordingUrl ?? current.recordingUrl ?? null;
  const { error } = await supabase.from("live_calls").upsert({
    provider_call_id: callId,
    lead_id: patch.leadId ?? current.leadId ?? null,
    status: patch.status ?? current.status,
    transcript: patch.transcript ?? current.transcript ?? null,
    qualification_json: patch.qualification ?? current.qualification ?? null,
    metadata_json: {
      transcriptUrl,
      recordingUrl,
      durationSeconds: patch.durationSeconds ?? current.durationSeconds ?? null,
      provider: patch.provider ?? current.provider ?? "dograh",
      applied: patch.applied ?? current.applied ?? false,
    },
    ended_at: patch.endedAt ?? current.endedAt ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[supabase] live_calls upsert failed:", error.message);
  }
}
