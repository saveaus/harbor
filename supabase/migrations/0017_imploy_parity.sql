-- Rostering compliance, sites, check-ins, billable tasks and budget lines.
--
-- Award rules are settings rather than code so providers can follow the
-- current SCHADS rates. Check-ins record actual start and finish times on the
-- worker's timesheet, so pay and billing follow what really happened.

alter type public.billable_kind add value if not exists 'task';

alter table public.finance_settings
  add column max_daily_minutes integer not null default 600 check (max_daily_minutes between 60 and 1440),
  add column max_weekly_minutes integer not null default 2280 check (max_weekly_minutes between 60 and 10080),
  add column min_rest_minutes integer not null default 600 check (min_rest_minutes between 0 and 1440),
  add column break_after_minutes integer not null default 300 check (break_after_minutes between 60 and 1440),
  add column min_break_minutes integer not null default 30 check (min_break_minutes between 0 and 240),
  add column broken_one_cents integer not null default 2082 check (broken_one_cents >= 0),
  add column broken_two_cents integer not null default 2756 check (broken_two_cents >= 0),
  add column sleepover_cents integer not null default 0 check (sleepover_cents >= 0),
  add column check_in_radius_m integer not null default 100 check (check_in_radius_m between 10 and 5000);

-- Sites -----------------------------------------------------------------------

create type public.site_status as enum ('active', 'inactive');
create type public.site_staff_role as enum ('support', 'admin');

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  address text not null default '' check (char_length(address) <= 200),
  capacity integer check (capacity between 0 and 100),
  status public.site_status not null default 'active',
  notes text not null default '' check (char_length(notes) <= 4000),
  inspection_due date,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  check ((latitude is null) = (longitude is null))
);

create table public.site_clients (
  site_id uuid not null,
  contact_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (site_id, contact_id),
  foreign key (workspace_id, site_id) references public.sites (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade
);

create table public.site_staff (
  site_id uuid not null,
  staff_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role public.site_staff_role not null default 'support',
  primary key (site_id, staff_id),
  foreign key (workspace_id, site_id) references public.sites (workspace_id, id) on delete cascade,
  foreign key (workspace_id, staff_id) references public.staff (workspace_id, id) on delete cascade
);

create index site_clients_contact_idx on public.site_clients (contact_id);
create index site_staff_staff_idx on public.site_staff (staff_id);

-- Saved client groups ---------------------------------------------------------

create table public.client_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create table public.client_group_members (
  group_id uuid not null,
  contact_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  item_id uuid,
  share_percent numeric(5, 2) not null default 100 check (share_percent > 0 and share_percent <= 100),
  primary key (group_id, contact_id),
  foreign key (workspace_id, group_id) references public.client_groups (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, item_id) references public.price_book_items (workspace_id, id) on delete set null (item_id)
);

-- Shifts and check-ins --------------------------------------------------------

alter table public.shifts
  add column site_id uuid,
  add column sleepover boolean not null default false,
  add column broken boolean not null default false,
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  -- When the shift became open in the pool; cleared once someone is assigned.
  add column pool_since timestamptz,
  add column pool_alerted_at timestamptz,
  add constraint shifts_site_fkey foreign key (workspace_id, site_id) references public.sites (workspace_id, id) on delete set null (site_id),
  add constraint shifts_location_pair check ((latitude is null) = (longitude is null)),
  add constraint shifts_one_award_type check (not (sleepover and broken));

create index shifts_site_idx on public.shifts (site_id) where site_id is not null;
create index shifts_pool_idx on public.shifts (pool_since) where pool_since is not null;

alter table public.timesheet_entries
  add column checked_in_at timestamptz,
  add column check_in_latitude double precision,
  add column check_in_longitude double precision,
  add column check_in_accuracy_m real,
  add column check_in_distance_m integer,
  add column check_in_reason text not null default '' check (char_length(check_in_reason) <= 300),
  add column checked_out_at timestamptz,
  add column check_out_latitude double precision,
  add column check_out_longitude double precision,
  add column check_out_distance_m integer,
  add column late_alerted_at timestamptz,
  add constraint timesheet_entries_check_out_after_in check (checked_out_at is null or checked_in_at is not null);

-- Billable tasks --------------------------------------------------------------

create type public.billable_task_status as enum ('outstanding', 'done', 'non_billable');

create table public.billable_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null,
  assignee_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 4000),
  due_on date,
  item_id uuid,
  minutes integer not null default 0 check (minutes between 0 and 10080),
  status public.billable_task_status not null default 'outstanding',
  billable_id uuid references public.billables (id) on delete set null,
  completed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  check ((status = 'outstanding') = (completed_at is null)),
  check (status = 'done' or billable_id is null),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, assignee_id) references public.staff (workspace_id, id) on delete set null (assignee_id),
  foreign key (workspace_id, item_id) references public.price_book_items (workspace_id, id) on delete set null (item_id)
);

