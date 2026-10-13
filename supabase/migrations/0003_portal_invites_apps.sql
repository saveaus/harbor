-- Client portal access, invite links, branding, automations, time tracking
-- and sandboxed custom apps.
--
-- Clients are auth users linked to exactly one contact per workspace. They can
-- read rows that belong to their contact or their contact's company. Every
-- client write goes through a SECURITY DEFINER function that checks that
-- ownership, so no table grants clients direct insert or update access.

alter table public.workspaces
  add column logo_path text,
  add column custom_domain text unique
    check (custom_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'),
  add column custom_domain_added_at timestamptz;

-- Client identity -----------------------------------------------------------

alter table public.contacts add column user_id uuid references auth.users (id) on delete set null;
create unique index contacts_workspace_user_idx on public.contacts (workspace_id, user_id) where user_id is not null;
create index contacts_user_idx on public.contacts (user_id) where user_id is not null;

create function private.is_workspace_client(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contacts c
    where c.workspace_id = target and c.user_id = (select auth.uid())
  );
$$;

-- True when the caller is the contact, or belongs to the company, that owns a row.
create function private.client_sees(ws uuid, owner_company uuid, owner_contact uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contacts c
    where c.workspace_id = ws
      and c.user_id = (select auth.uid())
      and (c.id = owner_contact or (owner_company is not null and c.company_id = owner_company))
  );
$$;

create function private.client_channel(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.channels ch
    where ch.id = target and private.client_sees(ch.workspace_id, ch.company_id, ch.contact_id)
  );
$$;

-- Storage object names are "<workspace_id>/<channel_id>/<file>".
create function private.client_file_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := storage.foldername(object_name);
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if coalesce(array_length(parts, 1), 0) < 2 or parts[1] !~ uuid_pattern or parts[2] !~ uuid_pattern then
    return false;
  end if;
  return exists (
    select 1 from public.channels ch
    where ch.id = parts[2]::uuid
      and ch.workspace_id = parts[1]::uuid
      and ch.kind = 'files'
      and private.client_sees(ch.workspace_id, ch.company_id, ch.contact_id)
  );
end;
$$;

revoke all on function private.is_workspace_client(uuid) from public, anon;
revoke all on function private.client_sees(uuid, uuid, uuid) from public, anon;
revoke all on function private.client_channel(uuid) from public, anon;
revoke all on function private.client_file_object(text) from public, anon;
grant execute on function private.is_workspace_client(uuid) to authenticated;
grant execute on function private.client_sees(uuid, uuid, uuid) to authenticated;
grant execute on function private.client_channel(uuid) to authenticated;
grant execute on function private.client_file_object(text) to authenticated;

-- Client read access ---------------------------------------------------------

create policy "clients read workspace" on public.workspaces
  for select to authenticated using (private.is_workspace_client(id));
create policy "clients read own contact" on public.contacts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "clients read own company" on public.companies
  for select to authenticated using (private.client_sees(workspace_id, id, null));
create policy "clients read channels" on public.channels
  for select to authenticated using (private.client_sees(workspace_id, company_id, contact_id));
create policy "clients read messages" on public.messages
  for select to authenticated using (private.client_channel(channel_id));
create policy "clients read files" on public.file_items
  for select to authenticated using (private.client_channel(channel_id));
create policy "clients read invoices" on public.invoices
  for select to authenticated
  using (status <> 'draft' and private.client_sees(workspace_id, company_id, contact_id));
create policy "clients read invoice items" on public.invoice_items
  for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id));
create policy "clients read subscriptions" on public.subscriptions
  for select to authenticated using (private.client_sees(workspace_id, company_id, contact_id));
create policy "clients read subscribed products" on public.products
  for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.product_id = products.id));
create policy "clients read contracts" on public.contracts
  for select to authenticated using (private.client_sees(workspace_id, null, contact_id));
create policy "clients read form requests" on public.form_requests
  for select to authenticated using (private.client_sees(workspace_id, null, contact_id));
