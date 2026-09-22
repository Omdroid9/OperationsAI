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
