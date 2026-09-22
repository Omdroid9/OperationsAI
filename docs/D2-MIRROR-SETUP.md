# D2 Mirror setup (staging)

Fixes Supabase **write mirrors** so normalized tables stay aligned with workspace state. Does not switch the app to read from Supabase yet (that is D3).

## What changed in code

- `opportunityToLeadRow` now writes consultation fields (`consultationStatus`, `consultationScheduledAt`, `consultationNote`, `serviceApprovedAt`) plus outreach/discovery metadata
- `mirrorWorkspaceEntities` now mirrors **activities**, **cases**, **documents**, and **tasks** (in addition to carriers, leads, regulations, calls, matches)

Mirrors run on each workspace sync (`POST /api/sync`) after local mutations.

## SQL (run once)

Run `supabase/d2-mirror-schema.sql` in the SQL Editor:

```sql
alter table public.tasks
  add column if not exists metadata_json jsonb default '{}'::jsonb;
```

Safe if `tasks.metadata_json` already exists.

## Verification

After signing in and making a workspace change (e.g. assign owner, schedule consultation, start service):

1. Trigger sync — any mutation that saves demo state also posts to `/api/sync`
2. In SQL Editor:

```sql
-- Consultation metadata on a lead
select
  id,
  metadata_json->>'consultationStatus' as consultation_status,
  metadata_json->>'consultationScheduledAt' as scheduled_at,
  metadata_json->>'consultationNote' as note,
  metadata_json->>'serviceApprovedAt' as approved_at
from leads
where metadata_json->>'consultationStatus' is not null
order by updated_at desc
limit 10;

-- Mirrored operational tables
select count(*) as activities from activities;
select count(*) as cases from cases;
select count(*) as documents from documents;
select count(*) as tasks from tasks;
```

Expected: consultation fields populated on leads that went through the consultation flow; case/docket rows appear after Start Service in Demo Mode.

## What is not in D2

- App UI still reads `demoStore` / localStorage (not Supabase)
- D1 public intake rows remain Supabase-only until D3
- RLS on business tables — deferred to D4

Next phase: **D3** — Live Mode Supabase reads + dual-write.
