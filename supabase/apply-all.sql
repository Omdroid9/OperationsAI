-- SkyOS apply-all.sql
-- Run once in Supabase SQL Editor (top to bottom). Safe to re-run (idempotent).
-- Order: schema → auth → intake → d2 mirror → rls → d5 cutover notes

-- ========== 1. schema.sql ==========
-- SkyOS schema. Run in the Supabase SQL editor when enabling persistence.
-- Demo mode still works without Supabase; live provider results are mirrored here when configured.

create table if not exists carriers (
  id text primary key,
  usdot text unique not null,
  legal_name text not null,
  dba_name text,
  state text,
  city text,
  phone text,
  email text,
  power_units integer,
  drivers integer,
  operation_type text,
  authorized_for_hire boolean,
  new_entrant boolean,
  hazmat boolean,
  passenger boolean,
  cargo_types jsonb,
  authority_status text,
  is_customer boolean default false,
  existing_services jsonb default '[]'::jsonb,
  profile_kind text default 'demo',
  source text,
  source_last_checked_at timestamptz,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists carrier_snapshots (
  id text primary key,
  carrier_id text references carriers(id) on delete cascade,
  snapshot_date date,
  power_units integer,
  drivers integer,
  authority_status text,
  operation_type text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table if not exists signals (
  id text primary key,
  carrier_id text references carriers(id) on delete cascade,
  type text,
  title text,
  description text,
  score_contribution integer,
  confidence numeric,
  source text,
  detected_at timestamptz,
  metadata_json jsonb,
  created_at timestamptz default now()
);

create table if not exists leads (
  id text primary key,
  carrier_id text references carriers(id) on delete cascade,
  stage text,
  score integer,
  recommended_service text,
  reason_summary text,
  assigned_to text,
  preferred_language text,
  detected_languages jsonb default '[]'::jsonb,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists activities (
  id text primary key,
  lead_id text references leads(id) on delete cascade,
  type text,
  content text,
  created_at timestamptz default now(),
  created_by text,
  metadata_json jsonb
);

create table if not exists calls (
  id text primary key,
  lead_id text references leads(id) on delete set null,
  carrier_id text,
  provider text,
  provider_call_id text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  language text,
  detected_languages jsonb,
  original_transcript text,
  english_summary text,
  qualification_json jsonb,
  recording_url text,
  created_at timestamptz default now()
);

create table if not exists live_calls (
  provider_call_id text primary key,
  lead_id text,
  status text not null default 'queued',
  transcript text,
  qualification_json jsonb,
  metadata_json jsonb default '{}'::jsonb,
  started_at timestamptz default now(),
  ended_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists regulations (
  id text primary key,
  title text,
  agency text,
  source_url text,
  source_text text,
  category text,
  published_date date,
  effective_date date,
  deadline date,
  affected_segment text,
  required_action text,
  confidence numeric,
  source_summary text,
  status text default 'analyzed',
  campaign_created boolean default false,
  customers_flagged boolean default false,
  analysis_json jsonb,
  created_at timestamptz default now()
);

create table if not exists regulation_matches (
  regulation_id text references regulations(id) on delete cascade,
  carrier_id text references carriers(id) on delete cascade,
  opportunity_id text,
  match_type text,
  audience text,
  reason text,
  required_change text,
  suggested_service text,
  match_json jsonb,
  primary key (regulation_id, carrier_id)
);

create table if not exists cases (
  id text primary key,
  lead_id text references leads(id) on delete set null,
  carrier_id text references carriers(id) on delete cascade,
  service_type text,
  status text,
  opened_at timestamptz,
  target_date date,
  checklist_label text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists documents (
  id text primary key,
  case_id text references cases(id) on delete cascade,
  file_name text,
  storage_path text,
  document_type text,
  person_name text,
  issued_date date,
  expiration_date date,
  confidence numeric,
  extraction_json jsonb,
  review_status text,
  required boolean default true,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id text primary key,
  case_id text references cases(id) on delete cascade,
  title text,
  description text,
  status text,
  priority text,
  due_date date,
  source text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Full workspace snapshot for demo-state sync (single-tenant prototype).
create table if not exists workspace_snapshots (
  id text primary key default 'default',
  state_json jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists idx_leads_carrier on leads(carrier_id);
create index if not exists idx_calls_lead on calls(lead_id);
create index if not exists idx_documents_case on documents(case_id);
create index if not exists idx_regulation_matches_reg on regulation_matches(regulation_id);

-- ========== 2. auth-schema.sql ==========
-- SkyOS D0 auth schema (additive). Run in Supabase SQL Editor.
-- Prerequisite: base schema.sql already applied. Do not drop existing tables or data.
--
-- Always run Blocks 1–3, even if profiles already exists. Scripts are idempotent
-- (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS) and remove legacy
-- broader policies such as profiles_select_authenticated or profiles_admin_write.

-- ---------------------------------------------------------------------------
-- Block 1: profiles table
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'staff'
    check (role in ('admin', 'staff', 'readonly')),
  staff_key text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_staff_key on public.profiles(staff_key);

-- ---------------------------------------------------------------------------
-- Block 2: RLS helper functions (for later phases; not used by D0 policies)
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '')
$$;

create or replace function public.current_staff_key()
returns text
language sql stable security definer set search_path = public
as $$
  select staff_key from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role() = 'admin'
$$;

-- ---------------------------------------------------------------------------
-- Block 3: profiles RLS (D0)
-- Read: current user only. No browser-side INSERT/UPDATE/DELETE on profiles.
-- Profile changes: SQL Editor (postgres) until a protected server action exists.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Profiles readable by authenticated users" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own_limited" on public.profiles;
drop policy if exists "profiles_admin_write" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- First admin profile row: insert via SQL Editor (Block 4), which bypasses RLS.

-- ========== 3. intake-schema.sql ==========
-- D1 public intake audit + rate-limit support.
-- Run in Supabase SQL Editor after D0 auth schema.
-- Service role writes only; no client policies.

create table if not exists public.intake_requests (
  id uuid primary key default gen_random_uuid(),
  ip_hash text,
  email_hash text,
  lead_id text,
  created_at timestamptz default now(),
  status text default 'accepted' check (status in ('accepted', 'rejected', 'rate_limited', 'honeypot'))
);

create index if not exists idx_intake_requests_created on public.intake_requests (created_at desc);
create index if not exists idx_intake_requests_ip_created on public.intake_requests (ip_hash, created_at desc);
create index if not exists idx_intake_requests_email_created on public.intake_requests (email_hash, created_at desc);

alter table public.intake_requests enable row level security;
-- No policies: service role only; no browser access.

-- ========== 4. d2-mirror-schema.sql ==========
-- D2 mirror support. Run in Supabase SQL Editor (idempotent).
-- Adds task metadata for assignedTo/kind on mirror write.

alter table public.tasks
  add column if not exists metadata_json jsonb default '{}'::jsonb;

-- ========== 5. rls-schema.sql ==========
-- D4 business-table RLS (staging). Run in Supabase SQL Editor after D0–D3.
-- Prerequisite: auth-schema.sql Blocks 1–3 (profiles + helper functions).
-- Service role (server API, public intake) bypasses RLS. Anon/authenticated clients are gated.

-- ---------------------------------------------------------------------------
-- Helpers for child-table access via lead / case assignment
-- ---------------------------------------------------------------------------
create or replace function public.staff_can_read_lead(p_lead_id text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.leads l
    where l.id = p_lead_id
      and (
        public.is_admin()
        or public.current_role() = 'readonly'
        or (
          public.current_role() = 'staff'
          and l.assigned_to = public.current_staff_key()
        )
      )
  );
$$;

create or replace function public.staff_can_read_case(p_case_id text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    left join public.leads l on l.id = c.lead_id
    where c.id = p_case_id
      and (
        public.is_admin()
        or public.current_role() = 'readonly'
        or (
          public.current_role() = 'staff'
          and (
            coalesce(c.metadata_json->>'ownerId', '') = public.current_staff_key()
            or l.assigned_to = public.current_staff_key()
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;

drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all"
  on public.leads for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "leads_staff_select_assigned" on public.leads;
create policy "leads_staff_select_assigned"
  on public.leads for select to authenticated
  using (
    public.current_role() = 'staff'
    and assigned_to = public.current_staff_key()
  );

drop policy if exists "leads_staff_update_assigned" on public.leads;
create policy "leads_staff_update_assigned"
  on public.leads for update to authenticated
  using (
    public.current_role() = 'staff'
    and assigned_to = public.current_staff_key()
  )
  with check (
    public.current_role() = 'staff'
    and assigned_to = public.current_staff_key()
  );

drop policy if exists "leads_readonly_select" on public.leads;
create policy "leads_readonly_select"
  on public.leads for select to authenticated
  using (public.current_role() = 'readonly');

-- No insert/update/delete for staff/readonly. Public intake uses service role.

-- ---------------------------------------------------------------------------
-- carriers (read via visible leads; admin writes)
-- ---------------------------------------------------------------------------
alter table public.carriers enable row level security;

drop policy if exists "carriers_admin_all" on public.carriers;
create policy "carriers_admin_all"
  on public.carriers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "carriers_readonly_select" on public.carriers;
create policy "carriers_readonly_select"
  on public.carriers for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "carriers_staff_select" on public.carriers;
create policy "carriers_staff_select"
  on public.carriers for select to authenticated
  using (
    public.current_role() = 'staff'
    and exists (
      select 1 from public.leads l
      where l.carrier_id = carriers.id
        and l.assigned_to = public.current_staff_key()
    )
  );

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------
alter table public.activities enable row level security;

drop policy if exists "activities_admin_all" on public.activities;
create policy "activities_admin_all"
  on public.activities for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "activities_readonly_select" on public.activities;
create policy "activities_readonly_select"
  on public.activities for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "activities_staff_select" on public.activities;
create policy "activities_staff_select"
  on public.activities for select to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_lead(lead_id)
  );

drop policy if exists "activities_staff_insert" on public.activities;
create policy "activities_staff_insert"
  on public.activities for insert to authenticated
  with check (
    public.current_role() = 'staff'
    and public.staff_can_read_lead(lead_id)
  );

-- ---------------------------------------------------------------------------
-- calls
-- ---------------------------------------------------------------------------
alter table public.calls enable row level security;

drop policy if exists "calls_admin_all" on public.calls;
create policy "calls_admin_all"
  on public.calls for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "calls_readonly_select" on public.calls;
create policy "calls_readonly_select"
  on public.calls for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "calls_staff_select" on public.calls;
create policy "calls_staff_select"
  on public.calls for select to authenticated
  using (
    public.current_role() = 'staff'
    and lead_id is not null
    and public.staff_can_read_lead(lead_id)
  );

-- ---------------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------------
alter table public.cases enable row level security;

drop policy if exists "cases_admin_all" on public.cases;
create policy "cases_admin_all"
  on public.cases for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "cases_readonly_select" on public.cases;
create policy "cases_readonly_select"
  on public.cases for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "cases_staff_select" on public.cases;
create policy "cases_staff_select"
  on public.cases for select to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_case(id)
  );

drop policy if exists "cases_staff_update" on public.cases;
create policy "cases_staff_update"
  on public.cases for update to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_case(id)
  )
  with check (
    public.current_role() = 'staff'
    and public.staff_can_read_case(id)
    and coalesce(metadata_json->>'ownerId', '') = coalesce(
      (select c.metadata_json->>'ownerId' from public.cases c where c.id = cases.id),
      metadata_json->>'ownerId',
      ''
    )
  );

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all"
  on public.documents for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "documents_readonly_select" on public.documents;
create policy "documents_readonly_select"
  on public.documents for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "documents_staff_select" on public.documents;
create policy "documents_staff_select"
  on public.documents for select to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_case(case_id)
  );

drop policy if exists "documents_staff_update" on public.documents;
create policy "documents_staff_update"
  on public.documents for update to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_case(case_id)
  )
  with check (
    public.current_role() = 'staff'
    and public.staff_can_read_case(case_id)
  );

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks_admin_all" on public.tasks;
create policy "tasks_admin_all"
  on public.tasks for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tasks_readonly_select" on public.tasks;
create policy "tasks_readonly_select"
  on public.tasks for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "tasks_staff_select" on public.tasks;
create policy "tasks_staff_select"
  on public.tasks for select to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_case(case_id)
  );

drop policy if exists "tasks_staff_update" on public.tasks;
create policy "tasks_staff_update"
  on public.tasks for update to authenticated
  using (
    public.current_role() = 'staff'
    and public.staff_can_read_case(case_id)
  )
  with check (
    public.current_role() = 'staff'
    and public.staff_can_read_case(case_id)
  );

-- ---------------------------------------------------------------------------
-- regulations + matches (shared read; admin write)
-- ---------------------------------------------------------------------------
alter table public.regulations enable row level security;

drop policy if exists "regulations_admin_all" on public.regulations;
create policy "regulations_admin_all"
  on public.regulations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "regulations_authenticated_select" on public.regulations;
create policy "regulations_authenticated_select"
  on public.regulations for select to authenticated
  using (public.current_role() in ('staff', 'readonly'));

alter table public.regulation_matches enable row level security;

drop policy if exists "regulation_matches_admin_all" on public.regulation_matches;
create policy "regulation_matches_admin_all"
  on public.regulation_matches for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "regulation_matches_authenticated_select" on public.regulation_matches;
create policy "regulation_matches_authenticated_select"
  on public.regulation_matches for select to authenticated
  using (public.current_role() in ('staff', 'readonly'));

-- ---------------------------------------------------------------------------
-- signals (read via carrier visibility)
-- ---------------------------------------------------------------------------
alter table public.signals enable row level security;

drop policy if exists "signals_admin_all" on public.signals;
create policy "signals_admin_all"
  on public.signals for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "signals_readonly_select" on public.signals;
create policy "signals_readonly_select"
  on public.signals for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "signals_staff_select" on public.signals;
create policy "signals_staff_select"
  on public.signals for select to authenticated
  using (
    public.current_role() = 'staff'
    and exists (
      select 1 from public.leads l
      where l.carrier_id = signals.carrier_id
        and l.assigned_to = public.current_staff_key()
    )
  );

-- ---------------------------------------------------------------------------
-- carrier_snapshots (same carrier visibility as signals)
-- ---------------------------------------------------------------------------
alter table public.carrier_snapshots enable row level security;

drop policy if exists "carrier_snapshots_admin_all" on public.carrier_snapshots;
create policy "carrier_snapshots_admin_all"
  on public.carrier_snapshots for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "carrier_snapshots_readonly_select" on public.carrier_snapshots;
create policy "carrier_snapshots_readonly_select"
  on public.carrier_snapshots for select to authenticated
  using (public.current_role() = 'readonly');

drop policy if exists "carrier_snapshots_staff_select" on public.carrier_snapshots;
create policy "carrier_snapshots_staff_select"
  on public.carrier_snapshots for select to authenticated
  using (
    public.current_role() = 'staff'
    and exists (
      select 1 from public.leads l
      where l.carrier_id = carrier_snapshots.carrier_id
        and l.assigned_to = public.current_staff_key()
    )
  );

-- ---------------------------------------------------------------------------
-- workspace_snapshots, intake_requests, live_calls — service role only
-- ---------------------------------------------------------------------------
alter table public.workspace_snapshots enable row level security;

drop policy if exists "workspace_snapshots_deny_all" on public.workspace_snapshots;

alter table public.intake_requests enable row level security;

alter table public.live_calls enable row level security;

comment on table public.workspace_snapshots is
  'ids: default=legacy backup; demo=walkthrough; live=authenticated workspace. Server/service role only.';

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public'
--   and tablename in ('leads','carriers','cases','tasks','documents','activities','calls')
-- order by tablename, policyname;

-- Rollback (temporary recovery only):
-- alter table public.leads disable row level security;
-- (repeat per table; re-run this file to restore)

-- ========== 6. d5-cutover-schema.sql ==========
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
