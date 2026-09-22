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
