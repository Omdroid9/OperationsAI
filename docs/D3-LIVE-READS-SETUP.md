# D3 Live reads setup (staging)

Live Mode reads normalized Supabase tables instead of the `workspace_snapshots` blob. Demo Mode is unchanged.

## Prerequisites

- D0 auth, D1 intake, D2 mirrors
- `SUPABASE_SERVICE_ROLE_KEY` set server-side
- D2 SQL applied (`tasks.metadata_json`)

## Environment

Optional flag (defaults to on in Live Mode when service role is present):

```bash
SKYOS_SUPABASE_SOT=true   # Live Mode reads from entities
# SKYOS_SUPABASE_SOT=false  # force snapshot blob reads (rollback)
```

## Behavior

| Mode | GET `/api/sync` source | UI data |
|------|------------------------|---------|
| **Demo Mode on** | `workspace_snapshots` blob | Patel walkthrough + localStorage |
| **Demo Mode off** | `carriers`, `leads`, `activities`, `cases`, … | Public intake + live FMCSA data |

Mutations still write to `demoStore`, then dual-write via `POST /api/sync` (snapshot backup + entity mirror).

Turning Demo Mode off reloads from Supabase entities. Turning it on reloads the snapshot/local seed.

## Verification

1. **Live Mode off** → Patel Freight visible on Overview / CRM
2. **Live Mode on** (Topbar) → Patel hidden; D1 consultation leads visible in CRM
3. Assign owner / schedule consultation on a live lead → refresh → changes persist (dual-write)
4. SQL: lead rows match what you see in CRM

```sql
select id, stage, assigned_to, metadata_json->>'contactName' as contact
from leads
order by updated_at desc
limit 10;
```

## Rollback

Set `SKYOS_SUPABASE_SOT=false` and restart — Live Mode falls back to snapshot blob reads.

Next phase: **D4** — RLS on business tables.
