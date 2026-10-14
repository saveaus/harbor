-- Live Imploy parity: travel-between, pending conversion, travel claims,
-- sleepover active hours, shift titles, and billing reconciliation.

alter table public.shifts
  add column title text not null default '' check (char_length(title) <= 160),
  add column travel_between boolean not null default false,
  add column travel_km numeric(6, 1) not null default 0 check (travel_km >= 0 and travel_km <= 2000);

alter table public.finance_settings
  add column sleepover_free_minutes integer not null default 0 check (sleepover_free_minutes between 0 and 720);

-- Keep pool tracking, and copy a travel-between estimate onto draft timesheets.
create or replace function private.refresh_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  open_now boolean;
begin
  perform private.refresh_shift_records(target);
  select s.status = 'published' and not exists (select 1 from public.shift_staff ss where ss.shift_id = s.id)
  into open_now
  from public.shifts s where s.id = target;
  update public.shifts
  set pool_since = case when open_now then coalesce(pool_since, now()) end,
      pool_alerted_at = case when open_now then pool_alerted_at end
  where id = target and (pool_since is null) = open_now;

  update public.timesheet_entries e
  set km = s.travel_km
  from public.shifts s
  where e.shift_id = s.id and s.id = target and s.travel_between and s.travel_km > 0
    and e.synced and e.status = 'draft' and e.km = 0;
end;
$$;

-- Imploy converts up to 20 pending lines from incomplete shifts into unpaid.
create function public.convert_pending_billables(ids uuid[]) returns integer
language plpgsql
set search_path = ''
as $$
declare
  n integer;
begin
  if ids is null or cardinality(ids) = 0 then
    raise exception 'Select at least one pending charge.' using errcode = '22023';
  end if;
  if cardinality(ids) > 20 then
    raise exception 'Convert at most 20 pending charges at a time.' using errcode = '22023';
  end if;
  update public.billables
  set status = 'unbilled'
  where id = any (ids) and status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'None of those charges are still pending.' using errcode = 'P0001';
  end if;
  return n;
end;
$$;

create function public.duplicate_shift(target uuid) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  copied uuid;
begin
  select * into s from public.shifts where id = target;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  insert into public.shifts (
    workspace_id, title, starts_at, ends_at, break_minutes, address, notes, site_id,
    sleepover, broken, latitude, longitude, travel_between, travel_km
  )
  values (
    s.workspace_id, s.title, s.starts_at, s.ends_at, s.break_minutes, s.address, s.notes, s.site_id,
    s.sleepover, s.broken, s.latitude, s.longitude, s.travel_between, s.travel_km
  )
  returning id into copied;
  insert into public.shift_staff (shift_id, staff_id, workspace_id)
  select copied, staff_id, workspace_id from public.shift_staff where shift_id = s.id;
  insert into public.shift_clients (shift_id, contact_id, workspace_id, item_id, share_percent)
  select copied, contact_id, workspace_id, item_id, share_percent from public.shift_clients where shift_id = s.id;
  return copied;
end;
$$;

-- ABDS: completed shifts that should have charges but don't.
create function public.reconcile_shift_billables(ws uuid) returns integer
language plpgsql
set search_path = ''
as $$
declare
  entry uuid;
  n integer := 0;
  shift uuid;
begin
  for shift in
    select s.id
    from public.shifts s
    where s.workspace_id = ws and s.status = 'completed'
      and exists (select 1 from public.shift_clients sc where sc.shift_id = s.id and sc.item_id is not null)
      and not exists (
        select 1 from public.billables b
        where b.shift_id = s.id and b.kind in ('service', 'travel', 'cancellation') and b.status <> 'void'
      )
  loop
    for entry in select id from public.timesheet_entries where shift_id = shift loop
      perform private.bill_timesheet_entry(entry);
    end loop;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Travel claims ---------------------------------------------------------------

create type public.travel_claim_kind as enum ('between', 'to_from', 'community');
create type public.travel_claim_status as enum ('draft', 'approved', 'rejected');

create table public.travel_claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  staff_id uuid not null,
  contact_id uuid,
  shift_id uuid,
  timesheet_entry_id uuid,
  travel_date date not null,
  destination text not null default '' check (char_length(destination) <= 200),
  description text not null default '' check (char_length(description) <= 400),
  distance_km numeric(6, 1) not null check (distance_km > 0 and distance_km <= 2000),
  kind public.travel_claim_kind not null default 'between',
  charge_client boolean not null default true,
  status public.travel_claim_status not null default 'approved',
  billable_id uuid references public.billables (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, staff_id) references public.staff (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, shift_id) references public.shifts (workspace_id, id) on delete set null (shift_id)
);

create index travel_claims_workspace_idx on public.travel_claims (workspace_id, travel_date desc);

