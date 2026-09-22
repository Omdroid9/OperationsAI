import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { getProviderStatus } from "@/lib/providers/status";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  return NextResponse.json({
    demoMode,
    demoFallback: demoMode,
    providers: getProviderStatus(),
  });
}
