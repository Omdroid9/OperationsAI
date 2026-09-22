import {
  createSupabaseBrowserClient,
  isAuthConfigured,
  isAuthRequired,
} from "@/lib/supabase/client";

/** @deprecated Use createSupabaseBrowserClient from @/lib/supabase/client */
export function getSupabaseBrowserClient() {
  return createSupabaseBrowserClient();
}

export { isAuthRequired, isAuthConfigured };
