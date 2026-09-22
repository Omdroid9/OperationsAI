# D0 Auth setup (staging)

Staging-only auth slice: SSR sessions, sign-in/out, protected workspace routes, current-user profile read. No operational data migration. No business-table RLS. No service-role key required for D0.

## Email confirmation

- **Staging:** disable email confirmation in Supabase (Authentication → Providers → Email) for first Admin test.
- **Production:** re-enable email confirmation before inviting staff.

## Environment (staging)

Browser-safe:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SKYOS_AUTH_REQUIRED=true
```

Server-only:

```bash
SUPABASE_URL=                      # same URL as above
SUPABASE_ANON_KEY=                 # same anon key as NEXT_PUBLIC_SUPABASE_ANON_KEY
SKYOS_AUTH_REQUIRED=true
```

D0 does **not** require `SUPABASE_SERVICE_ROLE_KEY`. Do not add it for auth staging.

Local dev without auth (optional):

```bash
SKYOS_AUTH_REQUIRED=false
NEXT_PUBLIC_SKYOS_AUTH_REQUIRED=false
```

## Dashboard checklist

1. **Table Editor** — note whether `profiles` exists (for your records only).
2. **Authentication → Providers → Email** — enable Email; **disable public sign-ups**; **disable confirm email** (staging only).
3. **Authentication → URL Configuration**
   - Site URL: staging origin (e.g. `http://localhost:3000` or Vercel preview URL)
   - Redirect URLs: `{ORIGIN}/auth/callback` for local and staging
4. **Authentication → Users → Add user** — create Admin; copy UUID.
5. **Project Settings → API** — copy project URL and **anon public** key only (for env vars above).
6. **Always run SQL Blocks 1–3** in SQL Editor (see below), even if `profiles` already exists.
7. Run Block 4 if the Admin profile row is missing or needs linking.
8. Deploy app with env vars; sign in at `/sign-in`.

## SQL blocks

### Block 1–3 — Schema + RLS (always run)

**Run even if `profiles` already exists.** Blocks 1–3 are safe and idempotent:

- `create table if not exists` / `create index if not exists` — no-op if present
- `create or replace function` — refreshes helpers
- `drop policy if exists` — removes legacy policies (`profiles_select_authenticated`, `profiles_admin_write`, self-update policies, etc.)
- `create policy profiles_select_own` — ensures current-user-only read

Run the full contents of `supabase/auth-schema.sql`.

### Block 4 — First admin profile (replace UUID)

Run in SQL Editor after creating the Auth user. Postgres role bypasses RLS.

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
    role = 'admin',
    staff_key = excluded.staff_key,
    updated_at = now();
```

## Granting staff access (admin)

SkyOS is **invite-only**. Public sign-up stays disabled in Supabase.

1. **Authentication → Users → Add user** (or send invite email).
2. Copy the new user UUID.
3. Run Block 4 SQL in SQL Editor with `display_name`, `role` (`admin` | `staff` | `readonly`), and optional `staff_key` (e.g. `staff_ortega`).
4. User signs in at `/sign-in`.

In the app, admins can open **Account → Grant team access** (`/settings/team`) for the SQL template and steps.

To revoke access: delete the user in Supabase Authentication (profile row cascades).

## Verification

After Blocks 1–3:

```sql
-- Table exists
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

-- Exactly one SELECT policy, current-user only; no INSERT/UPDATE/DELETE policies
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;
```

Expected: single policy `profiles_select_own` with `cmd = SELECT` and `qual` containing `auth.uid() = id`.

After Block 4 (as postgres in SQL Editor):

```sql
select id, display_name, role, staff_key from public.profiles;
```

After signing in via the app (optional JWT check in SQL Editor is not available; use the app Topbar):

- Topbar shows display name, role, and staff key.
- `GET /api/auth/profile` returns only the signed-in user's profile.

Confirm no client write path:

```sql
-- Should return zero rows for INSERT/UPDATE/DELETE
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and cmd <> 'SELECT';
```

## Rollback

**Normal operation:** RLS stays **enabled** on `profiles` with `profiles_select_own` only.

**Temporary recovery only** — if auth is broken and you need to inspect or repair rows in SQL Editor without JWT context, you may disable RLS briefly, then re-run Blocks 1–3 to restore the correct policy:

```sql
-- TEMPORARY ONLY — re-enable RLS by re-running supabase/auth-schema.sql Block 3 afterward
alter table public.profiles disable row level security;
```

After recovery, **always re-run Block 3** (or the full `auth-schema.sql` Blocks 1–3) so `profiles_select_own` is active again. Do not leave RLS disabled in staging or production.

Optional profile row removal:

```sql
-- delete from public.profiles where id = 'PASTE-ADMIN-UUID-HERE'::uuid;
```

Env rollback: set `SKYOS_AUTH_REQUIRED=false` and `NEXT_PUBLIC_SKYOS_AUTH_REQUIRED=false` to restore open workspace without deleting data.
