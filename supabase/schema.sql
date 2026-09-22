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