create policy "clients read requested forms" on public.forms
  for select to authenticated
  using (exists (select 1 from public.form_requests r where r.form_id = forms.id));
create policy "clients read published articles" on public.help_articles
  for select to authenticated using (published and private.is_workspace_client(workspace_id));
create policy "clients read installed apps" on public.app_installs
  for select to authenticated using (private.is_workspace_client(workspace_id));

create policy "clients read their files" on storage.objects
  for select to authenticated
  using (bucket_id = 'workspace-files' and private.client_file_object(name));
create policy "clients upload their files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'workspace-files' and private.client_file_object(name));

-- Client writes ----------------------------------------------------------------

create function private.contact_display_name(target uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(trim(c.first_name || ' ' || c.last_name), ''), c.email)
  from public.contacts c where c.id = target;
$$;

create function private.caller_contact(ws uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select c.id from public.contacts c
  where c.workspace_id = ws and c.user_id = (select auth.uid());
$$;

revoke all on function private.contact_display_name(uuid) from public, anon, authenticated;
revoke all on function private.caller_contact(uuid) from public, anon, authenticated;

create function public.portal_send_message(target_channel uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch public.channels;
  author uuid;
  author_name text;
  new_id uuid;
begin
  select * into ch from public.channels where id = target_channel and kind = 'messages';
  if not found or not private.client_sees(ch.workspace_id, ch.company_id, ch.contact_id) then
    raise exception 'channel not found' using errcode = '42501';
  end if;
  author := private.caller_contact(ch.workspace_id);
  author_name := private.contact_display_name(author);

  insert into public.messages (workspace_id, channel_id, author_user_id, author_name, body)
  values (ch.workspace_id, ch.id, (select auth.uid()), author_name, message_body)
  returning id into new_id;

  update public.channels
  set last_activity_at = now(), last_activity_summary = left(message_body, 140)
  where id = ch.id;

  insert into public.notifications (workspace_id, title, body, href)
  values (ch.workspace_id, 'New message from ' || author_name, left(message_body, 140), '/messages/' || ch.id);
  return new_id;
end;
$$;

create function public.portal_add_file(
  target_channel uuid,
  parent uuid,
  item_kind text,
  item_name text,
  object_path text,
  item_size bigint,
  item_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch public.channels;
  author_name text;
  new_id uuid;
begin
  select * into ch from public.channels where id = target_channel and kind = 'files';
  if not found or not private.client_sees(ch.workspace_id, ch.company_id, ch.contact_id) then
    raise exception 'file space not found' using errcode = '42501';
  end if;
  if item_kind not in ('file', 'folder') then
    raise exception 'unsupported item kind' using errcode = '22023';
  end if;
  if item_kind = 'file' and (object_path is null or object_path not like ch.workspace_id || '/' || ch.id || '/%') then
    raise exception 'upload path is outside this space' using errcode = '42501';
  end if;
  if parent is not null and not exists (
    select 1 from public.file_items f where f.id = parent and f.channel_id = ch.id and f.kind = 'folder'
  ) then
    raise exception 'folder not found' using errcode = '42501';
  end if;
  author_name := private.contact_display_name(private.caller_contact(ch.workspace_id));

  insert into public.file_items (workspace_id, channel_id, parent_id, kind, name, storage_path, size_bytes, content_type, created_by_name)
  values (
    ch.workspace_id, ch.id, parent, item_kind, item_name,
    case when item_kind = 'file' then object_path end,
    case when item_kind = 'file' then item_size end,
    case when item_kind = 'file' then item_type end,
    author_name
  )
  returning id into new_id;

  update public.channels
  set last_activity_at = now(),
      last_activity_summary = case when item_kind = 'file' then 'Uploaded ' else 'Created folder ' end || item_name
  where id = ch.id;

  if item_kind = 'file' then
    insert into public.notifications (workspace_id, title, body, href)
    values (ch.workspace_id, author_name || ' uploaded a file', item_name, '/files/' || ch.id);
  end if;
  return new_id;
end;
$$;

create function public.portal_sign_contract(target_contract uuid, signer_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k public.contracts;
begin
  select * into k from public.contracts where id = target_contract for update;
  if not found or not private.client_sees(k.workspace_id, null, k.contact_id) then
    raise exception 'contract not found' using errcode = '42501';
  end if;
  if k.status <> 'awaiting_signature' then
    raise exception 'contract is not awaiting a signature' using errcode = '22023';
  end if;
  if char_length(trim(signer_name)) not between 2 and 120 then
    raise exception 'enter your full name to sign' using errcode = '22023';
  end if;

  update public.contracts
  set status = 'signed', signed_at = now(), signed_name = trim(signer_name)
  where id = k.id;

  insert into public.notifications (workspace_id, title, body, href)
  values (k.workspace_id, k.name || ' was signed', 'Signed by ' || trim(signer_name), '/contracts/' || k.id);
end;
$$;

create function public.portal_submit_form(target_request uuid, submitted jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.form_requests;
  form_name text;
begin
  select * into r from public.form_requests where id = target_request for update;
  if not found or not private.client_sees(r.workspace_id, null, r.contact_id) then
    raise exception 'form request not found' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'this form was already submitted' using errcode = '22023';
  end if;
  if jsonb_typeof(submitted) <> 'object' or pg_column_size(submitted) > 65536 then
    raise exception 'invalid answers' using errcode = '22023';
  end if;
  select f.name into form_name from public.forms f where f.id = r.form_id;

  update public.form_requests
  set status = 'completed', answers = submitted, completed_at = now()
  where id = r.id;

  insert into public.notifications (workspace_id, title, body, href)
  values (
    r.workspace_id,
    form_name || ' was completed',
    'Submitted by ' || private.contact_display_name(r.contact_id),
    '/forms/' || r.form_id
  );
end;
$$;

revoke all on function public.portal_send_message(uuid, text) from public, anon;
revoke all on function public.portal_add_file(uuid, uuid, text, text, text, bigint, text) from public, anon;
revoke all on function public.portal_sign_contract(uuid, text) from public, anon;
revoke all on function public.portal_submit_form(uuid, jsonb) from public, anon;
grant execute on function public.portal_send_message(uuid, text) to authenticated;
grant execute on function public.portal_add_file(uuid, uuid, text, text, text, bigint, text) to authenticated;
grant execute on function public.portal_sign_contract(uuid, text) to authenticated;
grant execute on function public.portal_submit_form(uuid, jsonb) to authenticated;

-- Invite links ------------------------------------------------------------------

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null check (kind in ('client', 'team')),
  email text not null check (position('@' in email) > 1),
  contact_id uuid references public.contacts (id) on delete cascade,
  role public.member_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  check ((kind = 'client') = (contact_id is not null))
);

create index invites_workspace_idx on public.invites (workspace_id, created_at desc);

alter table public.invites enable row level security;

create policy "members read invites" on public.invites
  for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members create invites" on public.invites
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      (kind = 'client' and private.is_workspace_member(workspace_id))
      or (kind = 'team' and private.is_workspace_admin(workspace_id))
    )
  );
create policy "members revoke invites" on public.invites
  for update to authenticated
  using (
    (kind = 'client' and private.is_workspace_member(workspace_id))
    or (kind = 'team' and private.is_workspace_admin(workspace_id))
  )
  with check (
    (kind = 'client' and private.is_workspace_member(workspace_id))
    or (kind = 'team' and private.is_workspace_admin(workspace_id))
  );

create function private.invite_token_hash(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(token, 'UTF8'), 'sha256'), 'hex');
$$;

revoke all on function private.invite_token_hash(text) from public, anon, authenticated;

-- Anyone holding a token may see which workspace invited which address.
create function public.invite_preview(token text)
returns table (workspace_name text, brand_color text, logo_path text, email text, kind text, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.name,
    w.brand_color,
    w.logo_path,
    i.email,
    i.kind,
    case
      when i.revoked_at is not null then 'revoked'
      when i.accepted_at is not null then 'accepted'
      when i.expires_at < now() then 'expired'
      else 'valid'
    end
  from public.invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.token_hash = private.invite_token_hash(token);
$$;

create function public.accept_invite(token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_email text;
  inv public.invites;
  who text;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into inv from public.invites where token_hash = private.invite_token_hash(token) for update;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'this invite link is no longer valid' using errcode = '22023';
  end if;
  select u.email into caller_email from auth.users u where u.id = caller;
  if lower(coalesce(caller_email, '')) <> lower(inv.email) then
    raise exception 'sign in as % to accept this invite', inv.email using errcode = '42501';
  end if;

  if inv.kind = 'client' then
    update public.contacts
    set user_id = caller, status = 'active'
    where id = inv.contact_id and workspace_id = inv.workspace_id and lower(email) = lower(inv.email);
    if not found then
      raise exception 'the invited contact no longer exists' using errcode = '22023';
    end if;
    who := private.contact_display_name(inv.contact_id);
  else
    insert into public.workspace_members (workspace_id, user_id, role, display_name, email)
    values (inv.workspace_id, caller, inv.role, split_part(inv.email, '@', 1), inv.email)
    on conflict (workspace_id, user_id) do nothing;
    who := inv.email;
  end if;

  update public.invites set accepted_at = now(), accepted_by = caller where id = inv.id;
  insert into public.notifications (workspace_id, title, body, href)
  values (
    inv.workspace_id,
    who || ' accepted your invite',
    case when inv.kind = 'client' then 'They can now sign in to the portal.' else 'They joined your team.' end,
    case when inv.kind = 'client' then '/crm/contacts/' || inv.contact_id else '/team' end
  );
  return inv.kind;
end;
$$;

revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- Branding and custom domains -----------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload brand assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and private.is_workspace_admin(((storage.foldername(name))[1])::uuid));
create policy "admins delete brand assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and private.is_workspace_admin(((storage.foldername(name))[1])::uuid));

-- Automations ----------------------------------------------------------------------

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  trigger text not null
    check (trigger in ('contact_created', 'invoice_paid', 'contract_signed', 'form_completed', 'client_message')),
  action text not null check (action in ('send_message', 'notify_team')),
  message text not null default '' check (char_length(message) <= 2000),
  enabled boolean not null default true,
  run_count integer not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index automations_workspace_idx on public.automations (workspace_id, trigger) where enabled;

-- Runs every enabled rule for an event. Messages are posted to the client's
-- conversation: the company's when the contact belongs to one.
create function private.run_automations(
  ws uuid,
  event text,
  owner_company uuid,
  owner_contact uuid,
  detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule public.automations;
  company uuid := owner_company;
  client_name text;
  workspace_name text;
  target_channel uuid;
  rendered text;
begin
  if company is null and owner_contact is not null then
    select c.company_id into company from public.contacts c where c.id = owner_contact;
  end if;
  client_name := coalesce(
    (select co.name from public.companies co where co.id = company and owner_contact is null),
    private.contact_display_name(owner_contact),
    (select co.name from public.companies co where co.id = company),
    'there'
  );
  select w.name into workspace_name from public.workspaces w where w.id = ws;
  select ch.id into target_channel from public.channels ch
  where ch.workspace_id = ws and ch.kind = 'messages'
    and ((company is not null and ch.company_id = company)
      or (company is null and ch.contact_id = owner_contact));

  for rule in
    select * from public.automations a
    where a.workspace_id = ws and a.trigger = event and a.enabled
    order by a.created_at
  loop
    rendered := replace(replace(rule.message, '{{client_name}}', client_name), '{{detail}}', coalesce(detail, ''));
    if rule.action = 'send_message' then
      continue when target_channel is null or rendered = '';
      insert into public.messages (workspace_id, channel_id, author_user_id, author_name, body)
      values (ws, target_channel, null, workspace_name, rendered);
      update public.channels set last_activity_at = now(), last_activity_summary = left(rendered, 140)
      where id = target_channel;
    else
      insert into public.notifications (workspace_id, title, body, href)
      values (ws, rule.name, left(coalesce(nullif(rendered, ''), client_name || ': ' || coalesce(detail, '')), 280), '/automations');
    end if;
    update public.automations set run_count = run_count + 1, last_run_at = now() where id = rule.id;
  end loop;
end;
$$;

create function private.on_contact_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.run_automations(new.workspace_id, 'contact_created', null, new.id, new.email);
  return null;
end;
$$;

create function private.on_invoice_paid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    perform private.run_automations(
      new.workspace_id, 'invoice_paid', new.company_id, new.contact_id, 'INV-' || lpad(new.number::text, 4, '0')
    );
  end if;
  return null;
end;
$$;

create function private.on_contract_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'signed' and old.status is distinct from 'signed' then
    perform private.run_automations(new.workspace_id, 'contract_signed', null, new.contact_id, new.name);
  end if;
  return null;
end;
$$;

create function private.on_form_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform private.run_automations(
      new.workspace_id, 'form_completed', null, new.contact_id,
      (select f.name from public.forms f where f.id = new.form_id)
    );
  end if;
  return null;
end;
$$;

create function private.on_client_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch public.channels;
begin
  if new.author_user_id is null or not exists (
    select 1 from public.contacts c
    where c.workspace_id = new.workspace_id and c.user_id = new.author_user_id
  ) then
    return null;
  end if;
  select * into ch from public.channels where id = new.channel_id;
  perform private.run_automations(new.workspace_id, 'client_message', ch.company_id, ch.contact_id, left(new.body, 140));
  return null;
end;
$$;

revoke all on function private.run_automations(uuid, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.on_contact_created() from public, anon, authenticated;
revoke all on function private.on_invoice_paid() from public, anon, authenticated;
revoke all on function private.on_contract_signed() from public, anon, authenticated;
revoke all on function private.on_form_completed() from public, anon, authenticated;
revoke all on function private.on_client_message() from public, anon, authenticated;

create trigger contacts_run_automations after insert on public.contacts
  for each row execute function private.on_contact_created();
create trigger invoices_run_automations after update of status on public.invoices
  for each row execute function private.on_invoice_paid();
create trigger contracts_run_automations after update of status on public.contracts
  for each row execute function private.on_contract_signed();
create trigger form_requests_run_automations after update of status on public.form_requests
  for each row execute function private.on_form_completed();
create trigger messages_run_automations after insert on public.messages
  for each row execute function private.on_client_message();

-- Time tracker app -------------------------------------------------------------------

alter table public.app_installs drop constraint app_installs_app_key_check;
alter table public.app_installs add constraint app_installs_app_key_check
  check (app_key in ('files', 'payments', 'contracts', 'forms', 'helpdesk', 'timetracker'));

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  member_name text not null default '',
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  description text not null check (char_length(description) between 1 and 500),
  entry_date date not null default current_date,
  minutes integer not null check (minutes between 1 and 1440),
  billable boolean not null default true,
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now(),
  check (company_id is null or contact_id is null)
);

create index time_entries_workspace_idx on public.time_entries (workspace_id, entry_date desc);

-- Custom apps -------------------------------------------------------------------------

create table public.custom_apps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 280),
  code text not null default '' check (octet_length(code) <= 200000),
  permissions text[] not null default '{}'
    check (permissions <@ array['clients:read', 'storage']::text[]),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_apps_workspace_idx on public.custom_apps (workspace_id, name);

create table public.custom_app_data (
  app_id uuid not null references public.custom_apps (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 100),
  value jsonb not null check (pg_column_size(value) <= 65536),
  updated_at timestamptz not null default now(),
  primary key (app_id, key)
);

do $$
declare
  t text;
begin
  foreach t in array array['automations', 'time_entries', 'custom_apps', 'custom_app_data']
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
