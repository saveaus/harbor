-- Folders have no parent, object, size or type, so those arguments take defaults
-- (and therefore come after the required ones).
drop function public.portal_add_file(uuid, uuid, text, text, text, bigint, text);

create function public.portal_add_file(
  target_channel uuid,
  item_kind text,
  item_name text,
  parent uuid default null,
  object_path text default null,
  item_size bigint default null,
  item_type text default null
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

revoke all on function public.portal_add_file(uuid, text, text, uuid, text, bigint, text) from public, anon;
grant execute on function public.portal_add_file(uuid, text, text, uuid, text, bigint, text) to authenticated;
