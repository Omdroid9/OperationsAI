# SkyOS deployment (Vercel + Supabase)

Full assignment stack: public marketing, staff auth, Live Mode persistence, intake, Dograh webhooks.

**Platform: Vercel** (Next.js App Router 16 + Node runtimes for PDF extract / `@napi-rs/canvas`). Prefer Vercel over Netlify for this repo.

**Production:** [https://skyos-two.vercel.app](https://skyos-two.vercel.app)

```bash
npm run check:deploy-env   # names-only checklist against .env.local
npm run deploy:env         # push .env.local → Vercel Production
npm run deploy:prod        # production deploy
```

## 1. Supabase

### SQL (run in order)

In the Supabase SQL Editor, either:

- Run **[`supabase/apply-all.sql`](../supabase/apply-all.sql)** once (concatenated, idempotent), or
- Run files individually:

1. [`supabase/schema.sql`](../supabase/schema.sql)
2. [`supabase/auth-schema.sql`](../supabase/auth-schema.sql) (D0 profiles + RLS)
3. [`supabase/intake-schema.sql`](../supabase/intake-schema.sql) (D1)
4. [`supabase/d2-mirror-schema.sql`](../supabase/d2-mirror-schema.sql)
5. [`supabase/rls-schema.sql`](../supabase/rls-schema.sql) (D4)
6. [`supabase/d5-cutover-schema.sql`](../supabase/d5-cutover-schema.sql) (comments / snapshot notes)

### Auth settings (assignment-friendly)

1. Authentication → Providers → Email: **ON**
2. **Disable** public sign-ups
3. Confirm email: **OFF** for assignment speed (re-enable for real production)
4. Authentication → URL Configuration:
   - Site URL: `https://skyos-two.vercel.app`
   - Redirect URLs: `https://skyos-two.vercel.app/auth/callback`
5. Create Admin user → copy UUID → insert profile (Block 4 from [`docs/D0-AUTH-SETUP.md`](D0-AUTH-SETUP.md)):

```sql
insert into public.profiles (id, display_name, role, staff_key)
values (
  'PASTE-ADMIN-UUID-HERE'::uuid,
  'A. Mehta',
  'admin',
  'staff_mehta'
)
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    staff_key = excluded.staff_key,
    updated_at = now();
```

## 2. Vercel

### Create / link project

1. `npx vercel login`
2. From repo root: `npx vercel link`
3. Push env + deploy (scripts above)

Framework: Next.js. Build: `next build`. Node: **20+** (`engines` in `package.json`).

Native canvas: `serverExternalPackages` includes `@napi-rs/canvas` and `pdfjs-dist` in [`next.config.ts`](../next.config.ts).

### Environment matrix

| Variable | Scope | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Production | Yes | `https://skyos-two.vercel.app` (no trailing slash). Dograh webhooks. |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Yes | Browser + SSR |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Yes | Browser anon key |
| `SUPABASE_URL` | All | Yes | Same URL (server) |
| `SUPABASE_ANON_KEY` | All | Yes | Same anon key (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Yes | Server only — never `NEXT_PUBLIC_*` |
| `SKYOS_AUTH_REQUIRED` | All | Yes | `true` |
| `NEXT_PUBLIC_SKYOS_AUTH_REQUIRED` | All | Yes | `true` |
| `SKYOS_SUPABASE_SOT` | All | Yes | `true` for Live entity reads |
| `INTAKE_HASH_SALT` | All | Yes | Long random string |
| `INTAKE_RATE_LIMIT_PER_HOUR` | All | Recommended | e.g. `20` for graders |
| `NEXT_PUBLIC_SKYOS_CONTACT_EMAIL` | All | Recommended | Footer / About |
| `NEXT_PUBLIC_SKYOS_CONTACT_PHONE` | All | Optional | |
| `DOGRAH_API_URL` | All | Live calls | Default `https://app.dograh.com` |
| `DOGRAH_API_KEY` | All | Live calls | |
| `DOGRAH_WORKFLOW_UUID` | All | Live calls | |
| `DOGRAH_WORKFLOW_ID` | All | Live calls | |
| `DOGRAH_WEBHOOK_SECRET` | All | Live calls | Must match Dograh dashboard |
| `DOGRAH_ALLOWED_TEST_NUMBERS` | All | Live calls | Comma-separated E.164 allowlist |
| `GEMINI_API_KEY` | All | Live extract | Docket + RegLens |
| `FMCSA_WEB_KEY` / `FMCSA_API_KEY` | All | Enrichment | USDOT lookup |
| `SOCRATA_APP_TOKEN` | All | Optional | Census rate limits |
| `TURNSTILE_SECRET_KEY` | All | Skip | Omit unless captcha UI is wired |
| `VAPI_*` | — | Skip | Legacy; Live qualify uses Dograh |

After the first deploy, set `NEXT_PUBLIC_APP_URL` to the stable production alias and **redeploy**.

## 3. Dograh webhook

See [`docs/DOGRAH-PRODUCTION.md`](DOGRAH-PRODUCTION.md).

1. Webhook URL: `https://skyos-two.vercel.app/api/webhooks/dograh`
2. Secret must equal `DOGRAH_WEBHOOK_SECRET` on Vercel.
3. Retire ngrok / tunnel URLs.
4. Keep allowlist to consenting test numbers only.

## 4. Smoke checklist

On https://skyos-two.vercel.app:

1. **Marketing** — `/` is the product page (screens, loop, features, FAQ); nav **Access product** → `/access`.
2. **Intake** — `POST /api/intake/consultation` still available when configured (legacy `/consultation` redirects to `/#cta`).
3. **Auth** — `/access` as admin → product; unauthenticated `/app` redirects to `/access`. Legacy `/sign-in` redirects to `/access`.
4. **Demo Mode** — Patel walkthrough still works if Demo is on.
5. **Live Mode** — Prospecting / FMCSA / RegLens / Docket extract when keys are set.
6. **Qualify** — Dograh allowlisted call → webhook → qualification (or clean fail + Retry).
7. **Overview** — `/app` attention after Won → Docket → RegLens.

Verified on deploy (automated): marketing routes `200`, brand `SkyOS`, `/app` → `/access?next=%2Fapp`, `/api/status` `200` with supabase/fmcsa/gemini/dograh enabled.

## 5. Demo vs Live

- **Demo Mode:** seeded walkthrough, simulated calls, demo RegLens seed.
- **Live Mode:** FMCSA, Dograh, Gemini, Federal Register. No demo seed disguised as live.

## 6. Empty / loading / error

Each workspace route should show skeleton, empty, and error retry per product rules. RegLens shows last fetch time and error banner on failure.

## Security

- Never commit `.env.local` or service role keys.
- Service role stays server-only.
- Dograh allowlist is server-only (`DOGRAH_ALLOWED_TEST_NUMBERS`).
