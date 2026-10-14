-- Scheduling and finance.
--
-- A shift is the source of two records: timesheet entries (what each worker is
-- paid) and billables (what each client is charged). Billables are the single
-- source of truth for invoices and NDIS claims. Attaching a billable to an
-- invoice or claim reserves it, so the same service can never be charged twice.
--
-- Every transition that touches more than one of these tables runs inside one
-- function below, so the roster, timesheets and billing cannot drift apart.

alter table public.workspaces
  add column timezone text not null default 'Australia/Sydney'
    check (timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$');

alter table public.app_installs drop constraint app_installs_app_key_check;
alter table public.app_installs add constraint app_installs_app_key_check
  check (app_key in ('files', 'payments', 'contracts', 'forms', 'helpdesk', 'timetracker', 'scheduling', 'finance'));

-- Composite keys let child rows prove they belong to the same workspace as their parents.
alter table public.contacts add constraint contacts_workspace_id_key unique (workspace_id, id);
alter table public.staff add constraint staff_workspace_id_key unique (workspace_id, id);
alter table public.invoices add constraint invoices_workspace_id_key unique (workspace_id, id);

-- Price book ------------------------------------------------------------------

create type public.billing_unit as enum ('hour', 'each', 'km');
create type public.gst_code as enum ('P1', 'P2', 'P5');
create type public.claim_type as enum ('CANC', 'REPW', 'TRAN', 'NF2F', 'THLT', 'IRSS');
create type public.cancellation_reason as enum ('NSDH', 'NSDF', 'NSDT', 'NSDO');

create table public.price_book_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  support_number text not null default '' check (support_number ~ '^[0-9A-Z_]{0,50}$'),
  name text not null check (char_length(name) between 1 and 160),
  unit public.billing_unit not null default 'hour',
  rate_cents integer not null check (rate_cents >= 0),
  gst_code public.gst_code not null default 'P2',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index price_book_items_number_idx
  on public.price_book_items (workspace_id, support_number) where support_number <> '' and not archived;

create table public.finance_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  abn text not null default '' check (abn ~ '^([0-9]{11})?$'),
  ndis_registration_number text not null default '' check (ndis_registration_number ~ '^[0-9]{0,20}$'),
  travel_item_id uuid,
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, travel_item_id) references public.price_book_items (workspace_id, id) on delete set null (travel_item_id)
);

create table public.pay_rates (
  staff_id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  hourly_cents integer not null default 0 check (hourly_cents >= 0),
  km_cents integer not null default 0 check (km_cents >= 0),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, staff_id) references public.staff (workspace_id, id) on delete cascade
);

create table public.client_budgets (
  contact_id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade
);

-- Who pays for a client's supports. NDIA-managed NDIS participants are claimed
-- through PRODA; everyone else is invoiced.
create view public.client_payers with (security_invoker = true) as
  select
    c.id as contact_id,
    c.workspace_id,
    case when p.funding = 'ndis' and p.plan_management = 'ndia_managed' then 'ndia' else 'invoice' end as payer,
    coalesce(p.ndis_number, '') as ndis_number
  from public.contacts c
  left join public.client_profiles p on p.contact_id = c.id;

-- Roster ----------------------------------------------------------------------

create type public.shift_status as enum ('unpublished', 'published', 'completed', 'cancelled');

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 600),
  rostered_minutes integer generated always as
    ((extract(epoch from (ends_at - starts_at)) / 60)::integer - break_minutes) stored,
  status public.shift_status not null default 'unpublished',
  address text not null default '' check (char_length(address) <= 200),
  notes text not null default '' check (char_length(notes) <= 2000),
  series_id uuid,
  client_charged boolean not null default false,
  staff_paid boolean not null default false,
  cancellation_reason public.cancellation_reason,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  check (break_minutes * interval '1 minute' < ends_at - starts_at),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((status = 'completed') = (completed_at is not null)),
  check (status = 'cancelled' or (not client_charged and not staff_paid and cancellation_reason is null)),
  check (not client_charged or cancellation_reason is not null)
);

create index shifts_workspace_idx on public.shifts (workspace_id, starts_at);
create index shifts_series_idx on public.shifts (series_id) where series_id is not null;

