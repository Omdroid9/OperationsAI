-- D5 production cutover notes. Run in Supabase SQL Editor (non-destructive).

comment on table public.workspace_snapshots is
  'ids: default=legacy backup (do not overwrite); demo=walkthrough; live=live backup blob. Entity tables are authoritative in Live Mode.';

-- Inspect snapshot rows (do not delete default):
-- select id, updated_at, pg_column_size(state_json) as bytes
-- from public.workspace_snapshots
-- order by updated_at desc;

-- Optional: copy legacy default into demo once if demo row is missing:
-- insert into public.workspace_snapshots (id, state_json, updated_at)
-- select 'demo', state_json, now()
-- from public.workspace_snapshots
-- where id = 'default'
-- on conflict (id) do nothing;
