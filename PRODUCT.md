# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui, Astryx (workspace shell), Supabase auth, self-hosted marketing fonts (Mango Grotesque, Nohemi, Geist Mono).

## Users

- **Carriers and fleet operators** seeking compliance support (authority, filings, renewals, state programs).
- **SkyOS staff** operating leads, qualification, service cases, and monitoring.
- **Administrators** provisioning staff access (invite-only; no public sign-up).

## Product Purpose

SkyOS is the staff operating system for a trucking compliance service company: take inbound consultation demand (and optional public-data discovery), qualify with evidence, convert to service, run Docket fulfillment, and monitor regulation impact on clients.

Success means staff keep context across intake → qualification → case → monitoring without inventing purchasing intent or guaranteed outcomes.

## Positioning

Standalone product brand (not affiliated with any named carrier company or government agency). Public data surfaces **possible** relevance; human review is required before outreach. Source-of-truth and inferred data stay distinct. Operational software—not generic AI chrome.

## Operating Context

Public marketing is a single product landing. The staff workspace runs: inbound lead / prospect → qualify → CRM → Docket → RegLens. Demo mode uses seeded walkthrough data; live mode uses persisted records and optional providers (Census/FMCSA lookup, voice, Gemini extraction, Supabase).

## Capabilities and Constraints

- Demo mode with seeded walkthrough data; live mode for persisted records.
- Supabase auth for staff; profiles linked via admin provisioning.
- Marketing claims must not guarantee regulatory outcomes or purchasing intent.
- Repository interfaces for data; pages do not import raw seed arrays.

## Brand Commitments

- Name: SkyOS (standalone product brand for public site and staff workspace).
- Voice: operational language, short labels, verbs; no “AI-powered” framing.
- Visual redesign (2026): warm sand + burnt-orange accent, mixed Mango/Nohemi typography on marketing; workspace stays operational Nohemi.

## Evidence on Hand

- Marketing photography in `public/marketing/` (WebP).
- Marketing site sells the staff product; seeded demo data powers the workspace walkthrough.
- No fabricated customer logos or outcome guarantees.

## Product Principles

1. Human review before outreach or compliance claims.
2. Separate source-of-truth data from inferred conclusions.
3. One primary action per detail screen in SkyOS.
4. Demo mode must survive provider failure.
5. Public copy states possibility, not purchasing intent.

## Accessibility & Inclusion

Semantic HTML, visible focus, keyboard navigation, status text beyond color alone; honor `prefers-reduced-motion`.
