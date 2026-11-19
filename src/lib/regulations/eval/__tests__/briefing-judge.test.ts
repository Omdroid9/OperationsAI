import { describe, expect, it } from "vitest";
import { THIS_NOTICE_ID } from "@/lib/regulations/briefing";
import {
  buildControls,
  interleave,
  judgeOutputSchema,
  selectEvalNotices,
  summarizeBriefingEval,
  validatorOutcome,
  type JudgedStatement,
  type NoticeResult,
} from "@/lib/regulations/eval/briefing-judge";
import type { RegulationChunk } from "@/lib/regulations/rag/types";

const chunk = (id: string, body: string): RegulationChunk =>
  ({ id, title: id, body, documentNumber: id }) as RegulationChunk;

const s = (overrides: Partial<JudgedStatement>): JudgedStatement => ({
  origin: "model",
  text: "t",
  citations: [THIS_NOTICE_ID],
  verdict: "supported",
  conclusion: false,
  kept: true,
  ...overrides,
});
const notice = (statements: JudgedStatement[], draftUsable = true): NoticeResult => ({
  documentNumber: "d",
  title: "t",
  sourceIds: [THIS_NOTICE_ID],
  draftUsable,
  statements,
});

describe("summarizeBriefingEval", () => {
  const summary = summarizeBriefingEval([
    notice([
      s({}), // good, kept
      s({ verdict: "unsupported", kept: false, dropReason: "unsupported_statement" }), // bad, caught
      s({ verdict: "partly" }), // bad, missed
      s({ kept: false, dropReason: "unsupported_figure" }), // good, wrongly dropped
      s({ conclusion: true, kept: false, dropReason: "restricted_wording" }), // conclusion, caught
      s({ origin: "control_supported", kept: undefined }),
      s({ origin: "control_unsupported", verdict: "supported", kept: undefined }), // judge fooled
    ]),
    notice([], false),
  ]);

  it("separates what was drafted from what staff see", () => {
    expect(summary).toMatchObject({ notices: 2, unusableDrafts: 1, drafted: 5, kept: 2 });
    expect(summary.draftedFaithfulness).toBeCloseTo(3 / 5);
    expect(summary.keptFaithfulness).toBeCloseTo(1 / 2);
    expect(summary.keptPartly).toBe(1);
  });

  it("scores the validator against the judge", () => {
    expect(summary.faulted).toBe(3);
    expect(summary.catchRate).toBeCloseTo(2 / 3);
    expect(summary.accepted).toBe(2);
    expect(summary.falseDropRate).toBeCloseTo(1 / 2);
    expect(summary.dropReasons).toEqual({
      unsupported_statement: 1,
      unsupported_figure: 1,
      restricted_wording: 1,
    });
  });

  it("scores the judge on controls and keeps them out of model numbers", () => {
    expect(summary).toMatchObject({
      controlSupportedCorrect: 1,
      controlSupportedTotal: 1,
      controlUnsupportedCorrect: 0,
      controlUnsupportedTotal: 1,
    });
  });

  it("returns zeros, not NaN, for an empty run", () => {
    expect(summarizeBriefingEval([])).toMatchObject({ keptFaithfulness: 0, catchRate: 0 });
  });
});

describe("controls and sampling", () => {
  const own = "Motor carriers must keep a record of accidents involving their commercial motor vehicles.";
  const foreign = "The agency raises annual registration fees collected by participating States next year.";

  it("builds one true and one false control, both cited to the notice", () => {
    const controls = buildControls(chunk("a", own), chunk("b", foreign));
    expect(controls).toEqual([
      { origin: "control_supported", text: own, citations: [THIS_NOTICE_ID] },
      { origin: "control_unsupported", text: foreign, citations: [THIS_NOTICE_ID] },
    ]);
  });

  it("does not use a foreign sentence the notice also contains", () => {
    const controls = buildControls(chunk("a", `${own} ${foreign}`), chunk("b", foreign));
    expect(controls.map((c) => c.origin)).toEqual(["control_supported"]);
  });

  it("interleaves controls among drafted statements", () => {
    const model = ["m1", "m2", "m3"].map((text) => ({ origin: "model" as const, text, citations: [] }));
    const controls = buildControls(chunk("a", own), chunk("b", foreign));
    expect(interleave(model, controls).map((c) => c.origin)).toEqual([
      "model",
      "control_supported",
      "model",
      "control_unsupported",
      "model",
    ]);
  });

  it("selects a fixed, evenly spread sample", () => {
    const corpus = Array.from({ length: 30 }, (_, i) => chunk(`fr_${String(i).padStart(2, "0")}`, "x".repeat(300)));
    const picked = selectEvalNotices(corpus, () => true, 10);
    expect(picked).toHaveLength(10);
    expect(picked.map((c) => c.id)).toEqual(selectEvalNotices([...corpus].reverse(), () => true, 10).map((c) => c.id));
    expect(picked[1].id).toBe("fr_03");
  });
});

describe("validatorOutcome and judge schema", () => {
  it("reports kept, dropped with reason, and unusable drafts", () => {
    const validated = {
      points: [{ text: "kept one" }],
      dropped: [{ text: "bad one", reason: "no_citation" }],
    } as never;
    expect(validatorOutcome("kept one", validated)).toEqual({ kept: true });
    expect(validatorOutcome("bad one", validated)).toEqual({ kept: false, dropReason: "no_citation" });
    expect(validatorOutcome("anything", null)).toEqual({ kept: false, dropReason: "unusable_draft" });
  });

  it("rejects a judge reply with an unknown verdict", () => {
    expect(
      judgeOutputSchema.safeParse({ judgements: [{ index: 0, verdict: "maybe", conclusion: false }] }).success,
    ).toBe(false);
  });
});
