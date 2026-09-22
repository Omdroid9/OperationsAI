import { getSessionProfile } from "@/lib/auth/profile";
import { isAuthRequired } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isAuthRequired()) {
    return NextResponse.json({ authenticated: false, authRequired: false, profile: null });
  }

  const session = await getSessionProfile();

  if (!session.userId) {
    return NextResponse.json({ authenticated: false, authRequired: true, profile: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    authRequired: true,
    userId: session.userId,
    email: session.email,
    profile: session.profile,
  });
}