create table public.shift_staff (
  shift_id uuid not null,
  staff_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (shift_id, staff_id),
  foreign key (workspace_id, shift_id) references public.shifts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, staff_id) references public.staff (workspace_id, id) on delete cascade
);

create index shift_staff_staff_idx on public.shift_staff (staff_id);

create table public.shift_clients (
  shift_id uuid not null,
  contact_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  item_id uuid,
  share_percent numeric(5, 2) not null default 100 check (share_percent > 0 and share_percent <= 100),
  primary key (shift_id, contact_id),
  foreign key (workspace_id, shift_id) references public.shifts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, item_id) references public.price_book_items (workspace_id, id) on delete set null (item_id)
);

create index shift_clients_contact_idx on public.shift_clients (contact_id);

-- Timesheets ------------------------------------------------------------------

create table public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  staff_id uuid,
  locked_by uuid default auth.uid() references auth.users (id) on delete set null,
  locked_at timestamptz not null default now(),
  exported_at timestamptz,
  export_count integer not null default 0,
  unique (workspace_id, id),
  check (period_end >= period_start),
  foreign key (workspace_id, staff_id) references public.staff (workspace_id, id) on delete set null (staff_id)
);

create index payroll_exports_workspace_idx on public.payroll_exports (workspace_id, locked_at desc);

create type public.timesheet_status as enum ('draft', 'approved', 'locked');

create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  staff_id uuid not null,
  shift_id uuid,
  contact_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 600),
  worked_minutes integer generated always as
    ((extract(epoch from (ends_at - starts_at)) / 60)::integer - break_minutes) stored,
  work_date date not null,
  km numeric(7, 1) not null default 0 check (km between 0 and 2000),
  notes text not null default '' check (char_length(notes) <= 1000),
  status public.timesheet_status not null default 'draft',
  -- True until someone records actual times; synced entries follow roster changes.
  synced boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  payroll_export_id uuid,
  created_at timestamptz not null default now(),
  unique (shift_id, staff_id),
  check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  check (break_minutes * interval '1 minute' < ends_at - starts_at),
  check ((status = 'locked') = (payroll_export_id is not null)),
  check ((status = 'draft') = (approved_at is null)),
  foreign key (workspace_id, staff_id) references public.staff (workspace_id, id) on delete cascade,
  foreign key (workspace_id, shift_id) references public.shifts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, payroll_export_id) references public.payroll_exports (workspace_id, id)
);

create index timesheet_entries_workspace_idx on public.timesheet_entries (workspace_id, work_date);
create index timesheet_entries_staff_idx on public.timesheet_entries (staff_id, work_date);
create index timesheet_entries_export_idx on public.timesheet_entries (payroll_export_id) where payroll_export_id is not null;

create table public.timesheet_unlocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  payroll_export_id uuid not null,
  staff_id uuid,
  reason text not null check (char_length(reason) between 3 and 500),
  entry_count integer not null,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (workspace_id, payroll_export_id) references public.payroll_exports (workspace_id, id) on delete cascade
);

-- The workspace's local calendar day decides which pay period and claim period work falls in.
create function private.local_day(ws uuid, instant timestamptz) returns date
language sql
stable
set search_path = ''
as $$
  select (instant at time zone w.timezone)::date from public.workspaces w where w.id = ws;
$$;

create function private.set_work_date() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.work_date := private.local_day(new.workspace_id, new.starts_at);
  return new;
end;
$$;

create trigger timesheet_entries_work_date before insert or update of starts_at on public.timesheet_entries
  for each row execute function private.set_work_date();

-- Locked entries were sent to payroll; only unlock_timesheets may change them.
create function private.guard_locked_timesheet() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'locked' and coalesce(current_setting('harbor.unlocking', true), '') <> 'on' then
    raise exception 'This timesheet is locked for payroll. Unlock it with a reason first.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger timesheet_entries_guard_locked before update or delete on public.timesheet_entries
  for each row execute function private.guard_locked_timesheet();

-- NDIS claims -----------------------------------------------------------------

create type public.claim_payment_status as enum ('unpaid', 'paid');

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  number integer not null default 0,
  period_start date not null,
  period_end date not null,
  payment_status public.claim_payment_status not null default 'unpaid',
  exported_at timestamptz,
  export_count integer not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number),
  unique (workspace_id, id),
  check (period_end >= period_start and period_end <= period_start + 366)
);

