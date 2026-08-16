-- User notification inbox for release MVP.
-- Additive only: no existing rows are rewritten or removed.
begin;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (char_length(trim(type)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text not null check (char_length(trim(body)) between 1 and 500),
  deep_link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_created_idx
  on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_read_idx
  on public.user_notifications (user_id, read_at);
create unique index if not exists user_notifications_dedupe_idx
  on public.user_notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_owner_read on public.user_notifications;
create policy user_notifications_owner_read on public.user_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_notifications_owner_update on public.user_notifications;
create policy user_notifications_owner_update on public.user_notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.user_notifications from anon;
revoke insert, delete, update on public.user_notifications from authenticated;
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;

commit;
