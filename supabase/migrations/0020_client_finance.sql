-- Client bank and in-trust-for details are for owners and admins only, like staff finance.

create table public.client_finance (
  contact_id uuid primary key references public.contacts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bank_account_name text not null default '' check (char_length(bank_account_name) <= 80),
  bank_bsb text not null default '' check (bank_bsb ~ '^([0-9]{6})?$'),
  bank_account_number text not null default '' check (bank_account_number ~ '^[0-9]{0,10}$'),
  in_trust_for text not null default '' check (char_length(in_trust_for) <= 120),
  updated_at timestamptz not null default now()
);

alter table public.client_finance enable row level security;
create policy "admins manage client finance" on public.client_finance for all to authenticated
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

create trigger record_audit_event after insert or update or delete on public.client_finance
  for each row execute function private.record_audit_event();

insert into public.client_finance (contact_id, workspace_id, bank_account_name, bank_bsb, bank_account_number)
select contact_id, workspace_id, bank_account_name, bank_bsb, bank_account_number
from public.client_profiles
where bank_account_name <> '' or bank_bsb <> '' or bank_account_number <> '';

alter table public.client_profiles
  drop column bank_account_name,
  drop column bank_bsb,
  drop column bank_account_number;
