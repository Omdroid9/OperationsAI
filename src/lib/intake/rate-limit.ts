import { hashClientIp, hashEmail } from "@/lib/intake/hash";
import { getSupabase } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

function intakeLimit(): number {
  const parsed = Number(process.env.INTAKE_RATE_LIMIT_PER_HOUR);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT;
}

export async function checkIntakeRateLimit(request: Request, email: string | null): Promise<boolean> {
  const supabase = getSupabase();
  const ipHash = hashClientIp(request);
  const emailHash = hashEmail(email);
  if (!supabase || (!ipHash && !emailHash)) return true;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const limit = intakeLimit();

  if (ipHash) {
    const { count, error } = await supabase
      .from("intake_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since)
      .in("status", ["accepted", "rejected"]);
    if (!error && count != null && count >= limit) return false;
  }

  if (emailHash) {
    const { count, error } = await supabase
      .from("intake_requests")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("created_at", since)
      .in("status", ["accepted", "rejected"]);
    if (!error && count != null && count >= limit) return false;
  }

  return true;
}

export async function recordIntakeRequest(input: {
  request: Request;
  email: string | null;
  leadId?: string | null;
  status: "accepted" | "rejected" | "rate_limited" | "honeypot";
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("intake_requests").insert({
    ip_hash: hashClientIp(input.request),
    email_hash: hashEmail(input.email),
    lead_id: input.leadId ?? null,
    status: input.status,
  });

  if (error) {
    console.error("[intake] audit insert failed:", error.message);
  }
}
