import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRIEFING_PROMPT_VERSION,
  briefingPrompt,
  buildBriefingSources,
  validateModelBriefing,
  type BriefingSource,
} from "@/lib/regulations/briefing";
import {
  applyValidator,
  buildControls,
  interleave,
  judgeOutputSchema,
  judgePrompt,
  selectEvalNotices,
  summarizeBriefingEval,
  validatorOutcome,
  type CandidateStatement,
  type NoticeResult,
} from "@/lib/regulations/eval/briefing-judge";
import { buildDocketQueries } from "@/lib/regulations/rag/eval/docket-eval";
import {
  FEDERAL_REGISTER_CORPUS,
  FEDERAL_REGISTER_FETCHED_AT,
  chunkEmbeddingText,
  retrieveSimilarNotices,
} from "@/lib/regulations/rag";
import type { Regulation } from "@/types";

/**
 * Briefing eval. Reads committed results by default, so CI needs no key.
 * `npm run eval:briefing:refresh` drafts and judges with Gemini (resumable,
 * paced for the free tier) and rewrites the results and the report.
 */
const DRAFTER = "gemini-3.5-flash-lite"; // the model the product tries first
// A stronger model than the drafter by default. BRIEFING_JUDGE overrides it for a
// refresh (for example when the default has no quota left); the report names the
// judge that was actually used, and results are discarded when it changes.
const DEFAULT_JUDGE = "gemini-3.5-flash";
const JUDGE = process.env.BRIEFING_JUDGE?.trim() || DEFAULT_JUDGE;
const SAMPLE = 24;
const REFRESH = process.env.EVAL_REFRESH_BRIEFING === "1";
const RESULTS_PATH = resolve(process.cwd(), "src/lib/regulations/eval/briefing-results.json");
const REPORT_PATH = resolve(process.cwd(), "docs/research/briefing-eval-latest.md");
const PAUSE_MS = 4_500;

