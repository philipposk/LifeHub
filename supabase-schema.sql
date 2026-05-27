-- LifeHub bootstrap schema for Supabase sync.
-- Run once in the Supabase SQL editor for the project you point LifeHub at.
--
-- Design: single generic outbox table so the client schema can evolve without
-- a migration every time. Each LifeHub record (task / note / capture / etc.)
-- lands here keyed by its local id; `table_name` records which logical table
-- it belongs to; `payload` holds the full row JSON.

create extension if not exists "uuid-ossp";

create table if not exists public.lifehub_records (
  id          text primary key,
  user_id     text,
  table_name  text not null,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

create index if not exists lifehub_records_user_id_idx     on public.lifehub_records (user_id);
create index if not exists lifehub_records_table_name_idx  on public.lifehub_records (table_name);
create index if not exists lifehub_records_updated_at_idx  on public.lifehub_records (updated_at desc);

-- Row Level Security: each authenticated user only sees their own rows.
-- For the v1 local-only `local-guest` user, set up an anon policy (or skip RLS
-- entirely while testing).
alter table public.lifehub_records enable row level security;

drop policy if exists "users read own"   on public.lifehub_records;
drop policy if exists "users write own"  on public.lifehub_records;
drop policy if exists "anon r/w guest"   on public.lifehub_records;

create policy "users read own" on public.lifehub_records
  for select using (auth.uid()::text = user_id);
create policy "users write own" on public.lifehub_records
  for insert with check (auth.uid()::text = user_id);
create policy "users update own" on public.lifehub_records
  for update using (auth.uid()::text = user_id);
create policy "users delete own" on public.lifehub_records
  for delete using (auth.uid()::text = user_id);

-- During development you can also allow the anon role to write `local-guest`
-- rows so the offline-first client can sync without auth. Uncomment if needed:
-- create policy "anon r/w guest" on public.lifehub_records
--   for all to anon using (user_id = 'local-guest') with check (user_id = 'local-guest');
