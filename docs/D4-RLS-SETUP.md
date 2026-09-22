# D4 RLS setup (staging)

Row-level security on operational Supabase tables. The SkyOS server uses the **service role** and bypasses RLS; policies protect direct access via the anon/authenticated Supabase keys.

## Prerequisites

- D0–D3 complete and tested
- Admin profile row with `role = 'admin'` and `staff_key` set
- Dual-write verified before enabling RLS

## SQL

Run the full contents of `supabase/rls-schema.sql` in the SQL Editor.

Policies summary:

| Role | Access |
|------|--------|
| **admin** | Full read/write on operational tables |
| **staff** | Read/update assigned leads; read/update related cases, tasks, documents, activities, calls |
| **readonly** | Select-only on operational tables |
| **service role** | Unrestricted (public intake, server sync, mirrors) |
| **anon** | No access to business tables |

`workspace_snapshots`, `intake_requests`, and `live_calls` have RLS enabled with **no policies** — service role only.

## App changes (included)

- `GET` and `POST` `/api/sync` require a signed-in session when `SKYOS_AUTH_REQUIRED=true`

Public routes unchanged: `/consultation`, `/api/intake/consultation`.

## Verification

After running SQL:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'leads'
order by policyname;
```

Expected policies: `leads_admin_all`, `leads_staff_select_assigned`, `leads_staff_update_assigned`, `leads_readonly_select`.

App checks:

1. Sign in as **admin** → Live Mode → CRM shows all leads (including unassigned intake)
2. Sign out → `/api/sync` returns `401`
3. Public consultation form still works (incognito)

Optional: create a **staff** user with `staff_key = 'staff_ortega'`, assign a lead to that key, confirm they see only assigned records when using Supabase client directly.

## Rollback

Temporary recovery (re-run `rls-schema.sql` afterward):

```sql
alter table public.leads disable row level security;
-- repeat for other tables as needed
```

Next phase: **D5** — production cutover (snapshot separation, auth-gated live sync defaults).
