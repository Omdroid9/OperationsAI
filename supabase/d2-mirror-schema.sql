-- D2 mirror support. Run in Supabase SQL Editor (idempotent).
-- Adds task metadata for assignedTo/kind on mirror write.

alter table public.tasks
  add column if not exists metadata_json jsonb default '{}'::jsonb;