create function private.assign_claim_number() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('claims:' || new.workspace_id::text));
  select coalesce(max(c.number), 0) + 1 into new.number from public.claims c where c.workspace_id = new.workspace_id;
  return new;
end;
$$;

create trigger claims_assign_number before insert on public.claims
  for each row execute function private.assign_claim_number();

-- Billables -------------------------------------------------------------------

create type public.billable_kind as enum ('service', 'travel', 'cancellation', 'expense', 'manual');
-- pending: from a shift that hasn't happened yet. unbilled: ready to invoice or claim.
-- invoiced/claimed/exported/paid: reserved by an invoice or claim. void: kept for the record only.
create type public.billable_status as enum ('pending', 'unbilled', 'invoiced', 'claimed', 'exported', 'paid', 'void');

create table public.billables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null,
  shift_id uuid,
  timesheet_entry_id uuid,
  kind public.billable_kind not null,
  item_id uuid,
  support_number text not null default '' check (support_number ~ '^[0-9A-Z_]{0,50}$'),
  description text not null check (char_length(description) between 1 and 300),
  service_date date not null,
  unit public.billing_unit not null,
  quantity numeric(9, 2) not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  amount_cents integer generated always as (round(quantity * unit_price_cents)::integer) stored,
  gst_code public.gst_code not null default 'P2',
  claim_type public.claim_type,
  cancellation_reason public.cancellation_reason,
  status public.billable_status not null default 'unbilled',
  invoice_id uuid,
  claim_id uuid,
  void_reason text not null default '' check (char_length(void_reason) <= 200),
  created_at timestamptz not null default now(),
  check ((claim_type is not distinct from 'CANC') = (cancellation_reason is not null)),
  check (invoice_id is null or claim_id is null),
  check ((status = 'void') = (void_reason <> '')),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade,
  foreign key (workspace_id, shift_id) references public.shifts (workspace_id, id),
  foreign key (timesheet_entry_id) references public.timesheet_entries (id) on delete set null,
  foreign key (workspace_id, item_id) references public.price_book_items (workspace_id, id) on delete set null (item_id),
  foreign key (workspace_id, invoice_id) references public.invoices (workspace_id, id) on delete set null (invoice_id),
  foreign key (workspace_id, claim_id) references public.claims (workspace_id, id) on delete set null (claim_id)
);

create index billables_workspace_idx on public.billables (workspace_id, service_date desc);
create index billables_contact_idx on public.billables (contact_id, service_date);
create index billables_shift_idx on public.billables (shift_id) where shift_id is not null;
create index billables_entry_idx on public.billables (timesheet_entry_id) where timesheet_entry_id is not null;
create index billables_invoice_idx on public.billables (invoice_id) where invoice_id is not null;
create index billables_claim_idx on public.billables (claim_id) where claim_id is not null;
create unique index billables_one_per_shift_line_idx
  on public.billables (shift_id, contact_id, kind, timesheet_entry_id) nulls not distinct
  where shift_id is not null and status <> 'void';

