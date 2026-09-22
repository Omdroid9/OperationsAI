import { buildIntakeRecords } from "@/lib/intake/build-records";
import {
  findLeadDuplicates,
  type LeadDuplicateMatch,
  type LeadIntakeInput,
  type LeadIntakeResult,
} from "@/lib/leads/intake";
import { carrierRowToCarrier, leadRowToOpportunity } from "@/lib/supabase/mappers";
import { getSupabase } from "@/lib/supabase/server";
import type { Carrier, Opportunity } from "@/types";

export function isIntakeConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function loadDuplicateContext(): Promise<{ carriers: Carrier[]; opportunities: Opportunity[] }> {
  const supabase = getSupabase();
  if (!supabase) return { carriers: [], opportunities: [] };

  const [{ data: carrierRows, error: carrierError }, { data: leadRows, error: leadError }] =
    await Promise.all([
      supabase.from("carriers").select("*"),
      supabase.from("leads").select("*").neq("stage", "DISMISSED"),
    ]);

  if (carrierError) {
    console.error("[intake] carrier load failed:", carrierError.message);
    return { carriers: [], opportunities: [] };
  }
  if (leadError) {
    console.error("[intake] lead load failed:", leadError.message);
    return { carriers: [], opportunities: [] };
  }

  const carriers = (carrierRows ?? []).map((row) => carrierRowToCarrier(row as Record<string, unknown>));
  const opportunities = (leadRows ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>;
    const carrierId = String(record.carrier_id ?? "");
    const opportunity = leadRowToOpportunity(record, carrierId);
    return opportunity ? [opportunity] : [];
  });

  return { carriers, opportunities };
}

export async function persistPublicIntake(
  input: LeadIntakeInput,
  options?: { acknowledgeDuplicates?: boolean },
): Promise<LeadIntakeResult & { leadId?: string }> {
  const supabase = getSupabase();
  if (!supabase || !isIntakeConfigured()) {
    return {
      status: "invalid",
      errors: ["Consultation intake is not configured on this environment."],
    };
  }

  const { carriers, opportunities } = await loadDuplicateContext();
  const duplicates = findLeadDuplicates({
    email: input.email,
    phone: input.phone,
    usdot: input.usdot,
    carriers,
    opportunities,
  });

  if (duplicates.length > 0 && !options?.acknowledgeDuplicates) {
    return { status: "duplicate_warning", matches: duplicates };
  }

  const { carrier, opportunity, carrierRow, leadRow } = buildIntakeRecords(input);

  const { error: carrierError } = await supabase.from("carriers").insert(carrierRow);
  if (carrierError) {
    console.error("[intake] carrier insert failed:", carrierError.message);
    return { status: "invalid", errors: ["Could not save consultation request. Try again shortly."] };
  }

  const { error: leadError } = await supabase.from("leads").insert(leadRow);
  if (leadError) {
    console.error("[intake] lead insert failed:", leadError.message);
    await supabase.from("carriers").delete().eq("id", carrier.id);
    return { status: "invalid", errors: ["Could not save consultation request. Try again shortly."] };
  }

  return {
    status: "created",
    opportunityId: opportunity.id,
    carrierId: carrier.id,
    leadId: opportunity.id,
  };
}

export type { LeadDuplicateMatch };
