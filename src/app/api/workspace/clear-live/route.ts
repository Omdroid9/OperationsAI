import { requireStaffSession } from "@/lib/auth/require-session";
import { createEmptyWorkspaceState } from "@/lib/demo/empty-state";
import { saveWorkspaceState } from "@/lib/supabase/persist";
import { getSupabase } from "@/lib/supabase/server";
import { LIVE_SNAPSHOT_ID } from "@/lib/supabase/workspace-snapshots";
import { NextResponse } from "next/server";

type Wipe = { table: string; column: string };

/** Wipe Live Mode entity tables + live snapshot. Does not touch demo snapshot. */
export async function POST() {
  const session = await requireStaffSession();
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const wipes: Wipe[] = [
    { table: "regulation_matches", column: "regulation_id" },
    { table: "documents", column: "id" },
    { table: "tasks", column: "id" },
    { table: "activities", column: "id" },
    { table: "calls", column: "id" },
    { table: "live_calls", column: "provider_call_id" },
    { table: "cases", column: "id" },
    { table: "leads", column: "id" },
    { table: "signals", column: "id" },
    { table: "carrier_snapshots", column: "id" },
    { table: "carriers", column: "id" },
    { table: "regulations", column: "id" },
  ];

  for (const { table, column } of wipes) {
    const { error } = await supabase.from(table).delete().neq(column, "");
    if (error) {
      console.error(`[clear-live] ${table}:`, error.message);
      return NextResponse.json(
        { error: `Could not clear ${table}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  const saved = await saveWorkspaceState(createEmptyWorkspaceState(), LIVE_SNAPSHOT_ID);
  if (!saved) {
    return NextResponse.json(
      { error: "Entity tables cleared but live snapshot save failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
