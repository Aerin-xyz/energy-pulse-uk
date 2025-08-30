-- Ensure energy_data_history exists
create table if not exists public.energy_data_history (
  id uuid primary key default gen_random_uuid(),
  as_of timestamptz not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Helpful index for latest lookups
create index if not exists energy_data_history_asof_idx on public.energy_data_history (as_of desc);

-- Latest view (payload only)
create or replace view public.energy_data_latest as
  select payload from public.energy_data_history
  order by as_of desc
  limit 1;
