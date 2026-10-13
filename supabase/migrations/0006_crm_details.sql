-- Workspace-defined custom fields and team-only notes for CRM records.
-- Values live outside contacts/companies because clients can read their own rows there.

create type public.custom_field_type as enum ('text', 'number', 'date', 'url', 'email', 'phone');

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type public.custom_field_type not null default 'text',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.record_details (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid unique references public.contacts (id) on delete cascade,
  company_id uuid unique references public.companies (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 20000),
  field_values jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_values) = 'object' and pg_column_size(field_values) <= 65536),
  updated_at timestamptz not null default now(),
  check ((contact_id is null) <> (company_id is null))
);

create index record_details_workspace_idx on public.record_details (workspace_id);

do $$
declare
  t text;
begin
  foreach t in array array['custom_fields', 'record_details']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_member(workspace_id)) '
      'with check (private.is_workspace_member(workspace_id))',
      t
    );
  end loop;
end;
$$;
