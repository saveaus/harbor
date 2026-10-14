-- Shift notes, NDIS price-guide import, plan-manager invoicing, publish gates,
-- and NDIA short-notice cancellations. Extends the existing shift → timesheet
-- → billable path; does not add a second roster or claim system.

alter table public.shifts
  add column support_note text not null default '' check (char_length(support_note) <= 20000);

alter table public.shift_clients
  add column item_rate_cents integer check (item_rate_cents is null or item_rate_cents >= 0);

alter table public.finance_settings
  add column short_notice_hours integer not null default 168 check (short_notice_hours between 1 and 720),
  add column price_guide_imported_at timestamptz;

alter table public.client_finance
  add column plan_manager_id uuid,
  add constraint client_finance_plan_manager_check check (plan_manager_id is distinct from contact_id),
  add constraint client_finance_plan_manager_fkey
    foreign key (workspace_id, plan_manager_id) references public.contacts (workspace_id, id) on delete set null;

-- The rate frozen when the shift was published; catalogue re-imports leave it alone.
create function private.freeze_shift_rates(target uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.shift_clients sc
  set item_rate_cents = i.rate_cents
  from public.price_book_items i
  where sc.shift_id = target and i.id = sc.item_id;
end;
$$;

create function private.credential_label(kind public.credential_kind) returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'identification' then 'Identification'
    when 'ndis_worker_screening' then 'NDIS Worker Screening'
    when 'working_with_children' then 'Working With Children Check'
    when 'police_check' then 'Police check'
    when 'first_aid' then 'First aid'
    when 'cpr' then 'CPR'
    when 'drivers_licence' then 'Driver''s licence'
    when 'car_insurance' then 'Comprehensive vehicle insurance'
    when 'vehicle_registration' then 'Vehicle registration'
    when 'qualification' then 'Qualification'
    when 'employment_contract' then 'Employment contract'
    when 'other' then 'Other'
  end;
$$;

create function private.person_label(first_name text, last_name text) returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(trim(both from concat_ws(' ', nullif(trim(first_name), ''), nullif(trim(last_name), ''))), ''), 'Unnamed');
$$;

-- Required kinds are the worker's checklist plus each participant's required kinds.
create function private.staff_shift_credential_reasons(target uuid, worker uuid) returns setof text
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.shifts;
  service_day date;
  required_kind public.credential_kind;
  worker_name text;
  held record;
