import { recordLiveCall } from "@/lib/providers/vapi";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    message?: {
      type?: string;
      call?: { id?: string };
      transcript?: string;
      artifact?: { transcript?: string };
    };
  };
  const callId = payload.message?.call?.id;
  if (!callId) {
    return NextResponse.json({ ok: true });
  }
  const type = payload.message?.type;
  const transcript = payload.message?.transcript ?? payload.message?.artifact?.transcript;
  if (type === "end-of-call-report" || type === "hang") {
    recordLiveCall(callId, {
      status: "completed",
      transcript,
      endedAt: new Date().toISOString(),
    });
  } else if (type === "status-update") {
    recordLiveCall(callId, { status: "in_progress", transcript });
  }
  return NextResponse.json({ ok: true });
}
