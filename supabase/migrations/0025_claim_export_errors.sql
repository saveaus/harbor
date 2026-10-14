-- Remembers the last PRODA export refusal so the office home can list it
-- until a later export succeeds.

alter table public.claims
  add column export_error text not null default '' check (char_length(export_error) <= 2000);
