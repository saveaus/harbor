-- Membership checks are used by row-level security only and must not be
-- callable through the REST API.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_workspace_member(uuid) set schema private;
alter function public.is_workspace_admin(uuid) set schema private;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.is_workspace_admin(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