begin
  select * into s from public.shifts where id = target;
  if not found then return; end if;
  service_day := private.local_day(s.workspace_id, s.starts_at);
  select private.person_label(st.first_name, st.last_name) into worker_name
  from public.staff st where st.id = worker;

  for required_kind in
    select distinct required
    from (
      select unnest(st.required_credentials) as required
      from public.staff st where st.id = worker
      union
      select unnest(p.required_credentials)
      from public.shift_clients sc
      join public.client_profiles p on p.contact_id = sc.contact_id
      where sc.shift_id = s.id
    ) required
    where required is not null
  loop
    select c.expires_on, c.review
    into held
    from public.staff_credentials c
    where c.staff_id = worker and c.kind = required_kind
    order by
      case c.review when 'approved' then 0 when 'pending' then 1 else 2 end,
      c.expires_on desc nulls first
    limit 1;

    if not found or held.review = 'declined' then
      return next worker_name || '''s ' || private.credential_label(required_kind) || ' is not on file.';
    elsif held.review = 'pending' then
      return next worker_name || '''s ' || private.credential_label(required_kind) || ' is still waiting for review.';
    elsif held.expires_on is not null and held.expires_on < service_day then
      return next worker_name || '''s ' || private.credential_label(required_kind) || ' is expired.';
    end if;
  end loop;
end;
$$;

-- Owner of publish refusals so the roster and shift page show the same reasons.
create function private.shift_publish_reasons(target uuid) returns setof text
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.shifts;
  service_day date;
  client record;
  charge integer;
  remaining integer;
begin
  select * into s from public.shifts where id = target;
  if not found then return; end if;
  service_day := private.local_day(s.workspace_id, s.starts_at);

  return query
    select r from public.shift_staff ss, private.staff_shift_credential_reasons(s.id, ss.staff_id) r
    where ss.shift_id = s.id;

  for client in
    select sc.contact_id,
      private.person_label(c.first_name, c.last_name) as name,
      p.plan_start, p.plan_end
    from public.shift_clients sc
    join public.contacts c on c.id = sc.contact_id
    left join public.client_profiles p on p.contact_id = sc.contact_id
    where sc.shift_id = s.id
  loop
    if client.plan_end is not null and client.plan_end < service_day then
      return next client.name || '''s plan ended on ' || to_char(client.plan_end, 'DD Mon YYYY') || '.';
      continue;
    end if;

    select coalesce(sum(round(
      coalesce(sc.item_rate_cents, i.rate_cents) * sc.share_percent / 100.0
      * case when i.unit = 'hour' then s.rostered_minutes / 60.0 else 1 end
    )::integer), 0)
    into charge
    from public.shift_clients sc
    join public.price_book_items i on i.id = sc.item_id
    where sc.shift_id = s.id and sc.contact_id = client.contact_id;
    continue when charge <= 0;

    select max(line.amount_cents - coalesce(spend.used, 0))
    into remaining
    from public.budget_lines line
    left join public.client_profiles p on p.contact_id = line.contact_id
    left join lateral (
      select sum(b.amount_cents) as used
      from public.billables b
      where b.contact_id = line.contact_id and b.status <> 'void'
        and b.shift_id is distinct from s.id
        and (line.category = '' or left(b.support_number, 2) = line.category)
        and b.service_date >= coalesce(line.starts_on, p.plan_start, b.service_date)
        and b.service_date <= coalesce(line.ends_on, p.plan_end, b.service_date)
    ) spend on true
    where line.contact_id = client.contact_id
      and service_day >= coalesce(line.starts_on, p.plan_start, service_day)
      and service_day <= coalesce(line.ends_on, p.plan_end, service_day)
      and (line.category = '' or exists (
        select 1 from public.shift_clients sc
        join public.price_book_items i on i.id = sc.item_id
        where sc.shift_id = s.id and sc.contact_id = client.contact_id
          and left(i.support_number, 2) = line.category
      ));

    if remaining is not null and remaining < charge then
      return next client.name || '''s budget can''t cover this shift.';
    end if;
  end loop;
end;
$$;

create function public.list_shift_publish_reasons(ws uuid, ids uuid[])
returns table (shift_id uuid, reason text)
language sql
stable
set search_path = ''
as $$
  select s.id, r
  from public.shifts s, private.shift_publish_reasons(s.id) r
  where s.workspace_id = ws and s.id = any(ids);
$$;

create or replace function public.set_shift_published(target uuid, publish boolean) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  blocked text;
begin
  s := private.editable_shift(target);
  if publish then
    select string_agg(r, E'\n') into blocked from private.shift_publish_reasons(s.id) r;
    if blocked is not null then
      raise exception '%', blocked using errcode = 'P0001';
    end if;
    perform private.freeze_shift_rates(s.id);
  end if;
  update public.shifts set status = case when publish then 'published' else 'unpublished' end::public.shift_status
  where id = s.id;
  if not publish then
    update public.shift_clients set item_rate_cents = null where shift_id = s.id;
  end if;
  perform private.refresh_shift(s.id);
end;
$$;

create or replace function public.publish_shifts(ws uuid, range_start timestamptz, range_end timestamptz) returns integer
language plpgsql
set search_path = ''
as $$
declare
  target uuid;
  published integer := 0;
begin
  for target in
    select id from public.shifts
    where workspace_id = ws and status = 'unpublished' and starts_at >= range_start and starts_at < range_end
  loop
    continue when exists (select 1 from private.shift_publish_reasons(target));
    perform private.freeze_shift_rates(target);
    update public.shifts set status = 'published' where id = target;
    perform private.refresh_shift(target);
    published := published + 1;
  end loop;
  return published;
end;
$$;

create or replace function public.assign_shift_staff(target uuid, worker uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  blocked text;
begin
  s := private.editable_shift(target);
  if s.status = 'published' then
    select string_agg(r, E'\n') into blocked from private.staff_shift_credential_reasons(s.id, worker) r;
    if blocked is not null then
      raise exception '%', blocked using errcode = 'P0001';
    end if;
  end if;
  insert into public.shift_staff (shift_id, staff_id, workspace_id) values (s.id, worker, s.workspace_id)
  on conflict do nothing;
  perform private.refresh_shift(s.id);
end;
$$;

create or replace function public.take_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  me uuid;
  blocked text;
begin
  s := private.editable_shift(target);
  if s.status <> 'published' or exists (select 1 from public.shift_staff where shift_id = s.id) then
    raise exception 'This shift is no longer open.' using errcode = 'P0001';
  end if;
  select st.id into me from public.staff st where st.workspace_id = s.workspace_id and st.user_id = (select auth.uid());
  if me is null then
    raise exception 'Your account isn''t linked to a staff record.' using errcode = 'P0001';
  end if;
  select string_agg(r, E'\n') into blocked from private.staff_shift_credential_reasons(s.id, me) r;
  if blocked is not null then
    raise exception '%', blocked using errcode = 'P0001';
  end if;
  insert into public.shift_staff (shift_id, staff_id, workspace_id) values (s.id, me, s.workspace_id);
  perform private.refresh_shift(s.id);
end;
$$;

create or replace function private.refresh_shift_records(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  keeps_timesheets boolean;
  service_day date;
begin
  select * into s from public.shifts where id = target;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  service_day := private.local_day(s.workspace_id, s.starts_at);
  keeps_timesheets := s.status in ('published', 'completed') or (s.status = 'cancelled' and s.staff_paid);

  if exists (
    select 1 from public.timesheet_entries e
    where e.shift_id = s.id and e.status = 'locked'
      and (not keeps_timesheets or e.staff_id not in (select ss.staff_id from public.shift_staff ss where ss.shift_id = s.id))
  ) then
    raise exception 'A worker''s timesheet for this shift is locked for payroll. Unlock it first.' using errcode = 'P0001';
  end if;

  delete from public.billables where shift_id = s.id and status = 'pending';

  if keeps_timesheets then
    delete from public.timesheet_entries e
    where e.shift_id = s.id and e.staff_id not in (select ss.staff_id from public.shift_staff ss where ss.shift_id = s.id);

    insert into public.timesheet_entries (workspace_id, staff_id, shift_id, contact_id, starts_at, ends_at, break_minutes, work_date)
    select s.workspace_id, ss.staff_id, s.id,
      case when (select count(*) from public.shift_clients sc where sc.shift_id = s.id) = 1
        then (select sc.contact_id from public.shift_clients sc where sc.shift_id = s.id) end,
      s.starts_at, s.ends_at, s.break_minutes, service_day
    from public.shift_staff ss where ss.shift_id = s.id
    on conflict (shift_id, staff_id) do update
      set starts_at = excluded.starts_at, ends_at = excluded.ends_at, break_minutes = excluded.break_minutes,
          contact_id = excluded.contact_id
      where public.timesheet_entries.synced and public.timesheet_entries.status = 'draft';
  else
    delete from public.timesheet_entries where shift_id = s.id;
  end if;

  if s.status = 'published' then
    insert into public.billables (
      workspace_id, contact_id, shift_id, timesheet_entry_id, kind, item_id, support_number, description,
      service_date, unit, quantity, unit_price_cents, gst_code, status
    )
    select s.workspace_id, sc.contact_id, s.id, e.id, 'service', i.id, i.support_number, i.name,
      service_day, i.unit,
      case when i.unit = 'hour' then round(s.rostered_minutes / 60.0, 2) else 1 end,
      round(coalesce(sc.item_rate_cents, i.rate_cents) * sc.share_percent / 100)::integer, i.gst_code, 'pending'
    from public.shift_clients sc
    join public.price_book_items i on i.id = sc.item_id
    left join public.timesheet_entries e on e.shift_id = s.id
    where sc.shift_id = s.id;
  elsif s.status = 'cancelled' and s.client_charged and not exists (
    select 1 from public.billables b where b.shift_id = s.id and b.kind = 'cancellation' and b.status <> 'void'
  ) then
    insert into public.billables (
      workspace_id, contact_id, shift_id, timesheet_entry_id, kind, item_id, support_number, description,
      service_date, unit, quantity, unit_price_cents, gst_code, claim_type, cancellation_reason
    )
    select s.workspace_id, sc.contact_id, s.id, e.id, 'cancellation', i.id, i.support_number,
      left('Short notice cancellation · ' || i.name, 300), service_day, i.unit,
      case when i.unit = 'hour' then round(s.rostered_minutes / 60.0, 2) else 1 end,
      round(coalesce(sc.item_rate_cents, i.rate_cents) * sc.share_percent / 100)::integer, i.gst_code, 'CANC', s.cancellation_reason
    from public.shift_clients sc
    join public.price_book_items i on i.id = sc.item_id
    left join public.timesheet_entries e on e.shift_id = s.id
    where sc.shift_id = s.id;
  end if;
end;
$$;

create or replace function private.bill_timesheet_entry(entry uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  e public.timesheet_entries;
  travel public.price_book_items;
begin
  select * into e from public.timesheet_entries where id = entry;

  insert into public.billables (
    workspace_id, contact_id, shift_id, timesheet_entry_id, kind, item_id, support_number, description,
    service_date, unit, quantity, unit_price_cents, gst_code
  )
  select e.workspace_id, sc.contact_id, e.shift_id, e.id, 'service', i.id, i.support_number, i.name,
    e.work_date, i.unit,
    case when i.unit = 'hour' then round(e.worked_minutes / 60.0, 2) else 1 end,
    round(coalesce(sc.item_rate_cents, i.rate_cents) * sc.share_percent / 100)::integer, i.gst_code
  from public.shift_clients sc
  join public.price_book_items i on i.id = sc.item_id
  where sc.shift_id = e.shift_id;

  select i.* into travel
  from public.finance_settings f join public.price_book_items i on i.id = f.travel_item_id
  where f.workspace_id = e.workspace_id;

  if found and e.km > 0 then
    insert into public.billables (
      workspace_id, contact_id, shift_id, timesheet_entry_id, kind, item_id, support_number, description,
      service_date, unit, quantity, unit_price_cents, gst_code, claim_type
    )
    select e.workspace_id, sc.contact_id, e.shift_id, e.id, 'travel', travel.id, travel.support_number, travel.name,
      e.work_date, travel.unit, round(e.km * sc.share_percent / 100, 2), travel.rate_cents, travel.gst_code, 'TRAN'
    from public.shift_clients sc
    where sc.shift_id = e.shift_id and round(e.km * sc.share_percent / 100, 2) > 0;
  end if;
end;
$$;

create function private.write_shift_support_note(target uuid, note text, author text) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  body text;
  title text;
begin
  select * into s from public.shifts where id = target for update;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  if s.status not in ('published', 'unpublished') then
    raise exception 'This shift is no longer open for a support note.' using errcode = 'P0001';
  end if;
  body := left(trim(coalesce(note, '')), 20000);
  if body = '' then
    raise exception 'Write a note about the support before checking out.' using errcode = '22023';
  end if;
  update public.shifts set support_note = body where id = s.id;
  title := left('Shift note · ' || to_char(private.local_day(s.workspace_id, s.starts_at), 'DD Mon YYYY'), 160);
  delete from public.record_notes where shift_id = s.id;
  insert into public.record_notes (workspace_id, contact_id, shift_id, title, body, author_name)
  select s.workspace_id, sc.contact_id, s.id, title, body, left(trim(coalesce(author, '')), 120)
  from public.shift_clients sc
  where sc.shift_id = s.id;
end;
$$;

create function public.save_shift_support_note(target uuid, note text) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  author text;
begin
  select * into s from public.shifts where id = target;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  select coalesce(nullif(m.display_name, ''), m.email) into author
  from public.workspace_members m
  where m.workspace_id = s.workspace_id and m.user_id = (select auth.uid());
  perform private.write_shift_support_note(target, note, coalesce(author, ''));
end;
$$;

drop function if exists public.check_out_shift(uuid, double precision, double precision);

create function public.check_out_shift(entry uuid, lat double precision, lng double precision, note text) returns integer
language plpgsql
set search_path = ''
as $$
declare
  e public.timesheet_entries;
  s public.shifts;
  pin record;
  distance integer;
  finished timestamptz;
  author text;
begin
  e := private.own_entry(entry);
  select * into s from public.shifts where id = e.shift_id;
  if e.checked_in_at is null then
    raise exception 'Check in before checking out.' using errcode = 'P0001';
  end if;
  if e.checked_out_at is not null then
    raise exception 'You''ve already checked out of this shift.' using errcode = 'P0001';
  end if;
  if s.status <> 'published' then
    raise exception 'This shift is no longer open for check out.' using errcode = 'P0001';
  end if;
  select private.person_label(st.first_name, st.last_name) into author from public.staff st where st.id = e.staff_id;
  perform private.write_shift_support_note(s.id, note, coalesce(author, ''));
  finished := least(greatest(date_trunc('minute', now()), e.starts_at + interval '1 minute'), e.starts_at + interval '24 hours');
  select * into pin from private.shift_location(s);
  if pin.lat is not null and lat is not null then
    distance := private.distance_m(pin.lat, pin.lng, lat, lng);
  end if;
  update public.timesheet_entries
  set checked_out_at = now(), check_out_latitude = lat, check_out_longitude = lng, check_out_distance_m = distance,
      ends_at = finished,
      break_minutes = least(break_minutes, greatest((extract(epoch from (finished - starts_at)) / 60)::integer - 1, 0)),
      synced = false
  where id = e.id;
  return distance;
end;
$$;

create or replace function public.complete_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  entry uuid;
begin
  s := private.editable_shift(target);
  if s.status <> 'published' then
    raise exception 'Publish the shift before completing it.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.shift_staff where shift_id = s.id) then
    raise exception 'Assign a worker before completing the shift.' using errcode = 'P0001';
  end if;
  if trim(s.support_note) = '' then
    raise exception 'A support note written at check-out is required before completing this shift.' using errcode = 'P0001';
  end if;
  update public.shifts set status = 'completed', completed_at = now() where id = s.id;
  delete from public.billables where shift_id = s.id and status = 'pending';
  for entry in select id from public.timesheet_entries where shift_id = s.id loop
    perform private.bill_timesheet_entry(entry);
  end loop;
end;
$$;

-- The NDIA short-notice window (default seven clear days) decides the charge.
-- The caller still supplies a reason when the window applies; charge_client is ignored.
create or replace function public.cancel_shift(
  target uuid,
  charge_client boolean,
  pay_staff boolean,
  reason public.cancellation_reason
) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  window_hours integer;
  inside boolean;
begin
  s := private.editable_shift(target);
  select coalesce(f.short_notice_hours, 168) into window_hours
  from public.finance_settings f where f.workspace_id = s.workspace_id;
  inside := now() > s.starts_at - make_interval(hours => coalesce(window_hours, 168));
  if inside and reason is null then
    raise exception 'Choose a cancellation reason. This cancellation is inside the NDIA short-notice window.'
      using errcode = '22023';
  end if;
  update public.shifts
  set status = 'cancelled', cancelled_at = now(), client_charged = inside, staff_paid = pay_staff,
      cancellation_reason = case when inside then reason end
  where id = s.id;
  perform private.refresh_shift(s.id);
end;
$$;

create or replace function public.invoice_billables(ws uuid, contact_ids uuid[], range_from date, range_to date, due date)
returns table (created_invoice uuid, invoiced_contact uuid)
language plpgsql
set search_path = ''
as $$
declare
  client uuid;
  bill_to uuid;
  new_invoice uuid;
  ws_currency text;
begin
  if not private.is_workspace_admin(ws) then
    raise exception 'Only workspace owners and admins can run bulk invoicing.' using errcode = '42501';
  end if;
  select w.currency into ws_currency from public.workspaces w where w.id = ws;

  foreach client in array contact_ids loop
    continue when not exists (
      select 1 from public.billables b
      join public.client_payers p on p.contact_id = b.contact_id
      where b.workspace_id = ws and b.contact_id = client and b.status = 'unbilled'
        and b.service_date between range_from and range_to and p.payer = 'invoice'
    );

    select coalesce(f.plan_manager_id, client) into bill_to
    from public.client_finance f where f.contact_id = client;
    if bill_to is null then
      bill_to := client;
    end if;

    insert into public.invoices (workspace_id, contact_id, currency, memo, due_date)
    values (ws, bill_to, ws_currency, 'Supports delivered ' || to_char(range_from, 'DD Mon YYYY') || ' to ' || to_char(range_to, 'DD Mon YYYY'), due)
    returning id into new_invoice;

    with lines as (
      update public.billables b set invoice_id = new_invoice
      from public.client_payers p
      where p.contact_id = b.contact_id and p.payer = 'invoice'
        and b.workspace_id = ws and b.contact_id = client and b.status = 'unbilled'
        and b.service_date between range_from and range_to
      returning b.*
    )
    insert into public.invoice_items (workspace_id, invoice_id, description, quantity, unit_amount_cents)
    select ws, new_invoice,
      left(concat_ws(' · ', to_char(l.service_date, 'DD Mon YYYY'), nullif(l.support_number, ''), l.description,
        rtrim(rtrim(l.quantity::text, '0'), '.')
          || case l.unit when 'hour' then ' hrs' when 'km' then ' km' else '' end
          || ' × $' || to_char(l.unit_price_cents / 100.0, 'FM999999990.00')), 500),
      1, l.amount_cents
    from lines l
    order by l.service_date, l.created_at;

    created_invoice := new_invoice;
    invoiced_contact := bill_to;
    return next;
  end loop;
end;
$$;

-- Upserts catalogue rates by support number. Already-priced shifts keep item_rate_cents.
create function public.import_price_guide(ws uuid, items jsonb) returns integer
language plpgsql
set search_path = ''
as $$
declare
  incoming jsonb;
  number text;
  item_name text;
  item_unit public.billing_unit;
  item_rate integer;
  existing uuid;
  imported integer := 0;
begin
  if not private.is_workspace_admin(ws) then
    raise exception 'Only workspace owners and admins can import the price guide.' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'The price guide file has no support items.' using errcode = '22023';
  end if;

  for incoming in select value from jsonb_array_elements(items)
  loop
    number := left(upper(trim(coalesce(incoming ->> 'support_number', ''))), 50);
    item_name := left(trim(coalesce(incoming ->> 'name', '')), 160);
    item_rate := (incoming ->> 'rate_cents')::integer;
    begin
      item_unit := (incoming ->> 'unit')::public.billing_unit;
    exception when invalid_text_representation then
      raise exception 'Every item needs a unit of hour, each, or km.' using errcode = '22023';
    end;
    if number !~ '^[0-9A-Z_]{1,50}$' or item_name = '' or item_rate is null or item_rate <= 0 then
      raise exception 'Every item needs a support number, name, and a rate above zero.' using errcode = '22023';
    end if;

    select i.id into existing
    from public.price_book_items i
    where i.workspace_id = ws and i.support_number = number
    order by i.archived, i.created_at desc
    limit 1;

    if existing is not null then
      update public.price_book_items
      set name = item_name, unit = item_unit, rate_cents = item_rate, archived = false
      where id = existing;
    else
      insert into public.price_book_items (workspace_id, support_number, name, unit, rate_cents, gst_code)
      values (ws, number, item_name, item_unit, item_rate, 'P2');
    end if;
    imported := imported + 1;
  end loop;

  insert into public.finance_settings (workspace_id, price_guide_imported_at)
  values (ws, now())
  on conflict (workspace_id) do update set price_guide_imported_at = now();
  return imported;
end;
$$;

grant execute on function public.list_shift_publish_reasons(uuid, uuid[]) to authenticated;
grant execute on function public.save_shift_support_note(uuid, text) to authenticated;
grant execute on function public.check_out_shift(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.import_price_guide(uuid, jsonb) to authenticated;
