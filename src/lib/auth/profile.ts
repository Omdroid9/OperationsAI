import { createSupabaseServerClient } from "@/lib/supabase/server-auth";
import type { StaffRole } from "@/types";

export interface StaffProfile {
  id: string;
  displayName: string;
  role: StaffRole;
  staffKey: string | null;
}

function mapProfileRow(row: {
  id: string;
  display_name: string;
  role: string;
  staff_key: string | null;
}): StaffProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role as StaffRole,
    staffKey: row.staff_key,
  };
}

export async function getSessionProfile(): Promise<{
  userId: string | null;
  email: string | null;
  profile: StaffProfile | null;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { userId: null, email: null, profile: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, profile: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, staff_key")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return { userId: user.id, email: user.email ?? null, profile: null };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: mapProfileRow(data),
  };
}
