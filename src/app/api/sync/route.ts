import { requireStaffSession } from "@/lib/auth/require-session";
import {
  loadWorkspaceForClient,
  persistWorkspaceSync,
} from "@/lib/supabase/persist";
import { isDemoState } from "@/lib/supabase/mappers";
import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { getProviderStatus } from "@/lib/providers/status";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await requireStaffSession();
  if (!session.ok) return session.response;

  const status = getProviderStatus();
  if (!status.supabase) {
    return NextResponse.json({ configured: false, state: null, source: "none" });
  }
  const demoMode = readDemoModeFromRequest(request);
  const state = await loadWorkspaceForClient(demoMode);
  return NextResponse.json({
    configured: true,
    state,
    source: demoMode ? "snapshot:demo" : "entities",
  });
}

export async function POST(request: Request) {
  const session = await requireStaffSession();
  if (!session.ok) return session.response;

  const status = getProviderStatus();
  if (!status.supabase) {
    return NextResponse.json({ saved: false, reason: "Supabase is not configured." });
  }
  const demoMode = readDemoModeFromRequest(request);
  const body = (await request.json()) as { state?: unknown };
  if (!isDemoState(body.state)) {
    return NextResponse.json({ error: "Invalid workspace state." }, { status: 400 });
  }

  const result = await persistWorkspaceSync(body.state, demoMode);
  return NextResponse.json({
    saved: result.saved,
    mirrored: result.mirrored,
    snapshotId: result.snapshotId,
  });
}
