-- SceneMapper Phase 2: Initial Supabase schema
-- Run this in the Supabase SQL Editor or via: supabase db push
-- Tables: users, maps, nodes (matches lib/data.ts + types.ts)

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users
-- Use this table if not using Supabase Auth; otherwise use auth.users.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'SceneMapper users (used when not using Supabase Auth)';

-- ---------------------------------------------------------------------------
-- maps
-- One row per SceneMap; theme stored as JSONB (MapTheme).
-- ---------------------------------------------------------------------------
create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default '',
  description text not null default '',
  background_image_url text,
  theme jsonb not null default '{}',
  collaborator_password_hash text,
  admin_ids text[] not null default '{}',
  collaborator_ids text[] not null default '{}',
  public_view boolean not null default true,
  theme_id text,
  invited_admin_emails text[],
  invited_collaborator_emails text[],
  node_size_scale numeric,
  node_label_font_scale numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maps_slug on public.maps (slug);

comment on table public.maps is 'SceneMapper maps; theme is MapTheme JSON';

-- ---------------------------------------------------------------------------
-- nodes
-- One row per MapNode; map_id references maps.id.
-- ---------------------------------------------------------------------------
create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps (id) on delete cascade,
  type text not null check (type in ('EVENT', 'PERSON', 'SPACE', 'COMMUNITY')),
  title text not null default '',
  description text not null default '',
  website text,
  x numeric not null default 50 check (x >= 0 and x <= 100),
  y numeric not null default 50 check (y >= 0 and y <= 100),
  tags text[] not null default '{}',
  primary_tag text not null default '',
  collaborator_id text not null default '',
  status text not null default 'approved' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nodes_map_id on public.nodes (map_id);

comment on table public.nodes is 'SceneMapper nodes per map';

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger maps_updated_at
  before update on public.maps
  for each row execute function public.set_updated_at();

create trigger nodes_updated_at
  before update on public.nodes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- API routes use the service role key, which bypasses RLS.
-- Enable RLS so direct client access is denied; all access goes through Next.js API.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.maps enable row level security;
alter table public.nodes enable row level security;

-- No policies: service role bypasses RLS; anon/authenticated get no access.
-- Add policies later if you want Supabase Auth users to read/write directly.
