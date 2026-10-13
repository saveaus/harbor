-- AI app builder conversation, kept per custom app so edits can build on earlier turns.

create type public.app_builder_role as enum ('user', 'assistant');

create table public.custom_app_messages (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.custom_apps (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role public.app_builder_role not null,
  content text not null check (char_length(content) between 1 and 4000),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index custom_app_messages_app_idx on public.custom_app_messages (app_id, created_at);

alter table public.custom_app_messages enable row level security;

create policy "members manage custom_app_messages" on public.custom_app_messages for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
