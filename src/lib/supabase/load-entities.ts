import {
  activityRowToActivity,
  callRowToCall,
  carrierRowToCarrier,
  caseRowToCase,
  documentRowToDocument,
  leadRowToOpportunity,
  matchRowToRegulationMatch,
  regulationRowToRegulation,
  taskRowToTask,
} from "@/lib/supabase/mappers";
import { getSupabase } from "@/lib/supabase/server";
import type { DemoState, RegulationMatch } from "@/types";

export async function loadWorkspaceFromEntities(): Promise<DemoState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [
    carriersRes,
    leadsRes,
    activitiesRes,
    callsRes,
    casesRes,
    documentsRes,
    tasksRes,
    regulationsRes,
    matchesRes,
  ] = await Promise.all([
    supabase.from("carriers").select("*"),
    supabase.from("leads").select("*"),
    supabase.from("activities").select("*"),
    supabase.from("calls").select("*"),
    supabase.from("cases").select("*"),
    supabase.from("documents").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("regulations").select("*"),
    supabase.from("regulation_matches").select("*"),
  ]);

  const tables = [
    ["carriers", carriersRes.error],
    ["leads", leadsRes.error],
    ["activities", activitiesRes.error],
    ["calls", callsRes.error],
    ["cases", casesRes.error],
    ["documents", documentsRes.error],
    ["tasks", tasksRes.error],
    ["regulations", regulationsRes.error],
    ["regulation_matches", matchesRes.error],
  ] as const;

  for (const [table, error] of tables) {
    if (error) {
      console.error(`[supabase] load ${table} failed:`, error.message);
      return null;
    }
  }

  const carriers = (carriersRes.data ?? []).map((row) =>
    carrierRowToCarrier(row as Record<string, unknown>),
  );
  const opportunities = (leadsRes.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return leadRowToOpportunity(record, String(record.carrier_id ?? ""));
  });

  const matches: Record<string, RegulationMatch[]> = {};
  for (const row of matchesRes.data ?? []) {
    const record = row as Record<string, unknown>;
    const regulationId = String(record.regulation_id);
    if (!matches[regulationId]) matches[regulationId] = [];
    matches[regulationId].push(matchRowToRegulationMatch(record));
  }

  return {
    carriers,
    snapshots: [],
    signals: [],
    opportunities,
    activities: (activitiesRes.data ?? []).map((row) =>
      activityRowToActivity(row as Record<string, unknown>),
    ),
    calls: (callsRes.data ?? []).map((row) => callRowToCall(row as Record<string, unknown>)),
    regulations: (regulationsRes.data ?? []).map((row) =>
      regulationRowToRegulation(row as Record<string, unknown>),
    ),
    matches,
    cases: (casesRes.data ?? []).map((row) => caseRowToCase(row as Record<string, unknown>)),
    documents: (documentsRes.data ?? []).map((row) =>
      documentRowToDocument(row as Record<string, unknown>),
    ),
    tasks: (tasksRes.data ?? []).map((row) => taskRowToTask(row as Record<string, unknown>)),
  };
}
