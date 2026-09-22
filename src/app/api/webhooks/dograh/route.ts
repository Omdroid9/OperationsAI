import {
  dograhPayloadAttemptsForbiddenActions,
  dograhWebhookSecret,
} from "@/lib/providers/dograh";
import { resolveDograhCallResult } from "@/lib/qualify/map-qualification";
import { getLiveCall, recordLiveCall } from "@/lib/providers/vapi";
import { NextResponse } from "next/server";

const appliedDeliveries = new Set<string>();

function readSecret(request: Request): string | null {
  const headerSecret =
    request.headers.get("x-dograh-webhook-secret") ??
    request.headers.get("x-skyos-webhook-secret") ??
    request.headers.get("x-api-key");
  if (headerSecret?.trim()) return headerSecret.trim();
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function POST(request: Request) {
  const expected = dograhWebhookSecret();
  if (!expected) {
    return NextResponse.json({ error: "Dograh webhook secret is not configured." }, { status: 503 });
  }
  const provided = readSecret(request);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const forbidden = dograhPayloadAttemptsForbiddenActions(payload);
  if (forbidden) {
    return NextResponse.json({ error: forbidden }, { status: 422 });
  }

  const deliveryId =
    request.headers.get("x-dograh-delivery-id") ??
    String(payload.delivery_id ?? payload.deliveryId ?? "");
  const workflowRunId = String(
    payload.workflow_run_id ?? payload.workflowRunId ?? payload.run_id ?? payload.runId ?? "",
  );
  const skyosRecordId = String(
    payload.skyos_record_id ??
      payload.skyosRecordId ??
      payload.lead_id ??
      payload.leadId ??
      (payload.initial_context && typeof payload.initial_context === "object"
        ? (payload.initial_context as Record<string, unknown>).skyos_record_id
        : "") ??
      "",
  );

  if (!workflowRunId) {
    return NextResponse.json({ error: "workflow_run_id is required." }, { status: 400 });
  }

  const idempotencyKey = deliveryId || `run:${workflowRunId}`;
  if (appliedDeliveries.has(idempotencyKey)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const existingLive = await getLiveCall(workflowRunId);
  if (existingLive?.applied) {
    appliedDeliveries.add(idempotencyKey);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const gathered =
    payload.gathered_context && typeof payload.gathered_context === "object"
      ? (payload.gathered_context as Record<string, unknown>)
      : payload.qualification && typeof payload.qualification === "object"
        ? (payload.qualification as Record<string, unknown>)
        : null;

  const publicAccessToken =
    (typeof payload.public_access_token === "string" && payload.public_access_token.trim()) ||
    (typeof payload.publicAccessToken === "string" && payload.publicAccessToken.trim()) ||
    "";
  const transcriptDownloadUrl = publicAccessToken
    ? `${(process.env.DOGRAH_API_URL ?? "https://app.dograh.com").replace(/\/$/, "")}/api/v1/public/download/workflow/${encodeURIComponent(publicAccessToken)}/transcript?inline=true`
    : "";

  const transcriptInlineOrUrl =
    (typeof payload.transcript === "string" && payload.transcript) ||
    transcriptDownloadUrl ||
    (typeof payload.transcript_public_url === "string" && payload.transcript_public_url) ||
    (typeof payload.transcript_url === "string" && payload.transcript_url) ||
    existingLive?.transcript ||
    "";

  const recordingUrl =
    (typeof payload.recording_url === "string" && payload.recording_url) ||
    (typeof payload.recording_public_url === "string" && payload.recording_public_url) ||
    existingLive?.recordingUrl ||
    null;

  const resolved = await resolveDograhCallResult({
    gathered,
    transcriptInlineOrUrl,
    allowTranscriptExtraction: true,
  });

  const hasQualification = Boolean(resolved.qualification);
  recordLiveCall(workflowRunId, {
    status: hasQualification ? "completed" : "in_progress",
    transcript: resolved.transcriptText || resolved.transcriptUrl || "",
    transcriptUrl: resolved.transcriptUrl,
    recordingUrl,
    qualification: resolved.qualification ?? existingLive?.qualification,
    endedAt: new Date().toISOString(),
    leadId: skyosRecordId || existingLive?.leadId,
    provider: "dograh",
    error: null,
  });

  appliedDeliveries.add(idempotencyKey);
  return NextResponse.json({
    ok: true,
    qualificationCaptured: hasQualification,
    leadId: skyosRecordId || existingLive?.leadId || null,
  });
}
