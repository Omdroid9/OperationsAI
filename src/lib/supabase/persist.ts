import { createEmptyWorkspaceState } from "@/lib/demo/empty-state";
import { loadWorkspaceFromEntities } from "@/lib/supabase/load-entities";
import { isSupabaseEntityReadEnabled } from "@/lib/supabase/source-of-truth";
import {
  DEMO_SNAPSHOT_ID,
  LEGACY_SNAPSHOT_ID,
  LIVE_SNAPSHOT_ID,
} from "@/lib/supabase/workspace-snapshots";
import {
  activityToRow,
  callToRow,
  carrierToRow,
  caseToRow,
  documentToRow,
  isDemoState,
  normalizedCarrierToRow,
  opportunityToLeadRow,
  regulationMatchToRow,
  regulationToRow,
  taskToRow,
} from "@/lib/supabase/mappers";
import { getSupabase } from "@/lib/supabase/server";
import type { NormalizedFmcsaCarrier } from "@/lib/providers/types";
import type { CallRecord, DemoState, Regulation, RegulationMatch } from "@/types";

async function upsertSafe(table: string, rows: Record<string, unknown>[]) {
  const supabase = getSupabase();
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    console.error(`[supabase] upsert ${table} failed:`, error.message);
  }
}

export async function persistCarrierLookup(
  carrier: NormalizedFmcsaCarrier,
  opportunity?: { id: string; carrierId: string },
) {
  await upsertSafe("carriers", [normalizedCarrierToRow(carrier)]);
  if (opportunity) {
    await upsertSafe("leads", [
      {
        id: opportunity.id,
        carrier_id: opportunity.carrierId,
        stage: "DETECTED",
        score: 0,
        recommended_service: "Compliance review",
        reason_summary: "Imported from live FMCSA lookup.",
        metadata_json: { signalTitle: "Live FMCSA lookup" },
        updated_at: new Date().toISOString(),
      },
    ]);
  }
}

export async function persistRegulation(
  regulation: Regulation,
  analysis?: unknown,
  matches?: RegulationMatch[],
) {
  await upsertSafe("regulations", [regulationToRow(regulation, analysis)]);
  if (matches?.length) {
    await upsertSafe(
      "regulation_matches",
      matches.map((match) => regulationMatchToRow(regulation.id, match)),
    );
  }
}

export async function persistCall(call: CallRecord) {
  await upsertSafe("calls", [callToRow(call)]);
}

export async function persistDocumentExtraction(input: {
  caseId: string;
  documentType: string;
  fileName: string;
  extraction: Record<string, unknown>;
}) {
  const id = `doc_${input.caseId}_${input.documentType}`;
  await upsertSafe("documents", [
    {
      id,
      case_id: input.caseId,
      file_name: input.fileName,
      storage_path: `uploads/${input.fileName}`,
      document_type: input.extraction.document_type ?? input.documentType,
      person_name: input.extraction.person_name ?? null,
      issued_date: input.extraction.issued_date ?? null,
      expiration_date: input.extraction.expiration_date ?? null,
      confidence: input.extraction.confidence ?? null,
      extraction_json: input.extraction,
      review_status: "NEEDS_REVIEW",
      required: true,
      created_at: new Date().toISOString(),
    },
  ]);
}

export async function saveWorkspaceState(
  state: DemoState,
  snapshotId: string,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("workspace_snapshots").upsert({
    id: snapshotId,
    state_json: state,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[supabase] save workspace (${snapshotId}) failed:`, error.message);
    return false;
  }
  return true;
}

export async function loadWorkspaceState(snapshotId: string): Promise<DemoState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspace_snapshots")
    .select("state_json")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error || !data?.state_json) return null;
  return isDemoState(data.state_json) ? data.state_json : null;
}

async function loadDemoWorkspaceState(): Promise<DemoState | null> {
  const demo = await loadWorkspaceState(DEMO_SNAPSHOT_ID);
  if (demo) return demo;

  // One-time migration: legacy `default` → `demo` for existing staging projects.
  const legacy = await loadWorkspaceState(LEGACY_SNAPSHOT_ID);
  if (!legacy) return null;

  await saveWorkspaceState(legacy, DEMO_SNAPSHOT_ID);
  return legacy;
}

export async function loadWorkspaceForClient(demoMode: boolean): Promise<DemoState | null> {
  if (isSupabaseEntityReadEnabled(demoMode)) {
    const entities = await loadWorkspaceFromEntities();
    return entities ?? createEmptyWorkspaceState();
  }
  return loadDemoWorkspaceState();
}

export async function persistWorkspaceSync(
  state: DemoState,
  demoMode: boolean,
): Promise<{ saved: boolean; mirrored: boolean; snapshotId: string }> {
  if (demoMode) {
    const saved = await saveWorkspaceState(state, DEMO_SNAPSHOT_ID);
    return { saved, mirrored: false, snapshotId: DEMO_SNAPSHOT_ID };
  }

  await mirrorWorkspaceEntities(state);
  const saved = await saveWorkspaceState(state, LIVE_SNAPSHOT_ID);
  return { saved, mirrored: true, snapshotId: LIVE_SNAPSHOT_ID };
}

export async function mirrorWorkspaceEntities(state: DemoState): Promise<void> {
  await upsertSafe("carriers", state.carriers.map(carrierToRow));
  await upsertSafe("leads", state.opportunities.map(opportunityToLeadRow));
  await upsertSafe("activities", state.activities.map(activityToRow));
  await upsertSafe("cases", state.cases.map(caseToRow));
  await upsertSafe("documents", state.documents.map(documentToRow));
  await upsertSafe("tasks", state.tasks.map(taskToRow));
  await upsertSafe("regulations", state.regulations.map((reg) => regulationToRow(reg)));
  await upsertSafe("calls", state.calls.map(callToRow));
  for (const [regulationId, matches] of Object.entries(state.matches)) {
    await upsertSafe(
      "regulation_matches",
      matches.map((match) => regulationMatchToRow(regulationId, match)),
    );
  }
}
