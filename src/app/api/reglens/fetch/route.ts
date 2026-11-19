import { requireStaffSession } from "@/lib/auth/require-session";
import {
  federalRegisterToImportEntry,
  fetchFmcsaFederalRegister,
} from "@/lib/regulations/federal-register";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await requireStaffSession();
  if (!session.ok) return session.response;

  try {
    const documents = await fetchFmcsaFederalRegister(20);
    const entries = documents.map(federalRegisterToImportEntry);
    return NextResponse.json({
      ok: true,
      fetched: documents.length,
      entries,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Federal Register fetch failed",
      },
      { status: 502 },
    );
  }
}
