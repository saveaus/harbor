-- Harbor: client portal workspace schema.
-- Every workspace-owned row carries workspace_id so row-level security can
-- authorize it with one membership check.

create extension if not exists pgcrypto;

-- Workspaces and internal team -------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  legal_name text not null default '',
  country text not null default '',
  brand_color text not null default '#2f6fed',
  companies_enabled boolean not null default true,
  welcome_message text not null default '',
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'admin', 'member');

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  display_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

create function public.is_workspace_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target and m.user_id = (select auth.uid())
  );
$$;

create function public.is_workspace_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

-- CRM ---------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  website text not null default '',
  created_at timestamptz not null default now()
);

create index companies_workspace_idx on public.companies (workspace_id);

create type public.contact_status as enum ('not_invited', 'invited', 'active');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  email text not null check (position('@' in email) > 1),
  status public.contact_status not null default 'not_invited',
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index contacts_workspace_idx on public.contacts (workspace_id);
create index contacts_company_idx on public.contacts (company_id);

-- Channels: one conversation and one file space per company or contact -----

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null check (kind in ('messages', 'files')),
  company_id uuid references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  title text not null,
  last_activity_at timestamptz not null default now(),
  last_activity_summary text not null default '',
  created_at timestamptz not null default now(),
  check ((company_id is null) <> (contact_id is null))
);

create unique index channels_company_kind_idx
  on public.channels (kind, company_id) where company_id is not null;
create unique index channels_contact_kind_idx
  on public.channels (kind, contact_id) where contact_id is not null;
create index channels_workspace_idx on public.channels (workspace_id, kind, last_activity_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index messages_channel_idx on public.messages (channel_id, created_at);

create table public.file_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  parent_id uuid references public.file_items (id) on delete cascade,
  kind text not null check (kind in ('folder', 'file', 'link')),
  name text not null check (char_length(name) between 1 and 255),
  url text,
  storage_path text,
  size_bytes bigint,
  content_type text,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  check (
    (kind = 'folder' and url is null and storage_path is null)
    or (kind = 'file' and storage_path is not null)
    or (kind = 'link' and url is not null)
  )
);

create index file_items_channel_idx on public.file_items (channel_id, parent_id);

-- Payments ----------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  billing_interval text not null default 'one_time'
    check (billing_interval in ('one_time', 'month', 'year')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index products_workspace_idx on public.products (workspace_id);

create type public.invoice_status as enum ('draft', 'open', 'paid', 'void');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  number integer not null,
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  status public.invoice_status not null default 'open',
  collection text not null default 'send_invoice'
    check (collection in ('charge_automatically', 'send_invoice')),
  currency text not null default 'usd',
  memo text not null default '',
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, number)
);

create index invoices_workspace_idx on public.invoices (workspace_id, created_at desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null check (char_length(description) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0)
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

create function public.assign_invoice_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.workspace_id::text));
  select coalesce(max(i.number), 0) + 1 into new.number
  from public.invoices i where i.workspace_id = new.workspace_id;
  return new;
end;
$$;

create trigger invoices_assign_number
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

create type public.subscription_status as enum ('active', 'canceled');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  status public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  canceled_at timestamptz
);

create index subscriptions_workspace_idx on public.subscriptions (workspace_id);

create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index payment_links_workspace_idx on public.payment_links (workspace_id);

-- Contracts ---------------------------------------------------------------

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  body text not null default '',
  created_at timestamptz not null default now()
);

create type public.contract_status as enum ('awaiting_signature', 'signed', 'declined');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  template_id uuid references public.contract_templates (id) on delete set null,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  name text not null,
  body text not null,
  status public.contract_status not null default 'awaiting_signature',
  sent_at timestamptz not null default now(),
  signed_at timestamptz,
  signed_name text
);

create index contracts_workspace_idx on public.contracts (workspace_id, sent_at desc);

-- Forms -------------------------------------------------------------------

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  created_at timestamptz not null default now()
);

create type public.form_request_status as enum ('pending', 'completed');

create table public.form_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  status public.form_request_status not null default 'pending',
  answers jsonb,
  sent_at timestamptz not null default now(),
  completed_at timestamptz
);

create index form_requests_form_idx on public.form_requests (form_id);

-- Help desk ---------------------------------------------------------------

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '',
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create index help_articles_workspace_idx on public.help_articles (workspace_id, updated_at desc);

-- Notifications and installed apps ---------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  body text not null default '',
  href text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_workspace_idx on public.notifications (workspace_id, created_at desc);

create table public.app_installs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  app_key text not null check (app_key in ('files', 'payments', 'contracts', 'forms', 'helpdesk')),
  installed_at timestamptz not null default now(),
  primary key (workspace_id, app_key)
);

-- Row-level security ------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "members read workspace" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy "admins update workspace" on public.workspaces
  for update to authenticated using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "members read team" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members update own profile" on public.workspace_members
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'contacts', 'channels', 'messages', 'file_items', 'products',
    'invoices', 'invoice_items', 'subscriptions', 'payment_links',
    'contract_templates', 'contracts', 'forms', 'form_requests',
    'help_articles', 'notifications', 'app_installs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated '
      'using (public.is_workspace_member(workspace_id)) '
      'with check (public.is_workspace_member(workspace_id))',
      t
    );
  end loop;
end;
$$;

-- Workspace creation ------------------------------------------------------

create function public.create_workspace(workspace_name text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_email text;
  new_workspace uuid;
  sample_company uuid;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select u.email into caller_email from auth.users u where u.id = caller;

  insert into public.workspaces (name, legal_name, welcome_message)
  values (workspace_name, workspace_name, 'Welcome to the ' || workspace_name || ' portal.')
  returning id into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role, display_name, email)
  values (new_workspace, caller, 'owner', member_name, coalesce(caller_email, ''));

  insert into public.companies (workspace_id, name)
  values (new_workspace, workspace_name || ' (Sample company)')
  returning id into sample_company;

  insert into public.contacts (workspace_id, company_id, first_name, last_name, email)
  values (new_workspace, sample_company, member_name, '', coalesce(caller_email, 'sample@example.com'));

  insert into public.channels (workspace_id, kind, company_id, title, last_activity_summary)
  values
    (new_workspace, 'messages', sample_company, workspace_name || ' (Sample company)', 'Conversation started'),
    (new_workspace, 'files', sample_company, workspace_name || ' (Sample company)', 'Shared space created');

  return new_workspace;
end;
$$;

revoke all on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;

-- File storage: objects live under "<workspace_id>/..." -------------------

insert into storage.buckets (id, name, public)
values ('workspace-files', 'workspace-files', false)
on conflict (id) do nothing;

create policy "members read workspace files" on storage.objects
  for select to authenticated
  using (bucket_id = 'workspace-files'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

create policy "members upload workspace files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'workspace-files'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

create policy "members delete workspace files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workspace-files'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