create index billable_tasks_workspace_idx on public.billable_tasks (workspace_id, status, due_on);

-- Budget lines ----------------------------------------------------------------

-- A client's funding, optionally limited to one NDIS support category (the
-- first two digits of a support number) and to a date range. Temporary lines
-- are top-ups that end on a set date.
drop table public.client_budgets;

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null,
  category text not null default '' check (category ~ '^([0-9]{2})?$'),
  label text not null default '' check (char_length(label) <= 120),
  amount_cents bigint not null check (amount_cents between 0 and 100000000000),
  starts_on date,
  ends_on date,
  temporary boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (not temporary or ends_on is not null),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade
);

create index budget_lines_contact_idx on public.budget_lines (contact_id);

-- Functions -------------------------------------------------------------------

create function private.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns integer
language sql
immutable
set search_path = ''
as $$
  select round(2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))::integer;
$$;

-- Adds pool tracking to the existing rebuild: a published shift with nobody on it is open.
alter function private.refresh_shift(uuid) rename to refresh_shift_records;

create function private.refresh_shift(target uuid) returns void
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
end;
$$;

drop function public.save_shift(uuid, uuid, timestamptz, timestamptz, integer, text, text, uuid[], jsonb, text, date);

-- Creates a shift (and its repeats) or updates one. `clients` is
-- [{contact_id, item_id, share_percent}]. Returns the first shift's id.
create function public.save_shift(
  ws uuid,
  target uuid,
  starts timestamptz,
  ends timestamptz,
  break_mins integer,
  shift_address text,
  shift_notes text,
  staff_ids uuid[],
  clients jsonb,
  repeat_every text default null,
  repeat_until date default null,
  shift_site uuid default null,
  is_sleepover boolean default false,
  is_broken boolean default false,
  lat double precision default null,
  lng double precision default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  tz text;
  step interval;
  occurrence integer := 0;
  local_start timestamp;
  series uuid;
  first_id uuid;
begin
  if jsonb_typeof(clients) <> 'array' then
    raise exception 'clients must be an array' using errcode = '22023';
  end if;

  if target is not null then
    s := private.editable_shift(target);
    update public.shifts
    set starts_at = starts, ends_at = ends, break_minutes = break_mins, address = shift_address, notes = shift_notes,
        site_id = shift_site, sleepover = is_sleepover, broken = is_broken, latitude = lat, longitude = lng
    where id = target
    returning * into s;
    perform private.assign_shift_people(s, staff_ids, clients);
    perform private.refresh_shift(s.id);
    return s.id;
  end if;

  step := case repeat_every
    when 'daily' then interval '1 day'
    when 'weekly' then interval '7 days'
    when 'fortnightly' then interval '14 days'
    when 'monthly' then interval '1 month'
    else null end;
  if repeat_every is not null and (step is null or repeat_until is null) then
    raise exception 'Choose how often the shift repeats and until when.' using errcode = '22023';
  end if;

  select w.timezone into tz from public.workspaces w where w.id = ws;
  local_start := starts at time zone tz;
  series := case when step is null then null else gen_random_uuid() end;

  loop
    -- Repeats keep the same local start time across daylight-saving changes.
    insert into public.shifts (
      workspace_id, starts_at, ends_at, break_minutes, address, notes, series_id, site_id, sleepover, broken, latitude, longitude
    )
    values (
      ws,
      (local_start + coalesce(step, interval '0') * occurrence) at time zone tz,
      ((local_start + coalesce(step, interval '0') * occurrence) at time zone tz) + (ends - starts),
      break_mins, shift_address, shift_notes, series, shift_site, is_sleepover, is_broken, lat, lng
    )
    returning * into s;
    first_id := coalesce(first_id, s.id);
    perform private.assign_shift_people(s, staff_ids, clients);
    perform private.refresh_shift(s.id);

    occurrence := occurrence + 1;
    exit when step is null
      or (local_start + step * occurrence)::date > repeat_until
      or occurrence >= 60;
  end loop;
  return first_id;
end;
$$;

-- Adds one worker to a shift, for filling open shifts from the best-match list.
create function public.assign_shift_staff(target uuid, worker uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  s := private.editable_shift(target);
  insert into public.shift_staff (shift_id, staff_id, workspace_id) values (s.id, worker, s.workspace_id)
  on conflict do nothing;
  perform private.refresh_shift(s.id);
end;
$$;

-- Lengthens a shift during or after it. A completed shift's charges are voided,
-- timesheets that finished at the old end follow the new end, and billing is
-- recalculated from the hours worked.
create function public.extend_shift(target uuid, ends timestamptz) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  entry uuid;
begin
  select * into s from public.shifts where id = target for update;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  if s.status not in ('published', 'completed') then
    raise exception 'Only published or completed shifts can be extended.' using errcode = 'P0001';
  end if;
  if ends <= s.ends_at then
    raise exception 'Choose an end time later than the current one.' using errcode = '22023';
  end if;
  if ends > s.starts_at + interval '24 hours' then
    raise exception 'A shift can''t be longer than 24 hours.' using errcode = '22023';
  end if;
  if exists (select 1 from public.timesheet_entries where shift_id = s.id and status = 'locked') then
    raise exception 'A worker''s timesheet for this shift is locked for payroll. Unlock it first.' using errcode = 'P0001';
  end if;

  if s.status = 'completed' then
    perform private.release_shift_charges(s.id, null, 'Shift extended');
  end if;
  update public.shifts set ends_at = ends where id = s.id;
  update public.timesheet_entries
  set ends_at = ends
  where shift_id = s.id and ends_at = s.ends_at and checked_out_at is null;

  if s.status = 'completed' then
    for entry in select id from public.timesheet_entries where shift_id = s.id loop
      perform private.bill_timesheet_entry(entry);
    end loop;
  else
    perform private.refresh_shift(s.id);
  end if;
end;
$$;

create function private.own_entry(target uuid) returns public.timesheet_entries
language plpgsql
set search_path = ''
as $$
declare
  e public.timesheet_entries;
begin
  select * into e from public.timesheet_entries where id = target for update;
  if not found then
    raise exception 'Timesheet entry not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.staff st where st.id = e.staff_id and st.user_id = (select auth.uid())) then
    raise exception 'You can only check in to your own shifts.' using errcode = '42501';
  end if;
  if e.status <> 'draft' then
    raise exception 'This timesheet is already approved. Ask an admin to change it.' using errcode = 'P0001';
  end if;
  return e;
end;
$$;

-- Where a worker is expected to check in: the shift's own pin, else its site's.
create function private.shift_location(s public.shifts, out lat double precision, out lng double precision)
language sql
stable
set search_path = ''
as $$
  select coalesce(s.latitude, si.latitude), coalesce(s.longitude, si.longitude)
  from (select 1) one left join public.sites si on si.id = s.site_id;
$$;

-- Starts the worker's actual time. Checking in further than the workspace's
-- radius from the shift location, or without a location, needs a reason.
create function public.check_in_shift(
  entry uuid, lat double precision, lng double precision, accuracy real, reason text
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  e public.timesheet_entries;
  s public.shifts;
  pin record;
  radius integer;
  distance integer;
  started timestamptz;
begin
  e := private.own_entry(entry);
  select * into s from public.shifts where id = e.shift_id;
  -- Arriving early is recorded but the paid time starts at the rostered start.
  started := least(greatest(date_trunc('minute', now()), s.starts_at), e.ends_at - interval '1 minute');
  if s.status <> 'published' then
    raise exception 'Only published shifts can be checked in to.' using errcode = 'P0001';
  end if;
  if e.checked_in_at is not null then
    raise exception 'You''ve already checked in to this shift.' using errcode = 'P0001';
  end if;
  if now() < s.starts_at - interval '2 hours' or now() >= s.ends_at then
    raise exception 'Check in opens two hours before the shift starts and closes when it ends.' using errcode = 'P0001';
  end if;

  select coalesce(f.check_in_radius_m, 100) into radius
  from (select 1) one left join public.finance_settings f on f.workspace_id = s.workspace_id;
  select * into pin from private.shift_location(s);
  if pin.lat is not null and lat is not null then
    distance := private.distance_m(pin.lat, pin.lng, lat, lng);
  end if;
  if trim(coalesce(reason, '')) = '' then
    if pin.lat is not null and lat is null then
      raise exception 'Your location isn''t available. Add a reason to check in.' using errcode = 'P0001';
    end if;
    if distance > radius then
      raise exception 'You''re % m from the shift location. Add a reason to check in.', distance using errcode = 'P0001';
    end if;
  end if;

  update public.timesheet_entries
  set checked_in_at = now(), check_in_latitude = lat, check_in_longitude = lng, check_in_accuracy_m = accuracy,
      check_in_distance_m = distance, check_in_reason = left(trim(coalesce(reason, '')), 300),
      starts_at = started,
      break_minutes = least(break_minutes, greatest((extract(epoch from (ends_at - started)) / 60)::integer - 1, 0)),
      synced = false
  where id = e.id;
  return distance;
end;
$$;

-- Ends the worker's actual time at now; the location is kept for the record.
create function public.check_out_shift(entry uuid, lat double precision, lng double precision) returns integer
language plpgsql
set search_path = ''
as $$
declare
  e public.timesheet_entries;
  s public.shifts;
  pin record;
  distance integer;
  finished timestamptz;
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

-- Saves (or replaces) a named set of clients, items and shares.
create function public.save_client_group(ws uuid, group_name text, clients jsonb) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved uuid;
begin
  if jsonb_typeof(clients) <> 'array' or jsonb_array_length(clients) = 0 then
    raise exception 'Add at least one client to save a group.' using errcode = '22023';
  end if;
  insert into public.client_groups (workspace_id, name) values (ws, trim(group_name))
  on conflict (workspace_id, name) do update set name = excluded.name
  returning id into saved;
  delete from public.client_group_members where group_id = saved;
  insert into public.client_group_members (group_id, contact_id, workspace_id, item_id, share_percent)
  select saved, (c ->> 'contact_id')::uuid, ws, nullif(c ->> 'item_id', '')::uuid, coalesce((c ->> 'share_percent')::numeric, 100)
  from jsonb_array_elements(clients) c;
  return saved;
end;
$$;

-- Finishing a task records it as billable (charging its support item for the
-- time spent) or as non-billable.
create function public.complete_billable_task(target uuid, billable boolean) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  t public.billable_tasks;
  i public.price_book_items;
  charge uuid;
begin
  select * into t from public.billable_tasks where id = target for update;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  if t.status <> 'outstanding' then
    raise exception 'This task is already finished.' using errcode = 'P0001';
  end if;

  if billable then
    select * into i from public.price_book_items where id = t.item_id;
    if not found then
      raise exception 'Choose a support item to bill this task.' using errcode = 'P0001';
    end if;
    if i.unit = 'km' then
      raise exception 'Choose an hourly or per-item support to bill a task.' using errcode = 'P0001';
    end if;
    if i.unit = 'hour' and t.minutes = 0 then
      raise exception 'Record the time spent before billing the task.' using errcode = 'P0001';
    end if;
    insert into public.billables (
      workspace_id, contact_id, kind, item_id, support_number, description, service_date, unit, quantity, unit_price_cents, gst_code
    )
    values (
      t.workspace_id, t.contact_id, 'task', i.id, i.support_number, left(i.name || ' · ' || t.title, 300),
      private.local_day(t.workspace_id, now()), i.unit,
      case when i.unit = 'hour' then round(t.minutes / 60.0, 2) else 1 end, i.rate_cents, i.gst_code
    )
    returning id into charge;
  end if;

  update public.billable_tasks
  set status = case when billable then 'done' else 'non_billable' end::public.billable_task_status,
      completed_at = now(), billable_id = charge
  where id = t.id;
  return charge;
end;
$$;

create function public.reopen_billable_task(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  t public.billable_tasks;
begin
  select * into t from public.billable_tasks where id = target for update;
  if not found or t.status = 'outstanding' then
    raise exception 'Only finished tasks can be reopened.' using errcode = 'P0001';
  end if;
  if t.billable_id is not null then
    if exists (select 1 from public.billables where id = t.billable_id and status not in ('unbilled', 'void')) then
      raise exception 'This task''s charge is already invoiced or claimed. Release it first.' using errcode = 'P0001';
    end if;
    update public.billables set status = 'void', void_reason = 'Task reopened' where id = t.billable_id and status = 'unbilled';
  end if;
  update public.billable_tasks set status = 'outstanding', completed_at = null, billable_id = null where id = t.id;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'private.distance_m(double precision, double precision, double precision, double precision)',
    'private.refresh_shift_records(uuid)',
    'private.refresh_shift(uuid)',
    'private.own_entry(uuid)',
    'private.shift_location(public.shifts)',
    'public.save_shift(uuid, uuid, timestamptz, timestamptz, integer, text, text, uuid[], jsonb, text, date, uuid, boolean, boolean, double precision, double precision)',
    'public.assign_shift_staff(uuid, uuid)',
    'public.extend_shift(uuid, timestamptz)',
    'public.check_in_shift(uuid, double precision, double precision, real, text)',
    'public.check_out_shift(uuid, double precision, double precision)',
    'public.save_client_group(uuid, text, jsonb)',
    'public.complete_billable_task(uuid, boolean)',
    'public.reopen_billable_task(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Row-level security ----------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['client_groups', 'client_group_members', 'billable_tasks']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_member(workspace_id)) '
      'with check (private.is_workspace_member(workspace_id))',
      t
    );
  end loop;

  foreach t in array array['sites', 'site_clients', 'site_staff', 'budget_lines']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members read %1$s" on public.%1$I for select to authenticated '
      'using (private.is_workspace_member(workspace_id))',
      t
    );
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_admin(workspace_id)) '
      'with check (private.is_workspace_admin(workspace_id))',
      t
    );
  end loop;

  foreach t in array array['sites', 'billable_tasks', 'budget_lines']
  loop
    execute format(
      'create trigger record_audit_event after insert or update or delete on public.%I '
      'for each row execute function private.record_audit_event()',
      t
    );
  end loop;
end;
$$;
