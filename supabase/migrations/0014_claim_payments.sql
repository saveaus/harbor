-- Claim payment flows to its billables, the same way invoice payment does.

create or replace function private.normalize_billable() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (old.invoice_id is not null or old.claim_id is not null) and (
    new.quantity <> old.quantity or new.unit_price_cents <> old.unit_price_cents
    or new.contact_id <> old.contact_id or new.service_date <> old.service_date
    or new.support_number <> old.support_number
  ) then
    raise exception 'This billable is on an invoice or claim. Release it before changing it.' using errcode = 'P0001';
  end if;

  if new.status = 'void' then
    if new.invoice_id is not null or new.claim_id is not null then
      raise exception 'This billable is on an invoice or claim. Release it before voiding it.' using errcode = 'P0001';
    end if;
  elsif new.status = 'pending' then
    if new.invoice_id is not null or new.claim_id is not null then
      raise exception 'A pending billable can''t be invoiced or claimed until its shift is completed.' using errcode = 'P0001';
    end if;
  elsif new.invoice_id is not null then
    if new.status not in ('invoiced', 'paid') then new.status := 'invoiced'; end if;
  elsif new.claim_id is not null then
    if new.status not in ('claimed', 'exported', 'paid') then new.status := 'claimed'; end if;
  else
    new.status := 'unbilled';
  end if;
  return new;
end;
$$;

-- Only exported lines can be paid by the NDIA.
create function private.sync_claim_billables() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status = 'paid' then
    if new.exported_at is null then
      raise exception 'Export the claim to PRODA before marking it paid.' using errcode = 'P0001';
    end if;
    update public.billables set status = 'paid' where claim_id = new.id and status = 'exported';
  else
    update public.billables set status = 'exported' where claim_id = new.id and status = 'paid';
  end if;
  return null;
end;
$$;

revoke all on function private.sync_claim_billables() from public, anon, authenticated;

create trigger claims_sync_billables after update of payment_status on public.claims
  for each row when (new.payment_status is distinct from old.payment_status) execute function private.sync_claim_billables();

-- A paid claim is settled: its lines can't be re-exported, excluded or re-synced.
create or replace function public.set_claim_entries(target uuid, billable_ids uuid[], include boolean) returns void
language plpgsql
set search_path = ''
as $$
declare
  c public.claims;
begin
  select * into c from public.claims where id = target;
  if not found or not private.is_workspace_admin(c.workspace_id) then
    raise exception 'Only workspace owners and admins can manage claims.' using errcode = '42501';
  end if;
  if c.payment_status = 'paid' then
    raise exception 'This claim is paid. Mark it unpaid before changing it.' using errcode = 'P0001';
  end if;
  if include then
    delete from public.claim_exclusions where claim_id = c.id and billable_id = any (billable_ids);
    perform public.sync_claim(c.id);
  else
    insert into public.claim_exclusions (claim_id, billable_id, workspace_id)
    select c.id, b.id, c.workspace_id from public.billables b
    where b.id = any (billable_ids) and b.workspace_id = c.workspace_id
    on conflict do nothing;
    update public.billables set claim_id = null where claim_id = c.id and id = any (billable_ids);
  end if;
end;
$$;

create or replace function public.sync_claim(target uuid) returns integer
language plpgsql
set search_path = ''
as $$
declare
  c public.claims;
  added integer;
begin
  select * into c from public.claims where id = target;
  if not found or not private.is_workspace_admin(c.workspace_id) then
    raise exception 'Only workspace owners and admins can manage claims.' using errcode = '42501';
  end if;
  if c.payment_status = 'paid' then
    raise exception 'This claim is paid. Mark it unpaid before changing it.' using errcode = 'P0001';
  end if;
  update public.billables b set claim_id = c.id
  from public.client_payers p
  where p.contact_id = b.contact_id and p.payer = 'ndia'
    and b.workspace_id = c.workspace_id and b.status = 'unbilled'
    and b.service_date between c.period_start and c.period_end
    and not exists (select 1 from public.claim_exclusions x where x.claim_id = c.id and x.billable_id = b.id);
  get diagnostics added = row_count;
  update public.claims set updated_at = now() where id = c.id;
  return added;
end;
$$;

create or replace function public.mark_claim_exported(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  c public.claims;
begin
  select * into c from public.claims where id = target;
  if not found or not private.is_workspace_admin(c.workspace_id) then
    raise exception 'Only workspace owners and admins can export claims.' using errcode = '42501';
  end if;
  if c.payment_status = 'paid' then
    raise exception 'This claim is paid. Mark it unpaid before exporting it again.' using errcode = 'P0001';
  end if;
  update public.billables set status = 'exported' where claim_id = c.id;
  update public.claims set exported_at = now(), export_count = export_count + 1, updated_at = now() where id = c.id;
end;
$$;

-- Deleting a claim releases its lines to unbilled; exported or paid claims are
-- history. Deleting the whole workspace still cascades.
create function private.guard_claim_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.exported_at is not null and exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    raise exception 'This claim has been exported to PRODA. Exclude its entries instead of deleting it.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger claims_guard_delete before delete on public.claims
  for each row execute function private.guard_claim_delete();
