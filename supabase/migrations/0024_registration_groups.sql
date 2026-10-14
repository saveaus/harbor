-- Registration groups the provider holds. Until at least one is set, there is
-- no audit-readiness checklist. Codes are NDIS Commission registration groups.

create table public.workspace_registration_groups (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  group_code text not null check (group_code in (
    '0101', '0102', '0104', '0106', '0107', '0108',
    '0115', '0116', '0117', '0125', '0126', '0127',
    '0128', '0129', '0131', '0132', '0133', '0134',
    '0136'
  )),
  created_at timestamptz not null default now(),
  primary key (workspace_id, group_code)
);

comment on table public.workspace_registration_groups is
  'NDIS registration groups this workspace holds. Required evidence is derived from these rows.';

alter table public.workspace_registration_groups enable row level security;

create policy "members manage workspace_registration_groups"
  on public.workspace_registration_groups
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

create trigger record_audit_event
  after insert or update or delete on public.workspace_registration_groups
  for each row execute function private.record_audit_event();
