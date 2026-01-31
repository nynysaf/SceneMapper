-- Maps display options: region font scale, enabled node types, connections toggle
-- Ensures production API returns same shape as app (theme + these fields).
alter table public.maps
  add column if not exists region_font_scale numeric,
  add column if not exists enabled_node_types text[],
  add column if not exists connections_enabled boolean;

comment on column public.maps.region_font_scale is 'Scale factor for region label font size (REGION nodes only). Default 1 when absent.';
comment on column public.maps.enabled_node_types is 'Node types shown on the map (e.g. EVENT, PERSON, SPACE, COMMUNITY, REGION). When null, all are enabled.';
comment on column public.maps.connections_enabled is 'Whether connections are shown and available. Default true when null.';
