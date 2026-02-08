-- Featured maps: request-to-feature flow and platform-admin curated list
-- feature_requested_at: set when map creator checks "Submit as a featured map"
-- featured_order: position in featured list (1-based); null = not featured
-- featured_active: when true, map appears on home page (up to 6); when false, only on Featured maps page

alter table public.maps
  add column if not exists feature_requested_at timestamptz,
  add column if not exists featured_order int,
  add column if not exists featured_active boolean default false;

create index if not exists idx_maps_feature_requested on public.maps (feature_requested_at) where feature_requested_at is not null;
create index if not exists idx_maps_featured_order on public.maps (featured_order) where featured_order is not null;

comment on column public.maps.feature_requested_at is 'When the map creator requested to be featured; null after approve/deny or if never requested.';
comment on column public.maps.featured_order is 'Position in featured list (1-based). Null = not featured.';
comment on column public.maps.featured_active is 'When true, show on home page (up to 6). When false, only on Featured maps page.';
