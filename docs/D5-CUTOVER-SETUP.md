# D5 Production cutover (staging)

Separates demo and live persistence. Live Mode uses **normalized Supabase tables** as source of truth; Demo Mode uses the **`demo` snapshot** only.

## Snapshot IDs

| ID | Purpose |
|----|---------|
| `default` | Legacy backup — **never delete or overwrite** after cutover |
| `demo` | Demo Mode walkthrough (Patel seed) |
| `live` | Live Mode optional blob backup (entities remain authoritative) |

## What changed in code

- **Demo Mode GET/POST** → `workspace_snapshots.id = 'demo'` only; **no entity mirror** (prevents demo mutations from polluting live `leads`)
- **Live Mode GET** → normalized entity tables (D3)
- **Live Mode POST** → entity mirror + backup to `live` snapshot (not `default`)
- First Demo Mode load migrates `default` → `demo` automatically if `demo` is empty

## Prerequisites

- D0–D4 complete
- `rls-schema.sql` applied

## SQL (optional)

Run `supabase/d5-cutover-schema.sql` for table comment and optional manual `default` → `demo` copy.

## Verification

```sql
select id, updated_at, pg_column_size(state_json) as bytes
from workspace_snapshots
order by updated_at desc;
```

App checks:

1. **Demo Mode on** → Patel visible; submit consultation in incognito → **no new rows** in `leads` until Demo Mode off
2. **Demo Mode off** → intake leads in CRM; assign owner → persists after refresh
3. `default` row unchanged after live mutations (only `live` updates)

## Rollback

| Action | Effect |
|--------|--------|
| `SKYOS_SUPABASE_SOT=false` | Live reads snapshot again |
| Demo Mode on | Uses `demo` snapshot + local seed |
| Re-copy `default` → `demo` in SQL | Restore walkthrough backup |

Persistence migration (D0–D5) is complete. Next optional track: **M1** premium marketing redesign.
