import { demoStore } from "@/lib/demo/store";
import { findProspectWorkspaceMatch } from "@/lib/prospecting/dedupe";
import { discoveredProspectSaveSchema } from "@/lib/prospecting/save-schema";
import type { CensusProspectSaveInput } from "@/lib/prospecting/types";
import { NextResponse } from "next/server";

/** @deprecated Prefer client-side `ingestCensusProspect` via repository — server store is not synced to the browser. */
export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const parsed = discoveredProspectSaveSchema.safeParse(body.prospect);
  if (!parsed.success) {
    return NextResponse.json({ error: "Prospect payload is invalid." }, { status: 400 });
  }

  const sourceRef = typeof body.sourceRef === "string" ? body.sourceRef.trim() : "";
  const queriedAt =
    typeof body.queriedAt === "string" ? body.queriedAt : parsed.data.queriedAt;
  if (!sourceRef) {
    return NextResponse.json({ error: "Query provenance (sourceRef) is required." }, { status: 400 });
  }

  const prospect = parsed.data;
  const workspace = demoStore.getState();
  const duplicate = findProspectWorkspaceMatch({
    usdot: prospect.usdot,
    email: prospect.email,
    phone: prospect.phone,
    carriers: workspace.carriers,
    opportunities: workspace.opportunities,
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `Already in workspace as ${duplicate.label} (matched on ${duplicate.matchOn}).`,
        duplicate,
      },
      { status: 409 },
    );
  }

  const input: CensusProspectSaveInput = {
    usdot: prospect.usdot,
    legalName: prospect.legalName,
    dbaName: prospect.dbaName ?? null,
    city: prospect.city,
    state: prospect.state,
    powerUnits: prospect.powerUnits,
    drivers: prospect.drivers ?? 0,
    phone: prospect.phone ?? null,
    email: prospect.email ?? null,
    carrierOperation: prospect.carrierOperation ?? null,
    classdef: prospect.classdef ?? null,
    addDate: prospect.addDate ?? null,
    sourceRef,
    queriedAt,
    reviewReason: typeof body.reviewReason === "string" ? body.reviewReason : undefined,
    outreachReadiness:
      body.outreachReadiness === "ready_to_review" ||
      body.outreachReadiness === "needs_review" ||
      body.outreachReadiness === "low_confidence"
        ? body.outreachReadiness
        : undefined,
    outreachReadinessReason:
      typeof body.outreachReadinessReason === "string" ? body.outreachReadinessReason : undefined,
    discoveryScore: typeof body.discoveryScore === "number" ? body.discoveryScore : undefined,
  };

  try {
    const result = demoStore.ingestCensusProspect(input);
    return NextResponse.json({
      opportunityId: result.opportunityId,
      created: result.created,
      recordKind: "prospect",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save prospect.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
