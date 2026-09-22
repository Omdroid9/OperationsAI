# SkyOS design system

Operational product UI. Light mode is the presentation quality bar. Dark mode must remain coherent.

## Tokens

| Token | Light | Dark |
| --- | --- | --- |
| background | `#F7F7F5` | `#121110` |
| surface | `#FFFFFF` | `#1C1B19` |
| border | `#E7E5E4` | `#2A2826` |
| text | `#1C1917` | `#F5F5F4` |
| muted | `#78716C` | `#A8A29E` |

Semantic only: green success, amber attention, red risk/error, blue informational. No AI color.

## Spacing

`4 8 12 16 24 32 48`

Dense clusters 8–16. Sections 24–32. Major breaks 32–48.

## Typography

- Geist: UI
- Geist Mono: USDOT, scores, identifiers, tabular metrics

Levels: page title, section, primary value/action, muted metadata.

## Radius

Controls 6px. Panels 8–10px. Dialogs 12px.

## Motion

120–200ms. Opacity and small transform. Honor reduced motion.

## Components

shadcn is plumbing. Customize it.

Shared: StatusBadge, PageHeader, FilterBar, EmptyState, ErrorState, ActivityTimeline, ScoreExplain, ProvenanceLabel.

## Tables

TanStack Table. Compact. Sort, filter, row hover, clickable rows, aligned numbers. No giant cards per carrier.

## Status

Always include text. Never color alone.

Opportunity: Detected, Reviewed, Contacted, Qualified, Consultation, Won, Lost, Dismissed  
Document: Uploaded, Extracted, Needs review, Verified, Rejected  
Case: Open, Waiting on client, In review, Ready, Complete

## Provenance

Show when trust matters: FMCSA, CRM, DERIVED, AI_EXTRACTED, HUMAN_CONFIRMED, DEMO.

## Empty / error / loading

Empty: what is missing and what to change.  
Error: what failed and what still works.  
Loading: skeleton rows, not full-screen spinners.

## Anti-slop

No gradients, glow, bento, glass, giant cards, fake charts, sparkles, or marketing AI language.

## Signature

The memorable element is **Why this opportunity?** — a deterministic score breakdown, not decoration.
