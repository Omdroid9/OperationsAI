import { getProviderStatus } from "@/lib/providers/status";

export function isSupabaseEntityReadEnabled(demoMode: boolean): boolean {
  if (demoMode) return false;
  const flag = process.env.SKYOS_SUPABASE_SOT?.trim().toLowerCase();
  if (flag === "false") return false;
  const status = getProviderStatus();
  return status.supabase && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