create table public.claim_exclusions (
  claim_id uuid not null,
  billable_id uuid not null references public.billables (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (claim_id, billable_id),
  foreign key (workspace_id, claim_id) references public.claims (workspace_id, id) on delete cascade
);

-- Status follows reservation: an invoice or claim reserves a billable, releasing
-- it returns it to unbilled. Reserved charges cannot be re-priced or moved.
create function private.normalize_billable() returns trigger
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
    if new.status not in ('claimed', 'exported') then new.status := 'claimed'; end if;
  else
    new.status := 'unbilled';
  end if;
  return new;
end;
$$;

create trigger billables_normalize before insert or update on public.billables
  for each row execute function private.normalize_billable();

-- Invoices stay owned by Payments; billables follow their status.
create function private.sync_invoice_billables() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' then
    update public.billables set status = 'paid' where invoice_id = new.id;
  elsif new.status = 'void' then
    update public.billables set invoice_id = null where invoice_id = new.id;
  end if;
  return null;
end;
$$;

revoke all on function private.sync_invoice_billables() from public, anon, authenticated;

create trigger invoices_sync_billables after update of status on public.invoices
  for each row when (new.status is distinct from old.status) execute function private.sync_invoice_billables();

-- Shift lifecycle -------------------------------------------------------------

-- Rebuilds what a shift implies: draft timesheets for its workers and pending
-- billables for its clients while it is published, or cancellation charges.
create function private.refresh_shift(target uuid) returns void
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

    -- A timesheet names the client only when the shift has exactly one.
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
    -- One line per client per worker; an open shift is priced once per client.
    insert into public.billables (
      workspace_id, contact_id, shift_id, timesheet_entry_id, kind, item_id, support_number, description,
      service_date, unit, quantity, unit_price_cents, gst_code, status
    )
    select s.workspace_id, sc.contact_id, s.id, e.id, 'service', i.id, i.support_number, i.name,
      service_day, i.unit,
      case when i.unit = 'hour' then round(s.rostered_minutes / 60.0, 2) else 1 end,
      round(i.rate_cents * sc.share_percent / 100)::integer, i.gst_code, 'pending'
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
      round(i.rate_cents * sc.share_percent / 100)::integer, i.gst_code, 'CANC', s.cancellation_reason
    from public.shift_clients sc
    join public.price_book_items i on i.id = sc.item_id
    left join public.timesheet_entries e on e.shift_id = s.id
    where sc.shift_id = s.id;
  end if;
end;
$$;

-- Bills one completed timesheet entry: worked hours for each client's support,
-- and travel kilometres split by each client's share.
create function private.bill_timesheet_entry(entry uuid) returns void
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
    round(i.rate_cents * sc.share_percent / 100)::integer, i.gst_code
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

-- Voids a shift's ready charges so they can be recalculated; refuses when any are reserved.
create function private.release_shift_charges(target uuid, entry uuid, reason text) returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.billables b
    where b.shift_id = target and (entry is null or b.timesheet_entry_id = entry)
      and b.kind in ('service', 'travel') and b.status not in ('pending', 'unbilled', 'void')
  ) then
    raise exception 'This shift is already invoiced or claimed. Void the invoice or remove it from the claim first.'
      using errcode = 'P0001';
  end if;
  update public.billables set status = 'void', void_reason = reason
  where shift_id = target and (entry is null or timesheet_entry_id = entry)
    and kind in ('service', 'travel') and status = 'unbilled';
end;
$$;

create function private.editable_shift(target uuid) returns public.shifts
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  select * into s from public.shifts where id = target for update;
  if not found then
    raise exception 'Shift not found' using errcode = 'P0002';
  end if;
  if s.status = 'completed' then
    raise exception 'This shift is completed. Reopen it to make changes.' using errcode = 'P0001';
  end if;
  if s.status = 'cancelled' then
    raise exception 'This shift is cancelled. Restore it to make changes.' using errcode = 'P0001';
  end if;
  return s;
end;
$$;

create function private.assign_shift_people(s public.shifts, staff_ids uuid[], clients jsonb) returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.shift_staff where shift_id = s.id and staff_id <> all (staff_ids);
  insert into public.shift_staff (shift_id, staff_id, workspace_id)
  select s.id, x, s.workspace_id from unnest(staff_ids) as x
  on conflict do nothing;

  delete from public.shift_clients where shift_id = s.id
    and contact_id not in (select (c ->> 'contact_id')::uuid from jsonb_array_elements(clients) c);
  insert into public.shift_clients (shift_id, contact_id, workspace_id, item_id, share_percent)
  select s.id, (c ->> 'contact_id')::uuid, s.workspace_id, nullif(c ->> 'item_id', '')::uuid,
    coalesce((c ->> 'share_percent')::numeric, 100)
  from jsonb_array_elements(clients) c
  on conflict (shift_id, contact_id) do update set item_id = excluded.item_id, share_percent = excluded.share_percent;
end;
$$;

-- The private schema isn't exposed over the API; these run with the caller's
-- row-level security from the public functions below.
do $$
declare
  f text;
