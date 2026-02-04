-- Allow MEDIA node type
alter table public.nodes
  drop constraint if exists nodes_type_check;

alter table public.nodes
  add constraint nodes_type_check check (type in ('EVENT', 'PERSON', 'SPACE', 'COMMUNITY', 'REGION', 'MEDIA'));

comment on column public.nodes.type is 'Node type: EVENT, PERSON, SPACE, COMMUNITY, REGION, or MEDIA.';
