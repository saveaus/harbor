-- Tell the invite page whether the workspace lets clients sign in with an emailed link.

drop function public.invite_preview(text);

create function public.invite_preview(token text)
returns table (workspace_name text, brand_color text, logo_path text, email text, kind text, state text, link_sign_in boolean)
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
    end,
    i.kind = 'client' and w.contact_link_sign_in
  from public.invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.token_hash = private.invite_token_hash(token);
$$;

revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