create function public.save_travel_claim(
  ws uuid,
  worker uuid,
  client uuid,
  shift uuid,
  travel_on date,
  dest text,
  notes text,
  km numeric,
  claim_kind public.travel_claim_kind,
  charge boolean
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved uuid;
  travel public.price_book_items;
  charge_id uuid;
begin
  if charge then
    select i.* into travel
    from public.finance_settings f
    join public.price_book_items i on i.id = f.travel_item_id
    where f.workspace_id = ws;
    if not found then
      raise exception 'Choose a travel item in Finance settings before charging the client.' using errcode = 'P0001';
    end if;
    if client is null then
      raise exception 'Choose a client to charge.' using errcode = '22023';
    end if;
    insert into public.billables (
      workspace_id, contact_id, shift_id, kind, item_id, support_number, description,
      service_date, unit, quantity, unit_price_cents, gst_code, claim_type
    )
    values (
      ws, client, shift, 'travel', travel.id, travel.support_number,
      left(coalesce(nullif(trim(notes), ''), travel.name || ' · ' || dest), 300),
      travel_on, 'km', km, travel.rate_cents, travel.gst_code, 'TRAN'
    )
    returning id into charge_id;
  end if;

  insert into public.travel_claims (
    workspace_id, staff_id, contact_id, shift_id, travel_date, destination, description,
    distance_km, kind, charge_client, billable_id
  )
  values (ws, worker, client, shift, travel_on, dest, notes, km, claim_kind, charge, charge_id)
  returning id into saved;
  return saved;
end;
$$;

-- Sleepover active hours ------------------------------------------------------

create table public.sleepover_hours (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  shift_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  description text not null default '' check (char_length(description) <= 200),
  approved boolean not null default true,
  billable_id uuid references public.billables (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (ends_at > starts_at),
  foreign key (workspace_id, shift_id) references public.shifts (workspace_id, id) on delete cascade
);

create function public.save_sleepover_hours(
  target uuid, starts timestamptz, ends timestamptz, notes text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  saved uuid;
  total integer;
  free_mins integer;
  extra numeric;
  i public.price_book_items;
  sc public.shift_clients;
  charge uuid;
begin
  select * into s from public.shifts where id = target for update;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  if not s.sleepover then
    raise exception 'Active hours can only be logged on a sleepover.' using errcode = 'P0001';
  end if;
  if ends <= starts or ends > starts + interval '24 hours' then
    raise exception 'Choose an active period during the sleepover.' using errcode = '22023';
  end if;

  insert into public.sleepover_hours (workspace_id, shift_id, starts_at, ends_at, description)
  values (s.workspace_id, s.id, starts, ends, left(trim(coalesce(notes, '')), 200))
  returning id into saved;

  if s.status <> 'completed' then
    return saved;
  end if;

  select coalesce(sum((extract(epoch from (h.ends_at - h.starts_at)) / 60)::integer), 0) into total
  from public.sleepover_hours h where h.shift_id = s.id and h.approved;
  select coalesce(f.sleepover_free_minutes, 0) into free_mins
  from public.finance_settings f where f.workspace_id = s.workspace_id;
  extra := greatest(total - coalesce(free_mins, 0), 0) / 60.0;
  if extra <= 0 then
    return saved;
  end if;

  select * into sc from public.shift_clients where shift_id = s.id and item_id is not null order by share_percent desc limit 1;
  if not found then
    return saved;
  end if;
  select * into i from public.price_book_items where id = sc.item_id;
  if not found or i.unit <> 'hour' then
    return saved;
  end if;

  update public.billables set status = 'void', void_reason = 'Active hours updated'
  where shift_id = s.id and description like 'Active hours%' and status = 'unbilled';

  insert into public.billables (
    workspace_id, contact_id, shift_id, kind, item_id, support_number, description,
    service_date, unit, quantity, unit_price_cents, gst_code
  )
  values (
    s.workspace_id, sc.contact_id, s.id, 'service', i.id, i.support_number,
    'Active hours beyond the sleepover allowance',
    private.local_day(s.workspace_id, s.starts_at), 'hour', round(extra, 2),
    round(i.rate_cents * sc.share_percent / 100)::integer, i.gst_code
  )
  returning id into charge;
  update public.sleepover_hours set billable_id = charge where id = saved;
  return saved;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'private.refresh_shift(uuid)',
    'public.convert_pending_billables(uuid[])',
    'public.duplicate_shift(uuid)',
    'public.reconcile_shift_billables(uuid)',
    'public.save_travel_claim(uuid, uuid, uuid, uuid, date, text, text, numeric, public.travel_claim_kind, boolean)',
    'public.save_sleepover_hours(uuid, timestamptz, timestamptz, text)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

alter table public.travel_claims enable row level security;
alter table public.sleepover_hours enable row level security;

create policy "members manage travel_claims" on public.travel_claims for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy "members manage sleepover_hours" on public.sleepover_hours for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

create trigger record_audit_event after insert or update or delete on public.travel_claims
  for each row execute function private.record_audit_event();
create trigger record_audit_event after insert or update or delete on public.sleepover_hours
  for each row execute function private.record_audit_event();
