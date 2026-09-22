# D1 Public intake setup (staging)

Public consultation form writes to Supabase via a server-only endpoint. No workspace access, no auth tokens returned.

## Prerequisites

- D0 auth working on staging
- `SUPABASE_SERVICE_ROLE_KEY` set server-side (never expose to the browser)
- Run `supabase/intake-schema.sql` in the SQL Editor

## Environment

Server-only (required for D1):

```bash
SUPABASE_URL=                      # same project URL
SUPABASE_SERVICE_ROLE_KEY=         # service role — intake insert + audit only
```

Optional:

```bash
INTAKE_RATE_LIMIT_PER_HOUR=5       # default 5
INTAKE_HASH_SALT=                  # optional pepper for IP/email hashes
TURNSTILE_SECRET_KEY=              # when set, requires captchaToken on POST
```

D0 browser auth vars remain unchanged. D1 does **not** add new `NEXT_PUBLIC_*` intake keys.

## SQL

Run the full contents of `supabase/intake-schema.sql`:

- Creates `public.intake_requests` (audit + rate-limit support)
- Enables RLS with **no policies** (service role writes only)

Verify:

```sql
select count(*) from public.intake_requests;
```

## Endpoint

`POST /api/intake/consultation`

- Same field validation as staff intake (`leadIntakeInputSchema`)
- Honeypot field `companyWebsite` — silent accept when filled
- Rate limit: IP + email hash (default 5/hour)
- Response: `{ ok: true, leadId }` or structured error — no workspace payload

## Verification

1. Incognito: submit `/consultation` — success message, no sign-in required
2. Supabase: new rows in `carriers` + `leads`; audit row in `intake_requests`
3. Signed-in staff: workspace still uses demoStore until D3 (intake row may not appear in UI yet)
4. Fill honeypot (automated bots) — returns success without inserting lead
5. Sixth submission within an hour from same IP — `429 rate_limited`

## Rollback

- Remove `SUPABASE_SERVICE_ROLE_KEY` from env — endpoint returns `503`
- Consultation form shows server error; no data loss
- Optional: `drop table public.intake_requests` only if empty and unused

Next phase: **D2** — mirror consultation metadata on write + read path fixes.