type ResultsFile = {
  promptVersion?: number;
  drafter: string;
  judge: string;
  corpusFetchedAt: string;
  results: NoticeResult[];
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function callGemini(model: string, prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0 },
          }),
          signal: AbortSignal.timeout(60_000),
        },
      );
    } catch (error) {
      // A hung or dropped request is retried a few times before the run gives up.
      if (attempt >= 3) throw error;
      await sleep(PAUSE_MS);
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 6) {
      await sleep(62_000);
      continue;
    }
    if (!response.ok) {
      throw new Error(`${model} ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

const docketRelatives = new Map(
  buildDocketQueries(FEDERAL_REGISTER_CORPUS)
    .filter((query) => query.stratum === "rules_and_notices")
    .map((query) => [query.chunk.id, query]),
);
const notices = selectEvalNotices(FEDERAL_REGISTER_CORPUS, (chunk) => docketRelatives.has(chunk.id), SAMPLE);

/** Deterministic: the same notice always gets the same sources. */
function sourcesFor(notice: (typeof notices)[number]): BriefingSource[] {
  const similar = retrieveSimilarNotices(chunkEmbeddingText(notice), {
    limit: 3,
    excludeIds: [notice.id],
  });
  return buildBriefingSources(
    {
      id: notice.id,
      title: notice.title,
      documentNumber: notice.documentNumber,
      sourceUrl: notice.sourceUrl,
      sourceText: notice.body,
      sourceSummary: notice.summary,
    } as Regulation,
    similar,
  );
}

async function evaluateNotice(index: number): Promise<NoticeResult> {
  const notice = notices[index];
  const sources = sourcesFor(notice);

  const draft = await callGemini(DRAFTER, briefingPrompt(sources));
  await sleep(PAUSE_MS);
  const validated = validateModelBriefing(draft, notice.id, sources);
  const rawPoints = (
    (draft as { points?: Array<{ kind?: unknown; text?: unknown; citations?: unknown }> } | null)
      ?.points ?? []
  )
    .filter((p) => typeof p.text === "string" && p.text.trim())
    .map<CandidateStatement>((p) => ({
      origin: "model",
      kind: typeof p.kind === "string" ? p.kind : "what_it_says",
      text: (p.text as string).trim(),
      citations: Array.isArray(p.citations) ? p.citations.filter((c) => typeof c === "string") : [],
    }));

  // A notice from the other end of the sample, outside this one's sources, supplies the false control.
  const sourceIds = new Set(sources.map((source) => source.id));
  const unrelated =
    notices
      .slice(index + Math.floor(notices.length / 2))
      .concat(notices)
      .find((other) => other.id !== notice.id && !sourceIds.has(other.id) && !docketRelatives.get(notice.id)?.related.has(other.id)) ??
    notices[0];
  const statements = interleave(rawPoints, buildControls(notice, unrelated));

  const judged = judgeOutputSchema.safeParse(await callGemini(JUDGE, judgePrompt(sources, statements)));
  await sleep(PAUSE_MS);
  if (!judged.success) throw new Error(`Judge reply for ${notice.documentNumber} was not usable.`);
  const byIndex = new Map(judged.data.judgements.map((j) => [j.index, j]));

  return {
    documentNumber: notice.documentNumber ?? notice.id,
    title: notice.title,
    sourceIds: sources.map((source) => source.id),
    draftUsable: validated != null,
    statements: statements.map((statement, i) => {
      const judgement = byIndex.get(i);
      if (!judgement) throw new Error(`Judge skipped statement ${i} of ${notice.documentNumber}.`);
      return {
        ...statement,
        verdict: judgement.verdict,
        conclusion: judgement.conclusion,
        ...(statement.origin === "model" ? validatorOutcome(statement.text, validated) : {}),
      };
    }),
  };
}

function load(): ResultsFile {
  return JSON.parse(readFileSync(RESULTS_PATH, "utf8")) as ResultsFile;
}

if (REFRESH) {
  const existing = load();
  const reusable =
    existing.promptVersion === BRIEFING_PROMPT_VERSION &&
    existing.drafter === DRAFTER &&
    existing.judge === JUDGE &&
    existing.corpusFetchedAt === FEDERAL_REGISTER_FETCHED_AT;
  const file: ResultsFile = {
    promptVersion: BRIEFING_PROMPT_VERSION,
    drafter: DRAFTER,
    judge: JUDGE,
    corpusFetchedAt: FEDERAL_REGISTER_FETCHED_AT,
    results: reusable ? existing.results : [],
  };
  for (let i = 0; i < notices.length; i += 1) {
    const documentNumber = notices[i].documentNumber ?? notices[i].id;
    if (file.results.some((result) => result.documentNumber === documentNumber)) continue;
    file.results.push(await evaluateNotice(i));
    writeFileSync(RESULTS_PATH, `${JSON.stringify(file, null, 1)}\n`);
  }
}

const stored = load();
// Validator outcomes are recomputed from the stored drafts on every run, so a
// validator change is re-scored (and guarded in CI) without calling a model.
const noticeByNumber = new Map(notices.map((notice) => [notice.documentNumber ?? notice.id, notice]));
const file: ResultsFile = {
  ...stored,
  results: stored.results.map((result) => {
    const notice = noticeByNumber.get(result.documentNumber);
    return notice ? applyValidator(result, sourcesFor(notice), validateModelBriefing) : result;
  }),
};
const summary = summarizeBriefingEval(file.results);
const hasResults = file.results.length > 0;
const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

describe("briefing eval", () => {
  it("writes the report", () => {
    if (!hasResults) return;
    const kept = file.results.flatMap((r) => r.statements).filter((s) => s.origin === "model" && s.kept);
    const missed = file.results.flatMap((r) =>
      r.statements
        .filter((s) => s.origin === "model" && s.kept && (s.verdict !== "supported" || s.conclusion))
        .map((s) => `- ${r.documentNumber} (${s.verdict}${s.conclusion ? ", conclusion" : ""}): ${s.text}`),
    );
    const wronglyDropped = file.results.flatMap((r) =>
      r.statements
        .filter((s) => s.origin === "model" && !s.kept && s.verdict === "supported" && !s.conclusion)
        .map((s) => `- ${r.documentNumber} (${s.dropReason}): ${s.text}`),
    );
    const lines = [
      "# Briefing eval",
      "",
      "Generated by `npm run eval:briefing:refresh`. Do not edit by hand.",
      "",
      `${summary.notices} real FMCSA notices from the Federal Register snapshot of ${file.corpusFetchedAt}, each with its retrieved related notices as sources. \`${file.drafter}\` drafts the briefing; \`${file.judge}\` judges every drafted statement against the sources it cites, before the validator runs. Temperature 0.`,
      "",
      "## What staff see",
      "",
      "| | Statements | Judged supported | Partly | Unsupported | States a conclusion |",
      "| --- | --- | --- | --- | --- | --- |",
      `| As drafted | ${summary.drafted} | ${pct(summary.draftedFaithfulness)} | | | |`,
      `| After the validator | ${summary.kept} | ${pct(summary.keptFaithfulness)} | ${summary.keptPartly} | ${summary.keptUnsupported} | ${summary.keptConclusions} |`,
      "",
      `Average ${(kept.length / Math.max(1, summary.notices)).toFixed(1)} statements per briefing after validation. ${summary.unusableDrafts} of ${summary.notices} drafts were not usable JSON.`,
      "",
      "## The validator against the judge",
      "",
      `- Statements the judge faulted: ${summary.faulted}. The validator removed ${pct(summary.catchRate)} of them.`,
      `- Statements the judge accepted: ${summary.accepted}. The validator removed ${pct(summary.falseDropRate)} of them anyway.`,
      `- Removals by reason: ${Object.entries(summary.dropReasons).map(([reason, count]) => `${reason} ${count}`).join(", ") || "none"}.`,
      "",
      "## Can the judge be trusted?",
      "",
      "Each notice carries two statements with known answers, mixed in with the drafted ones.",
      "",
      `- Sentence quoted from the notice (should be supported): ${summary.controlSupportedCorrect} of ${summary.controlSupportedTotal} judged supported.`,
      `- Sentence quoted from an unrelated notice (should be unsupported): ${summary.controlUnsupportedCorrect} of ${summary.controlUnsupportedTotal} judged unsupported.`,
      "",
      file.judge === file.drafter
        ? "The judge here is the same model that drafted the statements, because the stronger default judge had no quota. A model tends to accept its own output, so read these as optimistic and re-run with the default judge (`npm run eval:briefing:refresh`) when quota allows. The controls bound the risk; they do not remove it."
        : "Both models are from the same family, so the judge may share the drafter's blind spots. The controls bound that risk; they do not remove it.",
      "",
      "## Faulted statements that reached staff",
      "",
      ...(missed.length ? missed : ["None."]),
      "",
      "## Accepted statements the validator removed",
      "",
      ...(wronglyDropped.length ? wronglyDropped : ["None."]),
      "",
    ];
    writeFileSync(REPORT_PATH, lines.join("\n"));
  });

  it("was drafted with the current prompt", () => {
    if (!hasResults) return;
    // If this fails the prompt changed: run `npm run eval:briefing:refresh`.
    expect(file.promptVersion).toBe(BRIEFING_PROMPT_VERSION);
  });

  // Floors sit below the measured values and guard the validator and prompt in CI,
  // where outcomes are recomputed from the stored drafts. They are loose enough to
  // survive a stricter judge; see the report for the measured numbers.
  it("keeps the judge honest on statements with known answers", () => {
    if (!hasResults) return;
    expect(summary.controlSupportedCorrect / summary.controlSupportedTotal).toBeGreaterThanOrEqual(0.9);
    expect(summary.controlUnsupportedCorrect / summary.controlUnsupportedTotal).toBeGreaterThanOrEqual(0.9);
  });

  it("shows staff supported statements and no conclusions", () => {
    if (!hasResults) return;
    expect(summary.unusableDrafts).toBe(0);
    expect(summary.keptFaithfulness).toBeGreaterThanOrEqual(0.8);
    expect(summary.keptConclusions).toBe(0);
  });

  it("does not throw away statements the judge accepted", () => {
    if (!hasResults) return;
    expect(summary.falseDropRate).toBeLessThanOrEqual(0.1);
  });

  it("covers the whole fixed sample", () => {
    if (!hasResults) return;
    expect(file.results.map((r) => r.documentNumber).sort()).toEqual(
      notices.map((n) => n.documentNumber ?? n.id).sort(),
    );
  });
});

export { summary as briefingEvalSummary, hasResults as briefingEvalHasResults };
