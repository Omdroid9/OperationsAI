# Research brief: Live Federal Register ingestion for SkyOS RegLens

**Date:** 2026-08-12  
**Question:** Can SkyOS practically implement live Federal Register ingestion for a trucking/compliance RegLens product?  
**Method:** Primary sources only (FederalRegister.gov developer docs, live `/api/v1` OpenAPI, NARA `federalregister-api-core` source, live API probes). Secondary write-ups excluded.

---

## Verdict

| Scope | Practical? |
| --- | --- |
| **Prototype / MVP** | **Yes.** Keyless JSON API, agency filters (FMCSA/NHTSA/PHMSA), date filters, full-text URLs, and SkyOS already has Gemini→`affected_segment` / `required_action` structuring. |
| **Production watch product** | **Yes for ingestion; partial for “RegLens intelligence.”** Polling + storage + type/agency filters are straightforward. Structured impact, customer matching, and legal trust remain product/LLM layers on top of FR metadata—not API fields. |

---

## Primary sources used

| Source | URL |
| --- | --- |
| Interactive API docs | https://www.federalregister.gov/developers/documentation/api/v1 |
| REST API & developer overview | https://www.federalregister.gov/reader-aids/developer-resources/rest-api |
| Developer Resources hub | https://www.federalregister.gov/reader-aids/developer-resources |
| Live OpenAPI (served by FR) | https://www.federalregister.gov/api/v1/documentation.json |
| Legal status (site footer / about) | https://www.federalregister.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site |
| NARA API source (routes, controllers, fields) | https://github.com/usnationalarchives/federalregister-api-core |
| NARA privacy / copyright notice (general federal materials) | https://www.archives.gov/global-pages/privacy.html |
| Live API base | https://www.federalregister.gov/api/v1/ |

---

## 1. Available endpoints and query params

