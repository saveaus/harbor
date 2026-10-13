-- Client portal look and home page, plus the team's getting-started checklist.

alter table public.workspaces
  add column portal_sidebar_color text not null default '#f7f7f8'
    check (portal_sidebar_color ~ '^#[0-9a-fA-F]{6}$'),
  add column portal_banner_path text,
  add column portal_home_title text not null default ''
    check (char_length(portal_home_title) <= 120),
  add column portal_home_show_tasks boolean not null default true,
  add column portal_home_show_apps boolean not null default true,
  add column getting_started_dismissed boolean not null default false;

-- Applied separately as "portal_home_body".
alter table public.workspaces
  add column portal_home_body text not null default ''
    check (char_length(portal_home_body) <= 1000);
