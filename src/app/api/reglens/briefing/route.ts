import { requireStaffSession } from "@/lib/auth/require-session";
import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { extractJsonFromParts } from "@/lib/providers/gemini";
import { getProviderStatus } from "@/lib/providers/status";
import {
  THIS_NOTICE_ID,
  briefingPrompt,
  validateModelBriefing,
  type BriefingSource,
} from "@/lib/regulations/briefing";
import { NextResponse } from "next/server";
import { z } from "zod";

const sourceSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().max(1_000),
  documentNumber: z.string().max(100).nullable(),
  url: z.string().max(2_000).nullable(),
  text: z.string().min(1).max(6_000),
});

const bodySchema = z.object({
  regulationId: z.string().min(1).max(200),
  sources: z.array(sourceSchema).min(1).max(8),
});

/**
 * Drafts a cited briefing from the sources the client retrieved, then removes
 * every statement that fails validation. Returns `briefing: null` when no model
 * draft is usable; the caller shows the quoted (extractive) briefing instead.
 */
export async function POST(request: Request) {
  const session = await requireStaffSession();
  if (!session.ok) return session.response;

  const demoMode = readDemoModeFromRequest(request);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.sources[0].id !== THIS_NOTICE_ID) {
    return NextResponse.json({ error: "Invalid briefing request." }, { status: 400 });
  }
  const { regulationId } = parsed.data;
  const sources: BriefingSource[] = parsed.data.sources;

  if (demoMode || !getProviderStatus().gemini) {
    return NextResponse.json({ briefing: null, live: false });
  }

  const { value, live, error } = await extractJsonFromParts<unknown>(
    [{ text: briefingPrompt(sources) }],
    null,
    { allowDemoFallback: false },
  );
  const briefing = live ? validateModelBriefing(value, regulationId, sources) : null;
  if (!briefing || briefing.points.length === 0) {
    if (error) console.error("[reglens/briefing] model draft unavailable:", error);
    return NextResponse.json({
      briefing: null,
      live: false,
      droppedAll: Boolean(briefing && briefing.dropped.length > 0),
    });
  }
  return NextResponse.json({ briefing, live: true });
}
