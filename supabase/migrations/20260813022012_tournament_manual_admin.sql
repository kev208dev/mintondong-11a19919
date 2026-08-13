-- Global tournament administrators and atomic MANUAL tournament management.
-- Additive/soft-delete only: no existing tournament or user row is removed.

begin;

alter table public.profiles
  add column if not exists role text not null default 'USER';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'profiles_role_valid'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_valid check (role in ('USER', 'ADMIN'));
  end if;
end
$$;

-- Profile rows are self-editable in the existing auth model. Replace broad write
-- grants with a column allowlist so a user cannot promote their own role.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, display_name, avatar_url, username, created_at, updated_at)
  on table public.profiles to authenticated;
grant update (display_name, avatar_url, username, updated_at)
  on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

alter table public.tournaments
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz;

-- External sources always have a source URL. A MANUAL tournament homepage is
-- optional, so provenance must be representable without a fake external URL.
alter table public.tournament_sources
  alter column source_url drop not null;

create index if not exists tournaments_active_start_date_idx
  on public.tournaments (start_date)
  where is_active = true;

drop policy if exists "public reads tournaments" on public.tournaments;
create policy "public reads active tournaments"
on public.tournaments for select to anon, authenticated
using (is_active = true);

create or replace function public.create_manual_tournament(
  p_title text,
  p_normalized_title text,
  p_start_date date,
  p_end_date date,
  p_registration_start_date date,
  p_registration_end_date date,
  p_region text,
  p_city text,
  p_venue text,
  p_venue_address text,
  p_scope text,
  p_organizer text,
  p_host text,
  p_entry_fee integer,
  p_poster_url text,
  p_description text,
  p_registration_url text,
  p_source_url text,
  p_bracket_url text,
  p_result_url text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_tournament_id uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  insert into public.tournaments (
    id, title, normalized_title, start_date, end_date,
    registration_start_date, registration_end_date,
    region, city, venue, venue_address, scope, organizer, host, entry_fee,
    poster_url, description, registration_url, bracket_url, result_url,
    last_synced_at, is_active, deactivated_at
  ) values (
    v_tournament_id, btrim(p_title), btrim(p_normalized_title), p_start_date, p_end_date,
    p_registration_start_date, p_registration_end_date,
    btrim(p_region), btrim(p_city), btrim(p_venue), nullif(btrim(p_venue_address), ''),
    p_scope, nullif(btrim(p_organizer), ''), nullif(btrim(p_host), ''), p_entry_fee,
    nullif(btrim(p_poster_url), ''), nullif(btrim(p_description), ''),
    nullif(btrim(p_registration_url), ''), nullif(btrim(p_bracket_url), ''),
    nullif(btrim(p_result_url), ''), v_now, true, null
  );

  insert into public.tournament_sources (
    tournament_id, source, external_id, source_url,
    registration_url, bracket_url, result_url, raw_data, last_synced_at
  ) values (
    v_tournament_id, 'MANUAL', v_tournament_id::text, nullif(btrim(p_source_url), ''),
    nullif(btrim(p_registration_url), ''), nullif(btrim(p_bracket_url), ''),
    nullif(btrim(p_result_url), ''), '{}'::jsonb, v_now
  );

  return v_tournament_id;
end;
$$;

create or replace function public.update_manual_tournament(
  p_tournament_id uuid,
  p_title text,
  p_normalized_title text,
  p_start_date date,
  p_end_date date,
  p_registration_start_date date,
  p_registration_end_date date,
  p_region text,
  p_city text,
  p_venue text,
  p_venue_address text,
  p_scope text,
  p_organizer text,
  p_host text,
  p_entry_fee integer,
  p_poster_url text,
  p_description text,
  p_registration_url text,
  p_source_url text,
  p_bracket_url text,
  p_result_url text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if not exists (
    select 1
      from public.tournament_sources ts
     where ts.tournament_id = p_tournament_id
       and ts.source = 'MANUAL'
  ) then
    raise exception 'manual_tournament_not_found';
  end if;

  update public.tournaments
     set title = btrim(p_title),
         normalized_title = btrim(p_normalized_title),
         start_date = p_start_date,
         end_date = p_end_date,
         registration_start_date = p_registration_start_date,
         registration_end_date = p_registration_end_date,
         region = btrim(p_region),
         city = btrim(p_city),
         venue = btrim(p_venue),
         venue_address = nullif(btrim(p_venue_address), ''),
         scope = p_scope,
         organizer = nullif(btrim(p_organizer), ''),
         host = nullif(btrim(p_host), ''),
         entry_fee = p_entry_fee,
         poster_url = nullif(btrim(p_poster_url), ''),
         description = nullif(btrim(p_description), ''),
         registration_url = nullif(btrim(p_registration_url), ''),
         bracket_url = nullif(btrim(p_bracket_url), ''),
         result_url = nullif(btrim(p_result_url), ''),
         last_synced_at = v_now
   where id = p_tournament_id;

  if not found then
    raise exception 'manual_tournament_not_found';
  end if;

  update public.tournament_sources
     set source_url = nullif(btrim(p_source_url), ''),
         registration_url = nullif(btrim(p_registration_url), ''),
         bracket_url = nullif(btrim(p_bracket_url), ''),
         result_url = nullif(btrim(p_result_url), ''),
         last_synced_at = v_now
   where tournament_id = p_tournament_id
     and source = 'MANUAL';

  return p_tournament_id;
end;
$$;

create or replace function public.set_manual_tournament_active(
  p_tournament_id uuid,
  p_is_active boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.tournament_sources ts
     where ts.tournament_id = p_tournament_id
       and ts.source = 'MANUAL'
  ) then
    raise exception 'manual_tournament_not_found';
  end if;

  update public.tournaments
     set is_active = p_is_active,
         deactivated_at = case when p_is_active then null else now() end,
         last_synced_at = now()
   where id = p_tournament_id;

  if not found then
    raise exception 'manual_tournament_not_found';
  end if;

  update public.tournament_sources
     set last_synced_at = now()
   where tournament_id = p_tournament_id
     and source = 'MANUAL';

  return p_tournament_id;
end;
$$;

revoke all on function public.create_manual_tournament(
  text, text, date, date, date, date, text, text, text, text,
  text, text, text, integer, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_manual_tournament(
  text, text, date, date, date, date, text, text, text, text,
  text, text, text, integer, text, text, text, text, text, text
) to service_role;

revoke all on function public.update_manual_tournament(
  uuid, text, text, date, date, date, date, text, text, text, text,
  text, text, text, integer, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.update_manual_tournament(
  uuid, text, text, date, date, date, date, text, text, text, text,
  text, text, text, integer, text, text, text, text, text, text
) to service_role;

revoke all on function public.set_manual_tournament_active(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_manual_tournament_active(uuid, boolean)
  to service_role;

comment on column public.profiles.role is
  'Global application role. Only service_role can change USER/ADMIN.';
comment on column public.tournaments.is_active is
  'Soft-delete flag. Public tournament queries must only expose true rows.';
comment on function public.create_manual_tournament(
  text, text, date, date, date, date, text, text, text, text,
  text, text, text, integer, text, text, text, text, text, text
) is 'Service-role-only atomic creation of canonical + MANUAL source rows.';

commit;
