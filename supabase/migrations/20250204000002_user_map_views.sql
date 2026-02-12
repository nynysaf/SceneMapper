-- Track which maps a user has viewed (for "Your Maps" filtering).
-- user_id references auth.users; no FK to avoid cross-schema dependency.

create table if not exists public.user_map_views (
  user_id uuid not null,
  map_id uuid not null references public.maps (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, map_id)
);

create index if not exists idx_user_map_views_user_id on public.user_map_views (user_id);

alter table public.user_map_views enable row level security;

comment on table public.user_map_views is 'Tracks which maps a user has viewed; used to filter Your Maps';
