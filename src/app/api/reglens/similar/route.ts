import { createInitialState } from "@/data/seed";
import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { previewRegulationMatches } from "@/lib/regulations/match";
import {
  buildRegulationRagResult,
  emptyRegulationRagResult,
} from "@/lib/regulations/rag";
import type { Regulation, RegulationMatch } from "@/types";
import { NextResponse } from "next/server";

/**
 * Demo-safe RegLens retrieval.
 * Uses a seeded lexical index — no embedding provider required.
 * Live mode currently uses the same index so the product loop stays coherent
 * until a vector store is wired; retrieval never invents legal conclusions.
 */
export async function POST(request: Request) {
  readDemoModeFromRequest(request);

  const body = (await request.json()) as {
    regulationId?: string;
    regulation?: Regulation;
    matches?: RegulationMatch[];
  };

  const seed = createInitialState();
  const regulation =
    body.regulation ??
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

  const matches =
    body.matches ??
    previewRegulationMatches(regulation, seed.carriers, seed.signals);

  const result = buildRegulationRagResult({
    regulation,
    matches,
    workspaceRegulations: seed.regulations,
    limit: 4,
  });

  return NextResponse.json({
    result,
    live: false,
    provider: "seeded_lexical_index",
  });
}
