-- Workspace settings, member email preferences, audit log and API keys.

alter table public.workspaces
  add column assistant_enabled boolean not null default true,
  add column assistant_instructions text not null default ''
    check (char_length(assistant_instructions) <= 2000),
  add column contact_link_sign_in boolean not null default true,
  add column contact_email_messages boolean not null default true,
  add column contact_email_invoices boolean not null default true,
  add column contact_email_contracts boolean not null default true,
  add column contact_email_forms boolean not null default true;

alter table public.workspace_members
  add column email_messages boolean not null default true,
  add column email_payments boolean not null default true,
  add column email_documents boolean not null default true;

-- Members may edit their own profile and preferences, never their role.
revoke update on public.workspace_members from authenticated;
grant update (display_name, email_messages, email_payments, email_documents)
  on public.workspace_members to authenticated;

create policy "owners delete workspace" on public.workspaces
  for delete to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'
  ));

-- Audit log ---------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid,
  actor_name text not null default '',
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null,
  entity_id uuid,
  label text not null default '',
  created_at timestamptz not null default now()
);

create index audit_events_workspace_idx on public.audit_events (workspace_id, created_at desc);

alter table public.audit_events enable row level security;

create policy "admins read audit log" on public.audit_events
  for select to authenticated using (private.is_workspace_admin(workspace_id));

create function private.record_audit_event() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  data jsonb := to_jsonb(coalesce(new, old));
  target_workspace uuid := case when tg_table_name = 'workspaces' then (data ->> 'id')::uuid
                                else (data ->> 'workspace_id')::uuid end;
  actor uuid := auth.uid();
begin
  -- Rows removed by a workspace deletion cascade have nowhere to be recorded.
  if not exists (select 1 from public.workspaces w where w.id = target_workspace) then
    return null;
  end if;
  insert into public.audit_events (workspace_id, actor_id, actor_name, action, entity, entity_id, label)
  values (
    target_workspace,
    actor,
    coalesce((select m.display_name from public.workspace_members m
              where m.workspace_id = target_workspace and m.user_id = actor), ''),
    lower(tg_op),
    tg_table_name,
    case when data ? 'id' then (data ->> 'id')::uuid end,
    left(coalesce(
      nullif(data ->> 'name', ''),
      nullif(data ->> 'number', ''),
      nullif(trim(concat_ws(' ', data ->> 'first_name', data ->> 'last_name')), ''),
      nullif(data ->> 'display_name', ''),
      nullif(data ->> 'email', ''),
      nullif(data ->> 'app_key', ''),
      ''
    ), 200)
  );
  return null;
end;
$$;

revoke all on function private.record_audit_event() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'contacts', 'products', 'invoices', 'subscriptions', 'payment_links',
    'contract_templates', 'contracts', 'forms', 'help_articles', 'app_installs',
    'custom_apps', 'automations', 'workspace_members', 'invites'
  ]
  loop
    execute format(
      'create trigger record_audit_event after insert or update or delete on public.%I '
      'for each row execute function private.record_audit_event()',
      t
    );
  end loop;
end;
$$;

create trigger record_audit_event after update on public.workspaces
  for each row execute function private.record_audit_event();

-- API keys ----------------------------------------------------------------

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  prefix text not null,
  key_hash text not null unique,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_keys_workspace_idx on public.api_keys (workspace_id, created_at desc);

alter table public.api_keys enable row level security;

create policy "admins read api keys" on public.api_keys
  for select to authenticated using (private.is_workspace_admin(workspace_id));
create policy "admins create api keys" on public.api_keys
  for insert to authenticated with check (private.is_workspace_admin(workspace_id));
create policy "admins revoke api keys" on public.api_keys
  for update to authenticated
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

revoke update on public.api_keys from authenticated;
grant update (revoked_at) on public.api_keys to authenticated;

create trigger record_audit_event after insert or update or delete on public.api_keys
  for each row execute function private.record_audit_event();
