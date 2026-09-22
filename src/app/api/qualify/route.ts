import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { DOGRAH_SETUP, isAllowedDograhTestNumber } from "@/lib/providers/dograh";
import { getVoiceProvider } from "@/lib/providers";
import { getProviderStatus } from "@/lib/providers/status";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  const body = (await request.json()) as {
    leadId?: string;
    phone?: string;
    consent?: boolean;
    context?: Record<string, string>;
  };
  const status = getProviderStatus();
  const phone = (body.phone ?? "").trim();
  const consent = Boolean(body.consent);

  if (status.dograh) {
    if (!consent) {
      return NextResponse.json(
        {
          error: "Confirm consent before starting an outbound qualification call.",
          mode: "failed",
        },
        { status: 400 },
      );
    }
    if (!isAllowedDograhTestNumber(phone)) {
      return NextResponse.json(
        {
          error:
            "Use a consenting test number from DOGRAH_ALLOWED_TEST_NUMBERS. Real calls are restricted to that allowlist.",
          mode: "failed",
        },
        { status: 400 },
      );
    }
    try {
      const callId = await getVoiceProvider(demoMode).startCall({
        leadId: body.leadId ?? "",
        phone,
        context: body.context ?? {},
      });
      return NextResponse.json({ mode: "live", callId, provider: "dograh" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Dograh outbound call failed.";
      console.error("[qualify] dograh call failed:", detail);
      if (!demoMode) {
        return NextResponse.json(
          {
            error: `Dograh call failed: ${detail}`,
            mode: "failed",
            detail,
          },
          { status: 503 },
        );
      }
      return NextResponse.json({
        mode: "simulated",
        reason: `Dograh call failed: ${detail}. Using labeled simulated qualification.`,
        detail,
      });
    }
  }

  if (!demoMode) {
    return NextResponse.json(
      {
        error: `Dograh is not configured. ${DOGRAH_SETUP}`,
        mode: "failed",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    mode: "simulated",
    reason: `Dograh is not configured. ${DOGRAH_SETUP} A labeled simulated qualification will be used.`,
  });
}
