import { describe, expect, it } from "vitest";
import { createInitialState } from "@/data/seed";
import {
  THIS_NOTICE_ID,
  buildBriefingSources,
  buildExtractiveBriefing,
  sentences,
  validateModelBriefing,
  type BriefingSource,
} from "@/lib/regulations/briefing";
import { SEEDED_REGULATION_CORPUS, buildRegulationRagResult } from "@/lib/regulations/rag";

const seed = createInitialState();
const regulation = seed.regulations.find((item) => item.id === "reg_new-entrant-packet")!;
const notices = buildRegulationRagResult({
  regulation,
  corpus: SEEDED_REGULATION_CORPUS,
}).similarNotices;

const sources: BriefingSource[] = [
  {
    id: THIS_NOTICE_ID,
    title: "New Entrant notice",
    documentNumber: null,
    url: null,
    text: "Interstate New Entrant motor carriers must complete an updated safety assurance packet before October 15, 2026.",
  },
  {
    id: "fr_2025-1",
    title: "ELD guidance",
    documentNumber: "2025-1",
    url: null,
    text: "Carriers should confirm electronic logging device vendor compatibility and retain supporting documents.",
  },
];

const validate = (points: unknown[]) => validateModelBriefing({ points }, "reg_1", sources)!;

describe("buildExtractiveBriefing", () => {
  const briefing = buildExtractiveBriefing(regulation, notices);

  it("quotes every statement verbatim from the source it cites", () => {
    expect(briefing.points.length).toBeGreaterThan(0);
    const byId = new Map(briefing.sources.map((source) => [source.id, source]));
    for (const point of briefing.points) {
      expect(point.citations).toHaveLength(1);
      const text = byId.get(point.citations[0])!.text.replace(/\s+/g, " ");
      expect(text).toContain(point.text);
    }
  });

  it("lists the notice under review first, then the retrieved notices", () => {
    expect(briefing.sources[0].id).toBe(THIS_NOTICE_ID);
    expect(briefing.sources.slice(1).map((s) => s.id)).toEqual(notices.map((n) => n.chunk.id));
    expect(buildBriefingSources(regulation, [])).toHaveLength(1);
  });
});

