-- Create minimal history table for Last Known Good (LKG) snapshots
create table if not exists energy_data_history (
  id uuid primary key default gen_random_uuid(),
  as_of timestamptz not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Index for fast latest lookup
create index if not exists energy_data_history_asof_idx on energy_data_history (as_of desc);

-- View for latest data
create or replace view energy_data_latest as
  select payload from energy_data_history order by as_of desc limit 1;