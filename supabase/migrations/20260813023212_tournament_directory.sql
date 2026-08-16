-- Tournament directory, source provenance, and per-user favorites.
-- Additive only: this migration does not delete or rewrite existing production data.

begin;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  normalized_title text not null check (btrim(normalized_title) <> ''),
  start_date date not null,
  end_date date not null,
  registration_start_date date,
  registration_end_date date,
  region text,
  city text,
  venue text,
  venue_address text,
  scope text not null default 'LOCAL' check (scope in ('NATIONAL', 'LOCAL')),
  organizer text,
  host text,
  entry_fee integer check (entry_fee is null or entry_fee >= 0),
  poster_url text,
  description text,
  registration_url text,
  bracket_url text,
  result_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  constraint tournaments_date_order check (start_date <= end_date),
  constraint tournaments_registration_date_order check (
    registration_start_date is null
    or registration_end_date is null
    or registration_start_date <= registration_end_date
  )
);

create table if not exists public.tournament_sources (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  source text not null check (source in ('FACECOCK', 'COURTX', 'BKPLAY', 'KOC', 'MANUAL')),
  external_id text not null check (btrim(external_id) <> ''),
  source_url text not null check (btrim(source_url) <> ''),
  registration_url text,
  bracket_url text,
  result_url text,
  raw_data jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create table if not exists public.tournament_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, tournament_id)
);

create table if not exists public.tournament_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('FACECOCK', 'COURTX', 'BKPLAY', 'KOC', 'MANUAL')),
  success boolean not null,
  fetched_count integer not null default 0 check (fetched_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  error_code text,
  started_at timestamptz not null,
  finished_at timestamptz not null default now()
);

create index if not exists tournaments_start_date_idx on public.tournaments (start_date);
create index if not exists tournaments_registration_end_date_idx
  on public.tournaments (registration_end_date);
create index if not exists tournaments_region_city_idx on public.tournaments (region, city);
create index if not exists tournaments_dedup_idx
  on public.tournaments (normalized_title, start_date, region, city);
create index if not exists tournament_sources_tournament_id_idx
  on public.tournament_sources (tournament_id);
create index if not exists tournament_favorites_tournament_id_idx
  on public.tournament_favorites (tournament_id);
create index if not exists tournament_sync_runs_started_at_idx
  on public.tournament_sync_runs (started_at desc);

create or replace function public.set_tournament_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_tournament_updated_at() from public, anon, authenticated;

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_tournament_updated_at();

drop trigger if exists tournament_sources_set_updated_at on public.tournament_sources;
create trigger tournament_sources_set_updated_at
before update on public.tournament_sources
for each row execute function public.set_tournament_updated_at();

alter table public.tournaments enable row level security;
alter table public.tournament_sources enable row level security;
alter table public.tournament_favorites enable row level security;
alter table public.tournament_sync_runs enable row level security;

drop policy if exists "public reads tournaments" on public.tournaments;
create policy "public reads tournaments"
on public.tournaments for select to anon, authenticated
using (true);

drop policy if exists "users read own tournament favorites" on public.tournament_favorites;
create policy "users read own tournament favorites"
on public.tournament_favorites for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users add own tournament favorites" on public.tournament_favorites;
create policy "users add own tournament favorites"
on public.tournament_favorites for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users remove own tournament favorites" on public.tournament_favorites;
create policy "users remove own tournament favorites"
on public.tournament_favorites for delete to authenticated
using ((select auth.uid()) = user_id);

-- Source raw_data and sync logs remain service-role-only. Public APIs return an explicit safe projection.
revoke all on table public.tournaments from public, anon, authenticated;
grant select on table public.tournaments to anon, authenticated;

revoke all on table public.tournament_sources from public, anon, authenticated;
revoke all on table public.tournament_sync_runs from public, anon, authenticated;

revoke all on table public.tournament_favorites from public, anon, authenticated;
grant select, insert, delete on table public.tournament_favorites to authenticated;

grant all on table public.tournaments to service_role;
grant all on table public.tournament_sources to service_role;
grant all on table public.tournament_favorites to service_role;
grant all on table public.tournament_sync_runs to service_role;

comment on table public.tournaments is
  'Canonical tournament records. Current status is derived from date-only columns in application code.';
comment on table public.tournament_sources is
  'External-source provenance. raw_data is never granted to browser roles.';
comment on table public.tournament_sync_runs is
  'Server-only bounded collector run log; no secret or response body is stored.';

commit;
;