describe("validateModelBriefing", () => {
  it("keeps a supported, cited statement", () => {
    const briefing = validate([
      {
        kind: "what_it_says",
        text: "New Entrant carriers must complete an updated safety assurance packet before October 15, 2026.",
        citations: [THIS_NOTICE_ID],
      },
    ]);
    expect(briefing.points).toHaveLength(1);
    expect(briefing.dropped).toEqual([]);
    expect(briefing.method).toBe("model_cited");
  });

  it("drops a statement with no citation", () => {
    const briefing = validate([{ kind: "related_notice", text: "Confirm ELD vendor compatibility.", citations: [] }]);
    expect(briefing.points).toEqual([]);
    expect(briefing.dropped[0].reason).toBe("no_citation");
  });

  it("drops a statement that cites a source it was not given", () => {
    const briefing = validate([
      { kind: "related_notice", text: "Carriers should confirm vendor compatibility.", citations: ["fr_9999-invented"] },
    ]);
    expect(briefing.dropped[0].reason).toBe("unknown_citation");
  });

  it("removes invented ids but keeps the statement when a real one remains", () => {
    const briefing = validate([
      {
        kind: "related_notice",
        text: "Carriers should confirm electronic logging device vendor compatibility.",
        citations: ["fr_2025-1", "fr_made-up"],
      },
    ]);
    expect(briefing.points[0].citations).toEqual(["fr_2025-1"]);
  });

  it("drops a date the cited source does not contain", () => {
    const briefing = validate([
      {
        kind: "what_it_says",
        text: "New Entrant carriers must complete the safety assurance packet before November 30, 2026.",
        citations: [THIS_NOTICE_ID],
      },
    ]);
    expect(briefing.dropped[0].reason).toBe("unsupported_figure");
  });

  it("drops a statement whose content is not in the cited source", () => {
    const briefing = validate([
      {
        kind: "what_it_says",
        text: "Hazmat shippers need new placards and tank inspections for propane trailers.",
        citations: [THIS_NOTICE_ID],
      },
    ]);
    expect(briefing.dropped[0].reason).toBe("unsupported_statement");
  });

  it("drops a citation to the wrong source even when another source would support it", () => {
    const briefing = validate([
      {
        kind: "related_notice",
        text: "Carriers should confirm electronic logging device vendor compatibility and retain supporting documents.",
        citations: [THIS_NOTICE_ID],
      },
    ]);
    expect(briefing.dropped[0].reason).toBe("unsupported_statement");
  });

  it("drops wording the product does not allow", () => {
    for (const text of [
      "New Entrant carriers without a packet are noncompliant.",
      "This is a violation for interstate New Entrant motor carriers.",
      "Interstate New Entrant motor carriers are definitely affected.",
    ]) {
      expect(validate([{ kind: "what_it_says", text, citations: [THIS_NOTICE_ID] }]).dropped[0].reason).toBe(
        "restricted_wording",
      );
    }
  });

  it("drops suggested next steps, which no source can support", () => {
    const briefing = validate([
      {
        kind: "review_step",
        text: "Carriers should confirm electronic logging device vendor compatibility.",
        citations: ["fr_2025-1"],
      },
    ]);
    expect(briefing.points).toEqual([]);
    expect(briefing.dropped[0].reason).toBe("not_from_source");
  });

  it("allows a restricted word when the cited notice itself uses it", () => {
    const withViolations: BriefingSource[] = [
      { ...sources[0], text: "CDL holders must self-report motor vehicle violations to their State of domicile." },
    ];
    const kept = validateModelBriefing(
      { points: [{ kind: "what_it_says", text: "CDL holders must self-report motor vehicle violations to their State.", citations: [THIS_NOTICE_ID] }] },
      "reg_1",
      withViolations,
    )!;
    expect(kept.points).toHaveLength(1);
    // The same word is still refused against a source that does not contain it.
    expect(
      validate([{ kind: "what_it_says", text: "Interstate New Entrant motor carriers face violations.", citations: [THIS_NOTICE_ID] }])
        .dropped[0].reason,
    ).toBe("restricted_wording");
  });

  it("does not treat a cited notice's own document number as an unsupported figure", () => {
    const briefing = validate([
      {
        kind: "related_notice",
        text: "Notice 2025-1 says carriers should confirm electronic logging device vendor compatibility.",
        citations: ["fr_2025-1"],
      },
    ]);
    expect(briefing.points).toHaveLength(1);
    // A document number of a notice that was not cited is still a figure to check.
    expect(
      validate([
        {
          kind: "related_notice",
          text: "Notice 2024-77 says carriers should confirm electronic logging device vendor compatibility.",
          citations: ["fr_2025-1"],
        },
      ]).dropped[0].reason,
    ).toBe("unsupported_figure");
  });

  it("returns null for a payload that is not a briefing", () => {
    expect(validateModelBriefing("sorry, I cannot", "reg_1", sources)).toBeNull();
    expect(validateModelBriefing({ points: [{ text: 5 }] }, "reg_1", sources)).toBeNull();
  });
});

describe("sentences", () => {
  it("skips header lines and does not split after 'No.'", () => {
    const text = [
      "FEDERAL MOTOR CARRIER SAFETY ADMINISTRATION",
      "Docket No. FMCSA-2026-0144",
      "Published: August 1, 2026",
      "",
      "This notice applies to carriers under Docket No. FMCSA-2026-0144 in interstate commerce. Carriers should review device compatibility before the deadline.",
    ].join("\n");
    expect(sentences(text)).toEqual([
      "This notice applies to carriers under Docket No. FMCSA-2026-0144 in interstate commerce.",
      "Carriers should review device compatibility before the deadline.",
    ]);
  });
});

describe("extractive briefing content", () => {
  it("never repeats a statement and prefers the related sentence over boilerplate", () => {
    const boilerplate =
      "In accordance with the Paperwork Reduction Act of 1995, the agency announces its plan to submit the request described below.";
    const specific =
      "Interstate New Entrant carriers must retain hours-of-service records from an electronic logging device.";
    const related = (id: string) =>
      ({ chunk: { id, title: id, documentNumber: null, sourceUrl: null, body: `${boilerplate} ${specific}` } }) as never;
    const briefing = buildExtractiveBriefing(regulation, [related("a"), related("b")]);
    const texts = briefing.points.map((p) => p.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts).toContain(specific);
    expect(texts).not.toContain(boilerplate);
  });
});
