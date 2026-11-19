import { timingSafeEqual } from "node:crypto";
import { recordLiveCall } from "@/lib/providers/vapi";
import { NextResponse } from "next/server";

/** Vapi sends the server secret configured on the assistant as `x-vapi-secret`. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.VAPI_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "Vapi webhook secret is not configured." }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("x-vapi-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

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
