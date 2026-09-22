import { LIVE_MODE_SETUP, readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { PATEL_QUALIFICATION, PATEL_TRANSCRIPT } from "@/data/seed";
import { refreshLiveCallFromDograh } from "@/lib/providers/dograh";
import { getLiveCall, recordLiveCall } from "@/lib/providers/vapi";
import { qualificationResultSchema } from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const DISCONNECT_ERROR = "Call ended before qualification was captured. Retry the call.";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const demoMode = readDemoModeFromRequest(request);
  const { id: callId } = await context.params;

  let live = await getLiveCall(callId);
  if (live?.provider === "dograh" || !live?.provider) {
    live =
      (await refreshLiveCallFromDograh(callId, {
        allowTranscriptExtraction: !demoMode,
      })) ?? live;
  }

  if (!live) {
    return NextResponse.json({ status: "failed", error: "Call not found." });
  }

  if (live.status === "failed") {
    return NextResponse.json({
      status: "failed",
      error: live.error?.trim() || DISCONNECT_ERROR,
      transcript: live.transcript ?? "",
      transcriptUrl: live.transcriptUrl ?? null,
      recordingUrl: live.recordingUrl ?? null,
      durationSeconds: live.durationSeconds ?? null,
      provider: live.provider ?? "dograh",
    });
  }

  if (live.status !== "completed") {
    return NextResponse.json({ status: live.status, provider: live.provider ?? "dograh" });
  }

  if (live.qualification) {
    const parsed = qualificationResultSchema.safeParse(live.qualification);
    if (parsed.success) {
      return NextResponse.json({
        status: "completed",
        transcript: live.transcript ?? "",
        transcriptUrl: live.transcriptUrl ?? null,
        qualification: parsed.data,
        recordingUrl: live.recordingUrl ?? null,
        durationSeconds: live.durationSeconds ?? null,
        live: true,
        provider: live.provider ?? "dograh",
      });
    }
    if (!demoMode) {
      return NextResponse.json(
        {
          status: "failed",
          error: DISCONNECT_ERROR,
        },
        { status: 503 },
      );
    }
  }

  if (!demoMode) {
    return NextResponse.json(
      {
        status: "failed",
        error: DISCONNECT_ERROR,
      },
      { status: 503 },
    );
  }

  const qualification = PATEL_QUALIFICATION;
  const transcript = live.transcript || PATEL_TRANSCRIPT;
  recordLiveCall(callId, { qualification, transcript });
  return NextResponse.json({
    status: "completed",
    transcript,
    transcriptUrl: live.transcriptUrl ?? null,
    qualification,
    recordingUrl: live.recordingUrl ?? null,
    durationSeconds: live.durationSeconds ?? null,
    live: false,
    provider: "demo",
  });
}