Base path: `/api/v1/` ([documentation.json](https://www.federalregister.gov/api/v1/documentation.json), [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api)).

Formats: `json` or `csv` ([OpenAPI `Format` schema](https://www.federalregister.gov/api/v1/documentation.json); [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api)).

### Published documents (since 1994)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/documents/{document_number}.{format}` | Single document |
| GET | `/documents/{document_numbers}.{format}` | Multi-get (comma-separated numbers) |
| GET | `/documents.{format}` | Search |
| GET | `/documents/facets/{facet}` | Counts by facet |
| GET | `/issues/{publication_date}.{format}` | Print TOC for a publication date |

**Document search query params** (from [documentation.json](https://www.federalregister.gov/api/v1/documentation.json) / OpenAPI):

| Param | Role |
| --- | --- |
| `fields[]` | Select attributes returned |
| `per_page` | Page size (default 20; OpenAPI maximum **1000**) |
| `page` | Result page |
| `order` | `relevance` \| `newest` \| `oldest` \| `executive_order_number` |
| `conditions[term]` | Full-text search |
| `conditions[publication_date][is\|year\|gte\|lte]` | Publication date filters (YYYY-MM-DD / YYYY) |
| `conditions[effective_date][is\|year\|gte\|lte]` | Effective date filters |
| `conditions[agencies][]` | Agency slug(s) |
| `conditions[type][]` | `RULE` \| `PRORULE` \| `NOTICE` \| `PRESDOCU` |
| `conditions[presidential_document_type][]` | Presidential subtypes |
| `conditions[president][]` | Signing president |
| `conditions[docket_id]` | Agency docket number |
| `conditions[regulation_id_number]` | RIN |
| `conditions[sections][]` | FR.gov section slug |
| `conditions[topics][]` | CFR indexing topic slug |
| `conditions[significant]` | EO 12866 significance (`0` / `1`) |
| `conditions[cfr][title]` / `conditions[cfr][part]` | CFR title / part |
| `conditions[near][location]` / `conditions[near][within]` | Location (within ≤200 miles) |

Also observed (not always listed in prose docs): `documents.rss` responds as RSS via the same search controller ([entries_controller.rb](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/controllers/api/v1/entries_controller.rb)).

### Public inspection

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/public-inspection-documents/{document_number}.{format}` | Single PI doc |
| GET | `/public-inspection-documents/{document_numbers}.{format}` | Multi-get |
| GET | `/public-inspection-documents/current.{format}` | All currently on PI |
| GET | `/public-inspection-documents.{format}` | Search / by-date |

Search params include `fields[]`, `per_page`, `page`, `conditions[term]`, `conditions[agencies][]`, `conditions[type][]`, `conditions[special_filing]` (`0` regular / `1` special), `conditions[docket_id]`, and `conditions[available_on]` (PI issue date) ([documentation.json](https://www.federalregister.gov/api/v1/documentation.json); [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api)).

Official prose: PI search covers documents **currently** on public inspection; use document search for published docs ([rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api)).

### Agencies and helpers

| Method | Path |
| --- | --- |
| GET | `/agencies` |
| GET | `/agencies/{slug}` |
| GET | `/suggested_searches`, `/suggested_searches/{slug}` |
| GET | `/images/{identifier}` |

Additional routes exist in source (`effective-dates`, `holidays`, `sections`, `site_notifications`, search-details, PI facets) ([config/routes/api.rb](https://github.com/usnationalarchives/federalregister-api-core/blob/master/config/routes/api.rb))—prefer the live OpenAPI list for product contracts.

### Webhooks

**None documented.** OpenAPI lists GET-only resources; [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api) describes REST fetch/search/current/by-date only. Push/webhook delivery: **unknown / not offered in these primary sources.**

---

## 2. Authentication

**Not required.**

- Interactive docs: “FederalRegister.gov APIs do not require API keys; all you need is an HTTP client or browser.” ([API Documentation](https://www.federalregister.gov/developers/documentation/api/v1))
- REST overview: “No API keys are needed; all you need is an HTTP client or browser.” ([rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api))
- Machine-readable API catalog marks methods `RequiresOAuth: N` ([data/api.yml in federalregister-api-core](https://github.com/usnationalarchives/federalregister-api-core/blob/master/data/api.yml))
- Live OpenAPI has no `security` schemes ([documentation.json](https://www.federalregister.gov/api/v1/documentation.json))

Live probes to `/documents.json` returned HTTP 200 with no auth headers.

---

## 3. Rate limits, pagination, CORS

### Rate limits

**Unknown as a published numeric quota.**  

Not stated in [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api), interactive docs intro, or OpenAPI. Live responses observed here showed no `X-RateLimit-*` / `Retry-After` headers.  

Do **not** invent a req/s number. Practical guidance: poll politely; use API JSON (not HTML scraping). Aggressive HTML scraping has been restricted by FR’s access gate (observed CAPTCHA “Request Access” pages when HTML routes are fetched as bots); official guidance is to use the developer APIs ([developers CAPTCHA interstitial observed for some automated HTML clients; API JSON remained available]).

### Pagination

From official prose ([rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api)):

- Results are paginated; page size is customizable.
- **“You can only paginate through the first 2000 results. If you wish to download more results, use the date range filters.”**
- Responses include next-page URLs (HATEOAS).

From OpenAPI ([documentation.json](https://www.federalregister.gov/api/v1/documentation.json)):

- `per_page` default 20, **maximum 1000**.

From source ([application_search.rb](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/searches/application_search.rb)):

- Default `maximum_per_page` = **2000** unless overridden server-side.
- `page` outside `1..50` is reset to `1`.
- Sphinx `max_matches` = **10_000**.
- Client-supplied `maximum_per_page` is stripped in `ApiController#enforce_maximum_per_page` ([api_controller.rb](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/controllers/api_controller.rb)).

**Live observation (2026-08-12):** Unfiltered `/documents.json?page=50&per_page=20` returned `count: 10000`, `total_pages: 50`; `page=51` reset behavior matched source (treated as page 1). Treat deep history as **date-windowed queries**, not infinite page walks.

### CORS / JSONP

- CORS: `Access-Control-Allow-Origin: *` ([api_controller.rb](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/controllers/api_controller.rb); [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api))
- JSONP: `callback=` query param ([rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api); `render_json_or_jsonp` in [api_controller.rb](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/controllers/api_controller.rb))

For a Next.js app, prefer **server-side** fetch (route handlers / cron) over browser JSONP.

---

## 4. Discovering “new” documents

| Mechanism | How | Source |
| --- | --- | --- |
| **Publication date cursor** | `conditions[publication_date][gte]=YYYY-MM-DD` + `order=newest` | OpenAPI |
| **Exact day** | `conditions[publication_date][is]=YYYY-MM-DD` | OpenAPI |
| **Issue TOC** | `GET /issues/{publication_date}.json` then fetch by `document_numbers` | OpenAPI |
| **Public inspection (early)** | `GET /public-inspection-documents/current.json` and/or PI search by agency | rest-api + OpenAPI |
| **PI by calendar day** | `conditions[available_on]=YYYY-MM-DD` | OpenAPI / api.yml |
| **RSS** | `GET /api/v1/documents.rss?...` (observed; controller supports `wants.rss`) | Source + live |
| **Webhooks** | Not available in primary docs | — |

Recommended MVP discovery loop: store last successful `publication_date` / `document_number` set → poll agency-filtered search with `gte` → dedupe → optionally also poll `/public-inspection-documents/current.json` for advance notice.

---

## 5. Filtering to FMCSA / DOT / NHTSA / PHMSA

Agency slugs from live `GET /agencies` / agency show (2026-08-12):

| Agency | slug | id | parent |
| --- | --- | --- | --- |
| Transportation Department (DOT) | `transportation-department` | 492 | — |
| FMCSA | `federal-motor-carrier-safety-administration` | 181 | 492 |
| NHTSA | `national-highway-traffic-safety-administration` | 345 | 492 |
| PHMSA | `pipeline-and-hazardous-materials-safety-administration` | 408 | 492 |

Query pattern:

```http
GET /api/v1/documents.json
  ?conditions[agencies][]=federal-motor-carrier-safety-administration
  &conditions[agencies][]=national-highway-traffic-safety-administration
  &conditions[agencies][]=pipeline-and-hazardous-materials-safety-administration
  &conditions[type][]=RULE
  &conditions[type][]=PRORULE
  &conditions[publication_date][gte]=2026-08-05
  &order=newest
  &per_page=20
```

**Caution:** Including parent `transportation-department` pulls all DOT mode agencies (FAA, FRA, FHWA, Coast Guard under DHS historically may appear differently, etc.). Live probe with DOT + FMCSA + NHTSA + PHMSA for ≥2026-07-12 returned **245** docs (many non-trucking). Prefer **child agency slugs** for RegLens.

Optional sharpening:

- `conditions[type][]=RULE` / `PRORULE` (skip most NOTICE noise)
- `conditions[cfr][title]=49` (transportation CFR title)
- `conditions[topics][]=…` (topic slugs; enumerate via OpenAPI `Topic` schema / live suggestions)
- `conditions[term]=…` for keywords (ELD, hours of service, etc.)

**Live volume samples (2026-08-12 probes):**

- FMCSA all-time search `count`: **5175**
- FMCSA + NHTSA + PHMSA since 2026-08-05: **7**
- FMCSA RULE+PRORULE since 2026-08-05: **1**
- FMCSA NOTICE since 2025-08-12: **174**; RULE **22**; PRORULE **8**

---

## 6. Data fields useful for RegLens

### Default search index fields

From [`EntryApiRepresentation`](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/presenters/entry_api_representation.rb):  
`title`, `type`, `abstract`, `document_number`, `html_url`, `pdf_url`, `public_inspection_pdf_url`, `publication_date`, `agencies`, `excerpts`.

### High-value fields for RegLens (request via `fields[]` or document show)

| Field | RegLens use |
| --- | --- |
| `title`, `abstract`, `type` | Inbox row + triage |
| `document_number` | Stable ID / dedupe |
| `agencies[]` (`name`, `slug`, `short_name`) | Agency badge |
| `publication_date`, `effective_on`, `comments_close_on`, `dates` | Timeline (note: `dates` is free text; `effective_on` often null) |
| `docket_ids` / `docket_id` | Docket linkage |
| `regulation_id_numbers`, `regulation_id_number_info` | RIN / regulatory plan context |
| `html_url` | Human review link (FR.gov) |
| `pdf_url` | Official PDF on govinfo.gov |
| `raw_text_url`, `body_html_url`, `full_text_xml_url` | Source text for Gemini analyze |
| `cfr_references`, `topics` | Rough “what part of 49 CFR” |
| `regulations_dot_gov_url`, `comment_url`, `regulations_dot_gov_info` | Comment / docket context |
| `significant` | EO 12866 flag when present |

Example live FMCSA proposed rule `2026-16288` included title, abstract, agencies (DOT+FMCSA), `comments_close_on`, `docket_ids` (`Docket No. FMCSA-2026-0826`), RIN `2126-AC99`, topics, CFR parts 390/391, and full-text URLs.

### Public inspection fields (observed)

`title`, `type`, `document_number`, `agencies`, `publication_date`, `filed_at`, `html_url`, `pdf_url`, `raw_text_url`, `docket_numbers`, subjects/TOC fields, filing metadata.

---

## 7. Gaps vs what SkyOS RegLens needs

SkyOS today (`src/lib/regulations/inbox.ts`, `/api/reglens/analyze`) expects structured analysis:

`agency`, `title`, `category`, `published_date`, `effective_date`, `deadline`, **`affected_segment`**, **`required_action`**, `confidence`, `source_summary`.

| Need | FR API provides? | Gap closure |
| --- | --- | --- |
| Discover new notices | Yes | Poll / cron |
| Title, agency, URLs, dockets, dates | Mostly yes | Field mapping |
| Full text for analysis | Via `raw_text_url` / HTML / XML | Second fetch + truncate |
| `affected_segment` | **No** | Existing Gemini + Zod |
| `required_action` | **No** | Existing Gemini + Zod |
| `category`, operational relevance | **No** (only `type` / topics / CFR) | Rules + LLM + human review |
| Customer / prospect matching | **No** | SkyOS match layer |
| Compliance determination / “must act” | **No** (and must not claim) | Human review + copy rules |
| Guaranteed effective/compliance deadline | **Partial** (`effective_on` nullable; `dates` prose) | Parse cautiously; null when unknown |

README already lists “Federal Register fetch for RegLens inbox” as future work—this research confirms that path is API-shaped, not scrape-shaped.

---

## 8. Practical architecture (Next.js)

```text
Vercel Cron / manual "Fetch notices"
  → Server route only (never browser→FR as primary path)
  → GET documents.json (FMCSA±NHTSA±PHMSA, type RULE|PRORULE, publication_date[gte]=cursor)
  → Optional: GET public-inspection-documents/current.json (same agencies)
  → Dedupe on document_number (persist in Supabase / workspace snapshot)
  → Fetch raw_text_url (cap bytes) → existing /api/reglens/analyze (Gemini + Zod)
  → Store regulation + provenance (html_url, pdf_url, fetched_at)
  → Attention: "New notice needs review"
  → On failure: keep seeded inbox / last snapshot (demo-mode rule)
```

| Concern | Approach |
| --- | --- |
| No webhooks | Poll every 6–24h; daily issue is enough for FR publication cadence |
| Pagination | For “what’s new,” keep windows small; never page past documented 2000-result limit without date partitions |
| Storage | `document_number` PK, JSON blob of selected fields, analysis columns, import status |
| HTML CAPTCHA | Do not scrape FR HTML; use `/api/v1` only |
| CORS | Irrelevant if server-side |
| Demo resilience | Timeout + fallback to seed/cache |

---

## 9. Risks

1. **Noise volume** — Notices (ICRs, exemptions, meetings) dominate FMCSA volume vs rules. Unfiltered inbox will drown operators.
2. **False positives** — LLM may invent `affected_segment` / urgency; SkyOS copy rules already forbid guaranteed noncompliance claims.
3. **Legal status of FR.gov** — Site is an unofficial informational prototype; verify against official editions / govinfo PDF ([about-this-site / Legal Status](https://www.federalregister.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site)). RSS feed description points users at legal-status policy language ([entries_controller RSS locals](https://github.com/usnationalarchives/federalregister-api-core/blob/master/app/controllers/api/v1/entries_controller.rb)).
4. **Logo / seal restriction** — “Republishers of Federal Register material are not permitted to use official NARA or OFR logos or seals.” ([rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api))
5. **Incomplete dates** — `effective_on` often null; deadlines may only appear in `dates` prose or body text.
6. **DOT parent filter** — Inflates irrelevant modes (aviation, rail, etc.).
7. **Rate-limit uncertainty** — No published quota; still avoid abusive polling.
8. **Pagination traps** — `count` can sit at 10000; deep history requires date slicing.

---

## 10. Effort estimate

| Scope | Effort (eng) | Outcome |
| --- | --- | --- |
| Spike / prototype | **0.5–1 day** | Server fetch newest FMCSA docs → show in RegLens inbox with links |
| Useful MVP | **1–3 days** | Cursor + dedupe + type filters + raw text → existing analyze → attention item; demo fallback |
| Production watch | **1–2 weeks** | Cron, Supabase persistence, PI desk, relevance heuristics, monitoring/alerts, legal UX, multi-agency config |

(Estimates are engineering judgment, not from FR docs.)

---

## 11. Attribution / terms of use (what is known)

| Topic | Finding | Source |
| --- | --- | --- |
| API keys / OAuth | Not required | [API docs](https://www.federalregister.gov/developers/documentation/api/v1), [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api) |
| Republishing logos | No NARA/OFR logos or seals | [rest-api](https://www.federalregister.gov/reader-aids/developer-resources/rest-api) |
| Legal status of FR.gov content | Unofficial informational resource; verify against official FR / govinfo | [about-this-site](https://www.federalregister.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site) |
| General NARA materials | Federal agency materials generally public domain; NARA works under CC0; not all site materials are PD | [archives.gov privacy](https://www.archives.gov/global-pages/privacy.html) |
| Required citation format | **Unknown** beyond linking to official PDF / not misrepresenting legal status | — |
| Numeric rate limit ToS | **Unknown** | — |

Product UX should: link `html_url` + `pdf_url`, label FR.gov as informational, require human review before campaigns, and keep SkyOS “not legal advice / not noncompliance proof” language.

---

## 12. Final verdict

**Prototype:** Practical. The API is public, keyless, filterable to FMCSA-family agencies, and returns the metadata + text URLs RegLens needs to feed the existing analyze path.

**Production:** Practical as a **live regulatory inbox / watch feed**. Not sufficient alone as a compliance engine: `affected_segment`, `required_action`, and customer matching remain SkyOS layers; human review and conservative claims remain mandatory; FR.gov is not the official legal edition.

**Bottom line:** Live Federal Register ingestion is one of the more realistic live integrations for SkyOS RegLens—the hard part is relevance and trust, not API access.
