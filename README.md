# SkyOS

**From signal to customer to compliance.**

Operations software for trucking compliance service companies: inbound lead intake, optional carrier discovery, voice qualification, CRM, Docket casework, and RegLens monitoring—in one staff workspace.

**Live demo:** [https://skyos-two.vercel.app](https://skyos-two.vercel.app) — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Personal product build / portfolio prototype. Not production software. Does not provide legal advice or guarantee regulatory outcomes.

## Problem

Compliance shops help carriers with authority, filings, renewals, and monitoring—but the work usually sits across disconnected tools: a website form, a spreadsheet CRM, a phone, document folders, and a regulation inbox.

Staff lose context between “someone asked for help,” “we confirmed the need,” “we won the work,” and “documents and renewals are tracked.” Public carrier data can surface possible relevance, but contact details are often incomplete—so inbound intake is the stronger path to qualification.

## Solution

SkyOS keeps one operating loop:

```text
Inbound lead or Census discovery
  → Review → Qualification → CRM → Conversion → Docket case → RegLens monitoring
```

SkySignal does not claim purchasing intent. It says: observable signals suggest this business may have a relevant need worth reviewing.

## Modules

| Module | Job |
| --- | --- |
| **SkySignal** | Detect and score review-worthy carriers from public operating profiles and CRM context |
| **CRM** | Track stage, next action, notes, language, and follow-up |
| **Voice** | Optional qualification. Stored multilingual call by default; live voice agent if keys and a phone number are present |
| **RegLens** | Turn a regulation into structured impact and a campaign |
| **Docket** | Turn a Won opportunity into a service case, documents, and tasks |

## Architecture

```text
React pages
  → TanStack Query
    → Repository interfaces
      → Demo store (in-memory + localStorage)
      → optional: live API routes (FMCSA, Gemini, Vapi) with demo fallback
      → optional: Supabase workspace sync + entity mirror when configured
```

Scoring and service suggestions are deterministic rules, not a machine-learning model. Every score has a breakdown.

When Supabase is configured, the app hydrates from `workspace_snapshots` on load and debounces saves after each mutation. Live FMCSA lookups, RegLens analyses, Vapi calls, and document extractions are mirrored into normalized tables.

## Tech stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Geist / Geist Mono, Lucide, next-themes
- TanStack Query, TanStack Table, Zod

Live providers are optional. Keys live in `.env.local` only. Missing or failing providers keep the demo walkthrough working.

## Setup

```bash
cd ~/Projects/skyos
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port Next prints; this repo often uses 3001).

Copy `.env.example` to `.env.local` only if you add live keys. The app runs without them.

### Product setup (optional)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or anon key) to `.env.local`.
4. Add provider keys as needed (FMCSA, Gemini, Vapi).
5. For live calls, expose your dev server (e.g. ngrok) and set `VAPI_SERVER_URL` or `NEXT_PUBLIC_APP_URL` so Vapi can reach `/api/webhooks/vapi`.

| Variable | Enables |
| --- | --- |
| `FMCSA_WEB_KEY` or `FMCSA_API_KEY` | USDOT lookup on Opportunities |
| `GEMINI_API_KEY` | RegLens analysis, inbox enrichment, document extraction |
| `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` | Live qualification calls |
| `GLADIA_API_KEY` | Multilingual transcription on live calls |
| `ELEVENLABS_API_KEY` | Voice on live calls (otherwise Vapi Elliot) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Workspace sync + entity persistence |
| `VAPI_SERVER_URL` or `NEXT_PUBLIC_APP_URL` | Vapi end-of-call webhook |

Do not set a flag to force demo mode. Omit the key. If a live request fails, SkyOS uses the stored result.

## Demo instructions

1. Open **Opportunities**. Find **Patel Freight Solutions**.
2. Open the opportunity. Score should be **92**. Read **Why this opportunity?**
3. Note the potential service. SkySignal identifies relevance, not purchasing intent.
4. Click **Qualify**. Leave the phone blank for the stored Hindi + English call, or enter a number if Vapi is configured.
5. Review the structured result: fleet 4, internal compliance, high interest, callback requested. Stage moves to **Qualified**.
6. Mark **Won**, then **Start Service**.
7. On the Docket case, review the medical certificate: extracted fields, provenance, **Needs review**. Confirm it.
8. Open **RegLens**, load the sample notice, analyze, then **Create opportunity campaign**.
9. Return to **Overview**. Attention items are composed from the same entities.

Reset demo data from the **Demo** menu in the top bar.

## What is real vs simulated

| Capability | Default (no keys) | With keys |
| --- | --- | --- |
| Carrier profiles | Seeded fictional data in the shape of public FMCSA fields | Live QCMobile lookup by USDOT; failure keeps the stored set |
| Opportunity scoring | Real deterministic rules | Same |
| Qualify / voice | Stored multilingual transcript and Zod-validated extraction | Vapi call + Gladia/Gemini extraction; timeout or failure uses the stored call |
| Call → CRM update | Real stage and score adjustments | Same |
| Docket extraction | Stored document fields, human confirm required | Gemini extraction from an uploaded file; failure attaches the stored sample |
| RegLens analysis | Stored structured result from pasted/sample text | Gemini JSON, Zod-validated; failure uses the stored analysis |
| RegLens inbox | Seeded demo notices | Server inbox API with optional Gemini enrichment |
| Supabase | Unused | Workspace snapshot sync + mirrored carriers, leads, regulations, calls, documents |

FMCSA data is not purchasing intent or proof of noncompliance. Extracted fields always need human review.

## Prototype simulation (seeded walkthrough, not production metrics)

```text
Prototype Simulation

~30 carriers reviewed
12+ opportunity signals
5 high-priority New Entrant profiles
2 qualified conversations after the walkthrough
1 new service case from Patel Freight
```

Illustrative only: less re-entry across tools, faster qualification handoff, and a cleaner path from won work into Docket + monitoring. Not real revenue or outcome claims.

## Tradeoffs

- Demo reliability over live APIs. The walkthrough must survive provider failure.
- One acquisition pattern first: New Entrant Opportunity Radar.
- In-memory + localStorage instead of Postgres until the product loop is coherent.
- No drag-and-drop CRM, no chatbot, no analytics suite.

## Limitations

- Not a compliance attorney and not a legal engine.
- Checklists are labeled as a prototype service checklist.
- Voice does not place a live call unless Vapi keys are present and a phone number is entered.
- Public data never proves noncompliance or a guaranteed sale.

## Future work

1. Full Supabase repository (replace client demo store reads)
2. Federal Register fetch for RegLens inbox
3. Configurable scoring weights
4. Fleet-growth, dormant-lead, and customer-expansion campaigns as first-class products

## Responsible use

SkySignal identifies possible opportunities using observable information. Human review is required before outreach.

Voice qualification is optional and human-approved.

Regulatory and document analysis assist employees and do not replace professional compliance review.

The prototype does not make legal determinations.
