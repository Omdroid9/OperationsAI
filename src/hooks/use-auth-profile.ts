"use client";

import { useQuery } from "@tanstack/react-query";
import { isAuthRequired } from "@/lib/supabase/client";

export interface AuthProfileResponse {
  authenticated: boolean;
  authRequired: boolean;
  userId?: string;
  email?: string | null;
  profile?: {
    id: string;
    displayName: string;
    role: string;
    staffKey: string | null;
  } | null;
}

async function fetchAuthProfile(): Promise<AuthProfileResponse> {
  const response = await fetch("/api/auth/profile", { cache: "no-store" });
  if (response.status === 401) {
    return { authenticated: false, authRequired: true, profile: null };
  }
  if (!response.ok) {
    throw new Error("Profile could not be loaded.");
  }
  return response.json() as Promise<AuthProfileResponse>;
}

export function useAuthProfile() {
  const authRequired = isAuthRequired();
  return useQuery({
    queryKey: ["auth-profile"],
    queryFn: fetchAuthProfile,
    enabled: authRequired,
    staleTime: 30_000,
  });
}
