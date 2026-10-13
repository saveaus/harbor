-- Public storefront, payment-link purchases and Stripe Connect payout accounts.

alter table public.workspaces
  add column slug text unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$'),
  add column currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  add column store_enabled boolean not null default false,
  add column store_title text not null default '' check (char_length(store_title) <= 80),
  add column store_description text not null default '' check (char_length(store_description) <= 500);

update public.workspaces
set slug = coalesce(nullif(trim(both '-' from left(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), 36)), ''), 'workspace') || '-' || left(id::text, 6)
where slug is null;

create function private.set_workspace_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null then
    new.slug := coalesce(nullif(trim(both '-' from left(regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'), 36)), ''), 'workspace')
      || '-' || left(new.id::text, 6);
  end if;
  return new;
end;
$$;

create trigger workspaces_set_slug before insert on public.workspaces
  for each row execute function private.set_workspace_slug();

alter table public.workspaces alter column slug set not null;

alter table public.products add column in_store boolean not null default false;

alter table public.invoices add column stripe_checkout_session_id text unique;
alter table public.subscriptions add column stripe_subscription_id text unique;

-- Stripe Connect account per workspace. Kept off `workspaces` because clients can read that row.
create table public.payout_accounts (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  stripe_account_id text not null unique,
  country text not null check (country ~ '^[A-Z]{2}$'),
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;
create policy "members read payout account" on public.payout_accounts
  for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "admins manage payout account" on public.payout_accounts
  for all to authenticated using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- Purchases made through the store or a payment link (buyers may not be contacts yet).
create type public.order_status as enum ('pending', 'paid', 'expired');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  payment_link_id uuid references public.payment_links (id) on delete set null,
  source text not null check (source in ('store', 'link')),
  product_name text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  status public.order_status not null default 'pending',
  customer_email text,
  customer_name text,
  contact_id uuid references public.contacts (id) on delete set null,
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_workspace_idx on public.orders (workspace_id, created_at desc);

alter table public.orders enable row level security;
create policy "members read orders" on public.orders
  for select to authenticated using (private.is_workspace_member(workspace_id));

-- Anonymous storefront read: only enabled stores, only services marked for the store.
create function public.storefront(store_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'workspace_id', w.id,
    'name', w.name,
    'brand_color', w.brand_color,
    'logo_path', w.logo_path,
    'title', w.store_title,
    'description', w.store_description,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'description', p.description,
        'amount_cents', p.amount_cents, 'currency', p.currency, 'billing_interval', p.billing_interval
      ) order by p.name)
      from public.products p
      where p.workspace_id = w.id and p.in_store and not p.archived
    ), '[]'::jsonb)
  )
  from public.workspaces w
  where w.slug = store_slug and w.store_enabled;
$$;

-- Anonymous payment-link read: only active links to unarchived services.
create function public.payment_link(link_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id,
    'workspace_id', w.id,
    'workspace_name', w.name,
    'brand_color', w.brand_color,
    'logo_path', w.logo_path,
    'name', l.name,
    'product', jsonb_build_object(
      'id', p.id, 'name', p.name, 'description', p.description,
      'amount_cents', p.amount_cents, 'currency', p.currency, 'billing_interval', p.billing_interval
    )
  )
  from public.payment_links l
  join public.products p on p.id = l.product_id and not p.archived
  join public.workspaces w on w.id = l.workspace_id
  where l.id = link_id and l.active;
$$;

revoke all on function public.storefront(text) from public;
revoke all on function public.payment_link(uuid) from public;
grant execute on function public.storefront(text) to anon, authenticated;
grant execute on function public.payment_link(uuid) to anon, authenticated;
