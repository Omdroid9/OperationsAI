import { requireStaffSession } from "@/lib/auth/require-session";
import { createInitialState } from "@/data/seed";
import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { getProviderStatus } from "@/lib/providers/status";
import { previewRegulationMatches } from "@/lib/regulations/match";
import {
  buildRegulationRagResult,
  emptyRegulationRagResult,
} from "@/lib/regulations/rag";
import { buildRegulationRagResultLive } from "@/lib/regulations/rag/live";
import type { Regulation, RegulationMatch } from "@/types";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_WORKSPACE_REGULATIONS = 50;

/** The fields retrieval reads. Other Regulation fields pass through untouched. */
const regulationSchema = z.looseObject({
  id: z.string().min(1).max(200),
  title: z.string().max(1_000),
  agency: z.string().max(200),
  category: z.string().max(200),
  affectedSegment: z.string().max(2_000),
  requiredAction: z.string().max(2_000),
  sourceSummary: z.string().max(5_000),
  sourceText: z.string().max(200_000),
  status: z.enum(["analyzed", "needs_review"]),
  sourceUrl: z.string().nullable(),
  publishedDate: z.string().nullable(),
  documentNumber: z.string().nullable().optional(),
});

const matchSchema = z.looseObject({
  carrierId: z.string(),
  matchType: z.enum(["confirmed", "potential", "unknown"]),
  reason: z.string(),
});

const bodySchema = z.object({
  regulationId: z.string().max(200).optional(),
  regulation: regulationSchema.optional(),
  matches: z.array(matchSchema).max(500).optional(),
  workspaceRegulations: z.array(regulationSchema).max(MAX_WORKSPACE_REGULATIONS).optional(),
});

/**
 * Similar notices for a regulation.
 * Demo Mode, or no GEMINI_API_KEY: lexical retrieval over the seeded index, no network.
 * Live with a key: Gemini embeddings + BM25. A provider failure falls back to lexical
 * and the response says which one ran. Retrieval never produces legal conclusions.
 */
export async function POST(request: Request) {
  const session = await requireStaffSession();
  if (!session.ok) return session.response;

  const demoMode = readDemoModeFromRequest(request);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid retrieval request." }, { status: 400 });
  }
  const body = parsed.data;

  const seed = createInitialState();
  const regulation =
    (body.regulation as Regulation | undefined) ??
    seed.regulations.find((item) => item.id === body.regulationId) ??
    null;

  if (!regulation) {
    return NextResponse.json(
      { error: "Regulation not found for retrieval." },
      { status: 404 },
    );
  }

  if (regulation.status === "needs_review" && !regulation.sourceText.trim()) {
    return NextResponse.json({
      result: emptyRegulationRagResult(regulation.id),
      live: false,
    });
  }

  const input = {
    regulation,
    matches:
      (body.matches as RegulationMatch[] | undefined) ??
      previewRegulationMatches(regulation, seed.carriers, seed.signals),
    workspaceRegulations:
      (body.workspaceRegulations as Regulation[] | undefined) ?? seed.regulations,
    limit: 4,
  };

  if (demoMode || !getProviderStatus().gemini) {
    return NextResponse.json({
      result: buildRegulationRagResult(input),
      live: false,
      provider: "seeded_lexical_index",
    });
  }

  const outcome = await buildRegulationRagResultLive(input);
  if (outcome.error) {
    console.error("[reglens/similar] embedding fallback:", outcome.error);
  }
  return NextResponse.json({
    result: outcome.result,
    live: outcome.live,
    provider: outcome.live ? "gemini_embeddings" : "seeded_lexical_index",
  });
}
