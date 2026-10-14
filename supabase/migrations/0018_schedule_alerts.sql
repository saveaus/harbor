-- Roster alerts: a worker who hasn't checked in 15 minutes after their shift
-- starts, and an open shift nobody has taken 4 hours after it entered the pool.
-- pg_cron raises them every five minutes as in-app notifications. When the
-- vault holds `harbor_alerts_url` and `harbor_cron_secret`, pg_net also asks
-- the app to email workspace admins.

create table public.schedule_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null check (kind in ('late_check_in', 'pool_unfilled')),
  shift_id uuid references public.shifts (id) on delete cascade,
  title text not null,
  body text not null default '',
  href text not null default '',
  created_at timestamptz not null default now(),
  emailed_at timestamptz
);

create index schedule_alerts_unsent_idx on public.schedule_alerts (created_at) where emailed_at is null;

alter table public.schedule_alerts enable row level security;
create policy "members read schedule_alerts" on public.schedule_alerts
  for select to authenticated using (private.is_workspace_member(workspace_id));

create function private.raise_schedule_alerts() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  raised integer;
begin
  with late as (
    update public.timesheet_entries e
    set late_alerted_at = now()
    from public.shifts s
    where s.id = e.shift_id and s.status = 'published' and e.checked_in_at is null and e.late_alerted_at is null
      and now() >= s.starts_at + interval '15 minutes' and now() < s.ends_at
    returning e.workspace_id, e.staff_id, s.id as shift_id, s.starts_at
  ),
  late_alerts as (
    select l.workspace_id, 'late_check_in' as kind, l.shift_id,
      trim(st.first_name || ' ' || st.last_name) || ' hasn''t checked in' as title,
      'Their shift started at ' || to_char(l.starts_at at time zone w.timezone, 'FMHH12:MIam') || ' on '
        || to_char(l.starts_at at time zone w.timezone, 'Dy DD Mon') || '.' as body,
      '/schedule/shifts/' || l.shift_id as href
    from late l
    join public.staff st on st.id = l.staff_id
    join public.workspaces w on w.id = l.workspace_id
  ),
  unfilled as (
    update public.shifts s
    set pool_alerted_at = now()
    where s.status = 'published' and s.pool_since <= now() - interval '4 hours' and s.pool_alerted_at is null
      and s.starts_at > now()
    returning s.workspace_id, s.id, s.starts_at
  ),
  pool_alerts as (
    select u.workspace_id, 'pool_unfilled' as kind, u.id as shift_id,
      'An open shift hasn''t been taken' as title,
      'The shift on ' || to_char(u.starts_at at time zone w.timezone, 'Dy DD Mon "at" FMHH12:MIam')
        || ' has been in the shift pool for 4 hours.' as body,
      '/schedule/shifts/' || u.id as href
    from unfilled u
    join public.workspaces w on w.id = u.workspace_id
  ),
  alerts as (
    insert into public.schedule_alerts (workspace_id, kind, shift_id, title, body, href)
    select * from late_alerts union all select * from pool_alerts
    returning workspace_id, title, body, href
  )
  insert into public.notifications (workspace_id, title, body, href)
  select workspace_id, title, body, href from alerts;
  get diagnostics raised = row_count;
  return raised;
end;
$$;

-- Asks the app to email any alerts it hasn't sent, when the vault is configured.
create function private.dispatch_schedule_alerts() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
begin
  if private.raise_schedule_alerts() = 0 and not exists (select 1 from public.schedule_alerts where emailed_at is null) then
    return;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') or to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into url using 'harbor_alerts_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into secret using 'harbor_cron_secret';
  if url is null or secret is null then
    return;
  end if;
  execute 'select net.http_post(url := $1, headers := $2, body := ''{}''::jsonb)'
    using url, jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json');
end;
$$;

revoke all on function private.raise_schedule_alerts() from public, anon, authenticated;
revoke all on function private.dispatch_schedule_alerts() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from pg_available_extensions where name = 'pg_net') then
      create extension if not exists pg_net;
    end if;
    execute $cron$select cron.schedule('harbor-schedule-alerts', '*/5 * * * *', 'select private.dispatch_schedule_alerts()')$cron$;
  end if;
end;
$$;
