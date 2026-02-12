-- Element & connection config for per-map customization
-- Labels, icons, enabled state per node type; connection label and icon.

alter table public.maps
  add column if not exists map_template_id text default 'scene',
  add column if not exists element_config jsonb,
  add column if not exists connection_config jsonb;

comment on column public.maps.map_template_id is 'Map template: scene, ideas, or network. Default labels/icons.';
comment on column public.maps.element_config is 'Per-node-type overrides: label, icon, enabled. Keys: EVENT, PERSON, SPACE, COMMUNITY, REGION, MEDIA.';
comment on column public.maps.connection_config is 'Connection display: label, icon (Lucide name or data URL).';
