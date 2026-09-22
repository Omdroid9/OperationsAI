import { LIVE_MODE_SETUP, readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { GEMINI_REGULATION_FALLBACK, extractJsonFromParts } from "@/lib/providers/gemini";
import { regulationAnalysisSchema } from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

const REGULATION_SCHEMA_HINT = `{
  "agency": "string",
  "title": "string",
  "category": "string",
  "published_date": "YYYY-MM-DD or null",
  "effective_date": "YYYY-MM-DD or null",
  "deadline": "YYYY-MM-DD or null",
  "affected_segment": "string",
  "required_action": "string",
  "confidence": 0.0,
  "source_summary": "string"
}`;

export async function POST(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  const body = (await request.json()) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Paste regulation text first." }, { status: 400 });
  }

  const { value, live, error } = await extractJsonFromParts(
    [
      {
        text: `Extract structured regulatory information for a trucking compliance operations team.
Do not invent legal conclusions. If a field is unknown, use null.
Conservative wording only.
Return JSON matching this schema exactly:
${REGULATION_SCHEMA_HINT}

Source text:
${text.slice(0, 12000)}`,
      },
    ],
    GEMINI_REGULATION_FALLBACK,
    { allowDemoFallback: demoMode },
  );

  const parsed = regulationAnalysisSchema.safeParse(value);
  if (!demoMode && (!live || !parsed.success)) {
    return NextResponse.json(
      {
        error: error ?? `Live regulation analysis unavailable. ${LIVE_MODE_SETUP}`,
        live: false,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    analysis: parsed.success ? parsed.data : GEMINI_REGULATION_FALLBACK,
    live: live && parsed.success,
    ...(process.env.NODE_ENV === "development" && !live
      ? { hint: error ?? (parsed.success ? undefined : "Gemini response did not match the expected schema.") }
      : {}),
  });
}
