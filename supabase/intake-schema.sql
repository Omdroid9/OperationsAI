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
