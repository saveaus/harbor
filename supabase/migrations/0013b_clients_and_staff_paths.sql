-- The dashboard speaks of clients and staff: /clients/<contact id> and /staff/<staff id>.

create or replace function public.accept_invite(token text)
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
  target text;
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
      raise exception 'the invited client no longer exists' using errcode = '22023';
    end if;
    who := private.contact_display_name(inv.contact_id);
    target := '/clients/' || inv.contact_id;
  else
    insert into public.workspace_members (workspace_id, user_id, role, display_name, email)
    values (inv.workspace_id, caller, inv.role, split_part(inv.email, '@', 1), inv.email)
    on conflict (workspace_id, user_id) do nothing;
    who := inv.email;
    target := coalesce(
      '/staff/' || (select s.id from public.staff s where s.workspace_id = inv.workspace_id and s.user_id = caller),
      '/staff'
    );
  end if;

  update public.invites set accepted_at = now(), accepted_by = caller where id = inv.id;
  insert into public.notifications (workspace_id, title, body, href)
  values (
    inv.workspace_id,
    who || ' accepted your invite',
    case when inv.kind = 'client' then 'They can now sign in to the portal.' else 'They can now sign in to the workspace.' end,
    target
  );
  return inv.kind;
end;
$$;

update public.notifications
set href = regexp_replace(href, '^/crm/contacts/', '/clients/')
where href like '/crm/contacts/%';

update public.notifications
set href = regexp_replace(href, '^/crm', '/clients')
where href like '/crm%';

update public.notifications
set href = regexp_replace(href, '^/team', '/staff')
where href ~ '^/team(/|$|\?)';
