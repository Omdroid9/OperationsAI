import { LIVE_MODE_SETUP, readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { extractJsonFromParts } from "@/lib/providers/gemini";
import { REGULATORY_INBOX } from "@/lib/regulations/inbox";
import { regulationAnalysisSchema } from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  if (!demoMode) {
    return NextResponse.json(
      {
        notices: [],
        count: 0,
        error: `Seeded regulatory inbox is disabled while Demo Mode is off. ${LIVE_MODE_SETUP}`,
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    existingTitles?: string[];
    enrich?: boolean;
  };
  const existingTitles = new Set(body.existingTitles ?? []);
  const pending = REGULATORY_INBOX.filter((notice) => !existingTitles.has(notice.analysis.title));

  if (pending.length === 0) {
    return NextResponse.json({ notices: [], count: 0 });
  }

  const notices = [];
  for (const notice of pending) {
    if (body.enrich && process.env.GEMINI_API_KEY) {
      const { value, live } = await extractJsonFromParts(
        [
          {
            text: `Extract structured regulatory information for a trucking compliance operations team.
Do not invent legal conclusions. If a field is unknown, use null.
Conservative wording only.

Source text:
${notice.sourceText.slice(0, 12000)}`,
          },
        ],
        notice.analysis,
        { allowDemoFallback: true },
      );
      const parsed = regulationAnalysisSchema.safeParse(value);
      notices.push({
        id: notice.id,
        sourceText: notice.sourceText,
        analysis: parsed.success ? parsed.data : notice.analysis,
        live: live && parsed.success,
      });
      continue;
    }
    notices.push({
      id: notice.id,
      sourceText: notice.sourceText,
      analysis: notice.analysis,
      live: false,
    });
  }

  return NextResponse.json({ notices, count: notices.length });
}

export async function GET(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  if (!demoMode) {
    return NextResponse.json({ count: 0 });
  }
  const { searchParams } = new URL(request.url);
  const titles = searchParams.get("titles")?.split("|").filter(Boolean) ?? [];
  const pending = REGULATORY_INBOX.filter((notice) => !titles.includes(notice.analysis.title));
  return NextResponse.json({ count: pending.length });
}
