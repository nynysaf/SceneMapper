-- User map notification preferences (daily digest).
-- user_id references auth.users; no FK to avoid cross-schema dependency.

create table if not exists public.user_map_notification_prefs (
  user_id uuid not null,
  map_id uuid not null references public.maps (id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, map_id)
);

create index if not exists idx_user_map_notification_prefs_user_id on public.user_map_notification_prefs (user_id);

create trigger user_map_notification_prefs_updated_at
  before update on public.user_map_notification_prefs
  for each row execute function public.set_updated_at();

alter table public.user_map_notification_prefs enable row level security;

comment on table public.user_map_notification_prefs is 'Per-map daily digest preference for map admins';
