-- Staff records with compliance credentials, and team-only care profiles for clients.
-- Client profiles live outside contacts because clients can read their own contact row.

create type public.staff_status as enum ('onboarding', 'active', 'inactive');
create type public.employment_type as enum ('full_time', 'part_time', 'casual', 'contractor');

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  email text not null check (position('@' in email) > 1),
  phone text not null default '' check (char_length(phone) <= 40),
  position text not null default '' check (char_length(position) <= 80),
  employment_type public.employment_type,
  status public.staff_status not null default 'onboarding',
  start_date date,
  created_at timestamptz not null default now(),
  unique (workspace_id, email),
  unique (workspace_id, user_id)
);

create index staff_workspace_idx on public.staff (workspace_id);

create type public.credential_kind as enum (
  'ndis_worker_screening', 'working_with_children', 'police_check', 'first_aid',
  'cpr', 'drivers_licence', 'car_insurance', 'other'
);

create table public.staff_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  kind public.credential_kind not null,
  reference text not null default '' check (char_length(reference) <= 80),
  expires_on date,
  created_at timestamptz not null default now()
);

create index staff_credentials_staff_idx on public.staff_credentials (staff_id);

create type public.client_status as enum ('prospect', 'active', 'on_hold', 'inactive');
create type public.funding_type as enum ('ndis', 'home_care_package', 'support_at_home', 'private');
create type public.plan_management as enum ('ndia_managed', 'plan_managed', 'self_managed');

create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null unique references public.contacts (id) on delete cascade,
  status public.client_status not null default 'prospect',
  funding public.funding_type,
  ndis_number text not null default '' check (ndis_number ~ '^[0-9]{0,9}$'),
  plan_management public.plan_management,
  plan_start date,
  plan_end date,
  date_of_birth date,
  phone text not null default '' check (char_length(phone) <= 40),
  address text not null default '' check (char_length(address) <= 200),
  key_worker_id uuid references public.staff (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (plan_end is null or plan_start is null or plan_end >= plan_start)
);

create index client_profiles_workspace_idx on public.client_profiles (workspace_id);
create index client_profiles_key_worker_idx on public.client_profiles (key_worker_id);

do $$
declare
  t text;
begin
  foreach t in array array['staff', 'staff_credentials', 'client_profiles']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_member(workspace_id)) '
      'with check (private.is_workspace_member(workspace_id))',
      t
    );
    execute format(
      'create trigger record_audit_event after insert or update or delete on public.%I '
      'for each row execute function private.record_audit_event()',
      t
    );
  end loop;
end;
$$;

-- Every team member is a staff record; joining links a staff record added under the same email.
create function private.link_member_staff() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.staff (workspace_id, user_id, first_name, email, status)
  values (new.workspace_id, new.user_id, new.display_name, new.email, 'active')
  on conflict (workspace_id, email) do update
    set user_id = excluded.user_id, status = 'active'
    where public.staff.user_id is null;
  return null;
end;
$$;

revoke all on function private.link_member_staff() from public, anon, authenticated;

create trigger link_member_staff after insert on public.workspace_members
  for each row when (new.email <> '') execute function private.link_member_staff();

-- Every contact is a client with a care profile.
create function private.create_client_profile() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.client_profiles (workspace_id, contact_id)
  values (new.workspace_id, new.id)
  on conflict (contact_id) do nothing;
  return null;
end;
$$;

revoke all on function private.create_client_profile() from public, anon, authenticated;

create trigger create_client_profile after insert on public.contacts
  for each row execute function private.create_client_profile();

insert into public.staff (workspace_id, user_id, first_name, email, status, created_at)
select m.workspace_id, m.user_id, m.display_name, m.email, 'active', m.created_at
from public.workspace_members m
where m.email <> ''
on conflict do nothing;

insert into public.staff (workspace_id, email, status, created_at)
select distinct on (i.workspace_id, lower(i.email)) i.workspace_id, lower(i.email), 'onboarding', i.created_at
from public.invites i
where i.kind = 'team' and i.accepted_at is null and i.revoked_at is null
order by i.workspace_id, lower(i.email), i.created_at
on conflict do nothing;

insert into public.client_profiles (workspace_id, contact_id, status)
select c.workspace_id, c.id, case when c.status = 'active' then 'active'::public.client_status else 'prospect' end
from public.contacts c
on conflict (contact_id) do nothing;
