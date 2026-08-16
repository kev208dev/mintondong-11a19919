-- Canonical structured places. This migration is additive and must be reviewed
-- and applied separately; it is intentionally not applied by this change.
begin;

create table if not exists public.app_places (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('KAKAO')),
  provider_place_id text not null,
  name text not null check (char_length(trim(name)) between 1 and 200),
  road_address text,
  jibun_address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  category text,
  place_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_place_id)
);

alter table public.app_places enable row level security;
revoke all on public.app_places from anon, authenticated;

alter table public.guest_offers add column if not exists place_id uuid references public.app_places(id) on delete restrict;
alter table public.guest_offers add column if not exists location_note text;
create index if not exists guest_offers_place_idx on public.guest_offers(place_id);

alter table public.clubs add column if not exists place_id uuid references public.app_places(id) on delete set null;
alter table public.clubs add column if not exists location_note text;

alter table public.tournaments add column if not exists place_id uuid references public.app_places(id) on delete set null;
alter table public.tournaments add column if not exists location_note text;

create or replace function public.require_structured_guest_offer_place()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.place_id is null then
    raise exception 'STRUCTURED_PLACE_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists guest_offer_structured_place_required on public.guest_offers;
create trigger guest_offer_structured_place_required
before insert on public.guest_offers
for each row execute function public.require_structured_guest_offer_place();

revoke all on function public.require_structured_guest_offer_place() from public, anon, authenticated;
grant execute on function public.require_structured_guest_offer_place() to service_role;

commit;
