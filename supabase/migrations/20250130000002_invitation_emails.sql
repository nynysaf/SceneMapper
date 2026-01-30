-- Invitation email custom subject/body and optional sender name per map
alter table public.maps
  add column if not exists invitation_email_subject_admin text,
  add column if not exists invitation_email_body_admin text,
  add column if not exists invitation_email_subject_collaborator text,
  add column if not exists invitation_email_body_collaborator text,
  add column if not exists invitation_sender_name text;

comment on column public.maps.invitation_sender_name is 'Optional "From" display name for invitation emails; address stays app-configured for deliverability.';
