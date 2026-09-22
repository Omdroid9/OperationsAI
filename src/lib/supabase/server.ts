import { createClient } from "@supabase/supabase-js";
import { getProviderStatus } from "@/lib/providers/status";

export function getSupabase() {
  const status = getProviderStatus();
  if (!status.supabase) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
