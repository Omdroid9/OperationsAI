import { getSessionProfile } from "@/lib/auth/profile";
import { NextResponse } from "next/server";

export async function requireStaffSession(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const authRequired = process.env.SKYOS_AUTH_REQUIRED === "true";
  if (!authRequired) {
    return { ok: true, userId: "anonymous" };
  }

  const session = await getSessionProfile();
  if (!session.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }

  return { ok: true, userId: session.userId };
}
