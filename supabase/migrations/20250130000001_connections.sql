-- Phase 7: Connections table (node-to-node lines)
-- Run after 20250129000001_initial_schema.sql

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps (id) on delete cascade,
  from_node_id uuid not null references public.nodes (id) on delete cascade,
  to_node_id uuid not null references public.nodes (id) on delete cascade,
  description text not null default '',
  collaborator_id text not null default '',
  status text not null default 'approved' check (status in ('pending', 'approved')),
  curve_offset_x numeric check (curve_offset_x is null or (curve_offset_x >= 0 and curve_offset_x <= 100)),
  curve_offset_y numeric check (curve_offset_y is null or (curve_offset_y >= 0 and curve_offset_y <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_connections_map_id on public.connections (map_id);

comment on table public.connections is 'SceneMapper connections (lines) between nodes per map';

create trigger connections_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

alter table public.connections enable row level security;