begin
  foreach f in array array[
    'private.local_day(uuid, timestamptz)',
    'private.refresh_shift(uuid)',
    'private.bill_timesheet_entry(uuid)',
    'private.release_shift_charges(uuid, uuid, text)',
    'private.editable_shift(uuid)',
    'private.assign_shift_people(public.shifts, uuid[], jsonb)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

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
  repeat_until date default null
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
    set starts_at = starts, ends_at = ends, break_minutes = break_mins, address = shift_address, notes = shift_notes
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
    insert into public.shifts (workspace_id, starts_at, ends_at, break_minutes, address, notes, series_id)
    values (
      ws,
      (local_start + coalesce(step, interval '0') * occurrence) at time zone tz,
      ((local_start + coalesce(step, interval '0') * occurrence) at time zone tz) + (ends - starts),
      break_mins, shift_address, shift_notes, series
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

-- Moves a shift on the roster board, optionally reassigning its single worker
-- (null leaves it open in the shift pool).
create function public.move_shift(target uuid, starts timestamptz, worker uuid, reassign boolean) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  s := private.editable_shift(target);
  if reassign and (select count(*) from public.shift_staff where shift_id = s.id) > 1 then
    raise exception 'Shifts with more than one worker can''t be reassigned by dragging.' using errcode = 'P0001';
  end if;
  update public.shifts set starts_at = starts, ends_at = starts + (s.ends_at - s.starts_at) where id = s.id;
  if reassign then
    delete from public.shift_staff where shift_id = s.id;
    if worker is not null then
      insert into public.shift_staff (shift_id, staff_id, workspace_id) values (s.id, worker, s.workspace_id);
    end if;
  end if;
  perform private.refresh_shift(s.id);
end;
$$;

create function public.set_shift_published(target uuid, publish boolean) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  s := private.editable_shift(target);
  update public.shifts set status = case when publish then 'published' else 'unpublished' end::public.shift_status
  where id = s.id;
  perform private.refresh_shift(s.id);
end;
$$;

-- Publishes every unpublished shift in a range, for "Publish week".
create function public.publish_shifts(ws uuid, range_start timestamptz, range_end timestamptz) returns integer
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
    update public.shifts set status = 'published' where id = target;
    perform private.refresh_shift(target);
    published := published + 1;
  end loop;
  return published;
end;
$$;

-- An unassigned, published shift can be taken by the signed-in worker.
create function public.take_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
  me uuid;
begin
  s := private.editable_shift(target);
  if s.status <> 'published' or exists (select 1 from public.shift_staff where shift_id = s.id) then
    raise exception 'This shift is no longer open.' using errcode = 'P0001';
  end if;
  select st.id into me from public.staff st where st.workspace_id = s.workspace_id and st.user_id = (select auth.uid());
  if me is null then
    raise exception 'Your account isn''t linked to a staff record.' using errcode = 'P0001';
  end if;
  insert into public.shift_staff (shift_id, staff_id, workspace_id) values (s.id, me, s.workspace_id);
  perform private.refresh_shift(s.id);
end;
$$;

-- Turns pending billables into charges using each worker's timesheet hours.
create function public.complete_shift(target uuid) returns void
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
  update public.shifts set status = 'completed', completed_at = now() where id = s.id;
  delete from public.billables where shift_id = s.id and status = 'pending';
  for entry in select id from public.timesheet_entries where shift_id = s.id loop
    perform private.bill_timesheet_entry(entry);
  end loop;
end;
$$;

-- Completed work goes back to published so it can be corrected; its charges are voided and recalculated.
create function public.reopen_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  select * into s from public.shifts where id = target for update;
  if not found or s.status <> 'completed' then
    raise exception 'Only completed shifts can be reopened.' using errcode = 'P0001';
  end if;
  perform private.release_shift_charges(s.id, null, 'Shift reopened');
  update public.shifts set status = 'published', completed_at = null where id = s.id;
  perform private.refresh_shift(s.id);
end;
$$;

create function public.cancel_shift(
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
begin
  s := private.editable_shift(target);
  if charge_client and reason is null then
    raise exception 'Choose a cancellation reason to charge the client.' using errcode = '22023';
  end if;
  update public.shifts
  set status = 'cancelled', cancelled_at = now(), client_charged = charge_client, staff_paid = pay_staff,
      cancellation_reason = case when charge_client then reason end
  where id = s.id;
  perform private.refresh_shift(s.id);
end;
$$;

create function public.restore_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  select * into s from public.shifts where id = target for update;
  if not found or s.status <> 'cancelled' then
    raise exception 'Only cancelled shifts can be restored.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.billables
    where shift_id = s.id and kind = 'cancellation' and status not in ('unbilled', 'void')
  ) then
    raise exception 'The cancellation fee is already invoiced or claimed. Release it first.' using errcode = 'P0001';
  end if;
  update public.billables set status = 'void', void_reason = 'Shift restored'
  where shift_id = s.id and kind = 'cancellation' and status = 'unbilled';
  update public.shifts
  set status = 'unpublished', cancelled_at = null, client_charged = false, staff_paid = false, cancellation_reason = null
  where id = s.id;
  perform private.refresh_shift(s.id);
end;
$$;

-- Only drafts that never produced charges can be deleted; otherwise cancel.
create function public.delete_shift(target uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.shifts;
begin
  s := private.editable_shift(target);
  if s.status <> 'unpublished' then
    raise exception 'Unpublish the shift before deleting it, or cancel it instead.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.billables where shift_id = s.id) then
    raise exception 'This shift has billing history. Cancel it instead.' using errcode = 'P0001';
  end if;
  delete from public.shifts where id = s.id;
end;
$$;

-- Timesheet lifecycle ---------------------------------------------------------

-- Records actual times or travel. On a completed shift the entry's charges are
-- recalculated, so billing always matches the hours worked.
create function public.update_timesheet_entry(
  target uuid,
  starts timestamptz,
  ends timestamptz,
  break_mins integer,
  travel_km numeric,
  entry_notes text
) returns void
language plpgsql
set search_path = ''
as $$
declare
  e public.timesheet_entries;
  shift_state public.shift_status;
begin
  select * into e from public.timesheet_entries where id = target for update;
  if not found then
    raise exception 'Timesheet entry not found' using errcode = 'P0002';
  end if;
  select status into shift_state from public.shifts where id = e.shift_id;
  if shift_state = 'completed' then
    perform private.release_shift_charges(e.shift_id, e.id, 'Timesheet changed');
  end if;
  update public.timesheet_entries
  set starts_at = starts, ends_at = ends, break_minutes = break_mins, km = travel_km, notes = entry_notes,
      synced = e.shift_id is not null and starts = e.starts_at and ends = e.ends_at and break_mins = e.break_minutes and e.synced
  where id = e.id;
  if shift_state = 'completed' then
    perform private.bill_timesheet_entry(e.id);
  end if;
end;
$$;

-- Locks approved entries in a period for payroll. Drafts are left out.
create function public.lock_timesheets(ws uuid, period_from date, period_to date, worker uuid) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  export_id uuid;
  locked integer;
begin
  insert into public.payroll_exports (workspace_id, period_start, period_end, staff_id)
  values (ws, period_from, period_to, worker)
  returning id into export_id;

  update public.timesheet_entries
  set status = 'locked', payroll_export_id = export_id
  where workspace_id = ws and status = 'approved' and work_date between period_from and period_to
    and (worker is null or staff_id = worker);
  get diagnostics locked = row_count;
  if locked = 0 then
    raise exception 'There are no approved timesheet entries in this period to lock.' using errcode = 'P0001';
  end if;
  return export_id;
end;
$$;

-- Admin-only correction path; the reason is kept with the export. The caller's
-- password is checked by the application before this runs.
create function public.unlock_timesheets(export_id uuid, worker uuid, unlock_reason text) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ex public.payroll_exports;
  unlocked integer;
  actor uuid := (select auth.uid());
begin
  select * into ex from public.payroll_exports where id = export_id;
  if not found or not private.is_workspace_admin(ex.workspace_id) then
    raise exception 'Only workspace owners and admins can unlock timesheets.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(unlock_reason, ''))) < 3 then
    raise exception 'Give a reason for unlocking.' using errcode = '22023';
  end if;

  perform set_config('harbor.unlocking', 'on', true);
  update public.timesheet_entries
  set status = 'approved', payroll_export_id = null
  where payroll_export_id = ex.id and (worker is null or staff_id = worker);
  get diagnostics unlocked = row_count;
  perform set_config('harbor.unlocking', '', true);

  insert into public.timesheet_unlocks (workspace_id, payroll_export_id, staff_id, reason, entry_count, actor_id, actor_name)
  values (
    ex.workspace_id, ex.id, worker, trim(unlock_reason), unlocked, actor,
    coalesce((select m.display_name from public.workspace_members m where m.workspace_id = ex.workspace_id and m.user_id = actor), '')
  );
  return unlocked;
end;
$$;

-- Invoicing -------------------------------------------------------------------

-- One open invoice per client from their ready billables in a date range.
-- NDIA-managed participants are claimed instead and are skipped.
create function public.invoice_billables(ws uuid, contact_ids uuid[], range_from date, range_to date, due date)
returns table (created_invoice uuid, invoiced_contact uuid)
language plpgsql
set search_path = ''
as $$
declare
  client uuid;
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

    insert into public.invoices (workspace_id, contact_id, currency, memo, due_date)
    values (ws, client, ws_currency, 'Supports delivered ' || to_char(range_from, 'DD Mon YYYY') || ' to ' || to_char(range_to, 'DD Mon YYYY'), due)
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
    invoiced_contact := client;
    return next;
  end loop;
end;
$$;

-- NDIS claims -----------------------------------------------------------------

-- Pulls every ready, NDIA-managed billable in the claim period that hasn't been excluded.
create function public.sync_claim(target uuid) returns integer
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

create function public.create_claim(ws uuid, period_from date, period_to date) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_claim uuid;
begin
  insert into public.claims (workspace_id, period_start, period_end)
  values (ws, period_from, period_to)
  returning id into new_claim;
  perform public.sync_claim(new_claim);
  return new_claim;
end;
$$;

-- Excluding keeps a billable out of this claim (it returns to unbilled); including brings it back.
create function public.set_claim_entries(target uuid, billable_ids uuid[], include boolean) returns void
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

-- Called when the PRODA CSV is downloaded: included entries become Exported.
create function public.mark_claim_exported(target uuid) returns void
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
  update public.billables set status = 'exported' where claim_id = c.id;
  update public.claims set exported_at = now(), export_count = export_count + 1, updated_at = now() where id = c.id;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.save_shift(uuid, uuid, timestamptz, timestamptz, integer, text, text, uuid[], jsonb, text, date)',
    'public.move_shift(uuid, timestamptz, uuid, boolean)',
    'public.set_shift_published(uuid, boolean)',
    'public.publish_shifts(uuid, timestamptz, timestamptz)',
    'public.take_shift(uuid)',
    'public.complete_shift(uuid)',
    'public.reopen_shift(uuid)',
    'public.cancel_shift(uuid, boolean, boolean, public.cancellation_reason)',
    'public.restore_shift(uuid)',
    'public.delete_shift(uuid)',
    'public.update_timesheet_entry(uuid, timestamptz, timestamptz, integer, numeric, text)',
    'public.lock_timesheets(uuid, date, date, uuid)',
    'public.unlock_timesheets(uuid, uuid, text)',
    'public.invoice_billables(uuid, uuid[], date, date, date)',
    'public.sync_claim(uuid)',
    'public.create_claim(uuid, date, date)',
    'public.set_claim_entries(uuid, uuid[], boolean)',
    'public.mark_claim_exported(uuid)'
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
  -- Day-to-day rostering and timesheets are open to every member.
  foreach t in array array['shifts', 'shift_staff', 'shift_clients', 'timesheet_entries', 'billables']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_member(workspace_id)) '
      'with check (private.is_workspace_member(workspace_id))',
      t
    );
  end loop;

  -- Prices, claims, budgets and payroll locks are read by members and changed by admins.
  foreach t in array array[
    'price_book_items', 'finance_settings', 'client_budgets', 'claims', 'claim_exclusions',
    'payroll_exports', 'timesheet_unlocks'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members read %1$s" on public.%1$I for select to authenticated '
      'using (private.is_workspace_member(workspace_id))',
      t
    );
  end loop;
  foreach t in array array['price_book_items', 'finance_settings', 'client_budgets', 'claims', 'claim_exclusions']
  loop
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated '
      'using (private.is_workspace_admin(workspace_id)) '
      'with check (private.is_workspace_admin(workspace_id))',
      t
    );
  end loop;
end;
$$;

create policy "admins lock payroll" on public.payroll_exports
  for insert to authenticated with check (private.is_workspace_admin(workspace_id));
create policy "admins record payroll exports" on public.payroll_exports
  for update to authenticated
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- Pay is visible to admins only.
alter table public.pay_rates enable row level security;
create policy "admins manage pay rates" on public.pay_rates
  for all to authenticated
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'shifts', 'price_book_items', 'finance_settings', 'pay_rates', 'client_budgets',
    'claims', 'payroll_exports', 'timesheet_unlocks'
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
