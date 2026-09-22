import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { getCarrierDataProvider } from "@/lib/providers";
import { persistCarrierLookup } from "@/lib/supabase/persist";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  const body = (await request.json()) as { usdot?: string };
  const usdot = (body.usdot ?? "").replace(/\D/g, "");
  if (!usdot) {
    return NextResponse.json({ error: "Enter a USDOT number." }, { status: 400 });
  }

  try {
    const carrier = await getCarrierDataProvider(demoMode).getCarrier(usdot);
    const opportunityId = `opp_live-${carrier.usdot}`;
    await persistCarrierLookup(carrier, { id: opportunityId, carrierId: `live-${carrier.usdot}` });
    return NextResponse.json({ carrier, live: true, opportunityId });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : demoMode
          ? "FMCSA lookup unavailable. The latest stored/demo carrier profile can still be used."
          : "FMCSA lookup unavailable.";
    return NextResponse.json({ error: message, live: false }, { status: 503 });
  }
}
