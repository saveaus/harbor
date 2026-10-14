-- Compliance: incident register, company documents, saved reports, and a
-- separate policy/procedure template library. The library starts empty;
-- templates are added by later migrations and are not organisation documents.

create type public.incident_status as enum (
  'triage', 'open', 'resolving', 'on_hold', 'resolved', 'not_an_incident', 'archived'
);
create type public.incident_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.incident_severity as enum ('minor', 'moderate', 'major', 'critical');
create type public.company_document_status as enum ('draft', 'current', 'archived');
create type public.policy_kind as enum ('policy', 'procedure');

create table public.policy_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  kind public.policy_kind not null,
  title text not null check (char_length(title) between 1 and 200),
  category text not null check (char_length(category) between 1 and 80),
  summary text not null default '' check (char_length(summary) <= 500),
  body text not null default '' check (char_length(body) <= 100000),
  version text not null default '1.0' check (char_length(version) between 1 and 20),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.policy_templates is
  'Shared policy and procedure templates. Separate from company_documents; rows are added later.';

create index policy_templates_kind_idx on public.policy_templates (published, kind, sort_order, title);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  number integer not null check (number > 0),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 20000),
  status public.incident_status not null default 'triage',
  priority public.incident_priority not null default 'medium',
  severity public.incident_severity not null default 'minor',
  category text not null check (char_length(category) between 1 and 80),
  location text not null default '' check (char_length(location) <= 200),
  occurred_at timestamptz not null,
  reported_at timestamptz not null default now(),
  contact_id uuid references public.contacts (id) on delete set null,
  reported_by_id uuid references public.staff (id) on delete set null,
  assigned_to_id uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number)
);

create index incidents_workspace_reported_idx on public.incidents (workspace_id, reported_at desc);
create index incidents_workspace_status_idx on public.incidents (workspace_id, status);

create table public.incident_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  author_name text not null default '' check (char_length(author_name) <= 200),
  created_at timestamptz not null default now()
);

create index incident_notes_incident_idx on public.incident_notes (incident_id, created_at desc);

create table public.incident_status_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  status public.incident_status not null,
  actor_name text not null default '' check (char_length(actor_name) <= 200),
  started_at timestamptz not null default now()
);

create index incident_status_events_incident_idx on public.incident_status_events (incident_id, started_at);

create table public.company_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null check (char_length(category) between 1 and 80),
  status public.company_document_status not null default 'current',
  summary text not null default '' check (char_length(summary) <= 500),
  body text not null default '' check (char_length(body) <= 100000),
  reference text not null default '' check (char_length(reference) <= 80),
  owner_id uuid references public.staff (id) on delete set null,
  template_id uuid references public.policy_templates (id) on delete set null,
  issued_on date,
  review_on date,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index company_documents_workspace_idx on public.company_documents (workspace_id, updated_at desc);

create table public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  report_key text not null check (
    report_key in ('incident-register', 'open-incidents', 'document-register', 'reviews-due')
  ),
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index saved_reports_workspace_idx on public.saved_reports (workspace_id, created_at desc);

-- Numbering and history ----------------------------------------------------

create function private.assign_incident_number() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext(new.workspace_id::text));
    select coalesce(max(number), 0) + 1 into new.number
    from public.incidents
    where workspace_id = new.workspace_id;
  end if;
  return new;
end;
$$;

create trigger assign_incident_number
  before insert on public.incidents
  for each row execute function private.assign_incident_number();

create function private.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_incidents
  before update on public.incidents
  for each row execute function private.touch_updated_at();

create trigger touch_company_documents
  before update on public.company_documents
  for each row execute function private.touch_updated_at();

create function private.record_incident_status() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  insert into public.incident_status_events (workspace_id, incident_id, status, actor_name)
  values (
    new.workspace_id,
    new.id,
    new.status,
    coalesce((
      select m.display_name from public.workspace_members m
      where m.workspace_id = new.workspace_id and m.user_id = auth.uid()
    ), '')
  );
  return null;
end;
$$;

create trigger record_incident_status
  after insert or update of status on public.incidents
  for each row execute function private.record_incident_status();

revoke all on function private.assign_incident_number() from public, anon;
revoke all on function private.touch_updated_at() from public, anon;
revoke all on function private.record_incident_status() from public, anon;
grant execute on function private.assign_incident_number() to authenticated;
grant execute on function private.touch_updated_at() to authenticated;
grant execute on function private.record_incident_status() to authenticated;

-- Access -------------------------------------------------------------------

alter table public.policy_templates enable row level security;
create policy "authenticated read published policy templates"
  on public.policy_templates
  for select to authenticated
  using (published);
revoke insert, update, delete on public.policy_templates from anon, authenticated;
grant select on public.policy_templates to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'incidents', 'incident_notes', 'incident_status_events', 'company_documents', 'saved_reports'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_member(workspace_id)) '
      'with check (private.is_workspace_member(workspace_id))',
      t
    );
    if t <> 'incident_status_events' then
      execute format(
        'create trigger record_audit_event after insert or update or delete on public.%I '
        'for each row execute function private.record_audit_event()',
        t
      );
    end if;
  end loop;
end;
$$;

alter table public.app_installs drop constraint app_installs_app_key_check;
alter table public.app_installs add constraint app_installs_app_key_check
  check (app_key in (
    'files', 'payments', 'contracts', 'forms', 'helpdesk', 'timetracker', 'scheduling', 'finance', 'compliance'
  ));
