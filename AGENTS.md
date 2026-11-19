<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SkyOS

Operations workspace for trucking compliance service companies.

**From signal to customer to compliance.**

## Philosophy

Detect → Prioritize → Qualify → Convert → Fulfill → Monitor

```text
Inbound lead or Census discovery → Review → Qualification → CRM → Conversion → Case → Monitoring
```

SkySignal identifies possible opportunities from observable information. It does not claim purchasing intent. Human review is required before outreach. Inbound intake is the primary qualification path; public-data discovery is secondary.

## Stack

- Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Astryx (workspace shell)
- Geist / Geist Mono, Lucide, next-themes, GSAP (marketing motion)
- TanStack Query, TanStack Table, Zod

## Rules

- Use repository interfaces. Pages never import seed arrays.
- Seeded demo data first. No live integrations until the product loop is coherent.
- No generic AI UI, chatbots, or copilot sidebars. Intelligence is contextual.
- Every automated conclusion must be explainable.
- Source-of-truth data and inferred data stay distinct (provenance).
- Demo mode must survive provider failure.

## Demo loop

Opportunities → Patel Freight → Why this opportunity? → Qualify → call result → Qualified → Won → Start Service → Docket → RegLens campaign → Overview (`/app`)

<!-- ASTRYX:START -->
## Engineering rules

Run `npm run check` before calling work done. It runs typecheck, lint, unit tests, and the retrieval eval. CI runs the same steps with no provider keys set.

### Claims about AI quality

- A retrieval or extraction change ships with a number. Run `npm run eval:rag` and commit the regenerated `docs/research/eval-latest.md`.
- Do not describe a technique in the UI, README, or docs as an improvement unless the eval shows it. The report shows the keyless path (hashed tokens + BM25) scoring the same as BM25 alone, so call it "lexical". Gemini embeddings are what recover paraphrased queries, and fusing them with BM25 has not yet scored above embeddings alone.
- Changing the corpus or golden set invalidates the committed vector cache. Run `npm run eval:rag:refresh` (needs `GEMINI_API_KEY`) and commit the fixture with the report.
- Golden cases in `src/lib/regulations/rag/eval/golden.ts` are written before the fix, not fitted to it. Do not add synonyms or rules whose only purpose is to pass a specific golden query.
- A check that cannot fail is not a check. Faithfulness compares displayed terms with the notice's own text (title + body), never with labels the terms were drawn from.
- Never raise an eval threshold and loosen its test in the same change.
- A change to the briefing prompt, validator, or drafting model is re-scored with `npm run eval:briefing:refresh` (needs `GEMINI_API_KEY`), and `docs/research/briefing-eval-latest.md` is committed with it. A judge model is only trusted as far as its control statements show; report the control scores with every result.

### Model output

- Model JSON is untrusted input. Parse it with a Zod schema before use; never cast with `as T`.
- IDs a model cites (notice ids, customer ids) are validated against the set that was retrieved. Unknown ids are dropped and counted.
- A model never changes stage, flags a customer, opens a case, or contacts anyone. It fills a panel; staff click.
- Every provider call has a timeout and a seeded fallback, and the response says which one the user got (`live: true | false`).

### API routes

- Parse request bodies with Zod. No `(await request.json()) as {...}`.
- Routes that spend money or touch customers (Gemini, voice calls, FMCSA, prospecting, sync) require a signed-in staff session when `SKYOS_AUTH_REQUIRED=true`. Middleware only guards pages today.
- Webhooks verify a shared secret or signature before reading the body, using a constant-time compare.
- Server-only secrets never use the `NEXT_PUBLIC_` prefix.

### Product copy and claims

- Public data shows possible relevance. Use: possible relevance, review recommended, potentially affected, suggested service. Never: noncompliant, violation, definitely needs, guaranteed.
- No "AI-powered", "AI Insights", sparkles, chat boxes, or copilot sidebars. Name the thing: Call summary, Extracted fields, Similar notices.
- Label where each value came from: FMCSA, extracted, derived, or staff-confirmed.
- One primary action per detail screen. Every page has loading, empty, and error states.

### Code

- Pure logic (scoring, matching, retrieval, parsing) lives in `src/lib` with a `*.test.ts` beside it. New logic there comes with tests.
- No special cases keyed on seed ids in library code. If the demo needs it, the rule is wrong.
- A new framework (LangChain, LangGraph, a vector store) goes behind the existing result types and keeps the seeded path as fallback. Its eval numbers are recorded next to the old ones.
- `react-hooks/set-state-in-effect` is a warning for seven existing sites. Do not add an eighth.

Astryx v0.3.0 · 155 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded/arbitrary value (e.g. bg-[#fff], p-[13px]) with the component or a token-backed utility. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   155 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
