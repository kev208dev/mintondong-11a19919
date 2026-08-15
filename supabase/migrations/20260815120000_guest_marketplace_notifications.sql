-- Guest marketplace and user notification inbox.
-- Additive migration only. Apply explicitly to production after review.
begin;

create table if not exists public.guest_offers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  venue_name text not null check (char_length(trim(venue_name)) between 1 and 160),
  address text not null check (char_length(trim(address)) between 1 and 240),
  latitude numeric,
  longitude numeric,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  booking_opens_at timestamptz not null default now(),
  booking_closes_at timestamptz not null,
  capacity integer not null check (capacity between 2 and 200),
  price_per_person integer not null check (price_per_person >= 0),
  platform_fee_bps integer not null default 1000 check (platform_fee_bps between 0 and 5000),
  skill_note text,
  instructions text,
  parking_available boolean not null default false,
  shower_available boolean not null default false,
  shuttlecock_included boolean not null default false,
  cancellation_policy text,
  status text not null default 'draft' check (status in ('draft', 'open', 'full', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (booking_closes_at <= starts_at),
  check (booking_opens_at < booking_closes_at)
);

create index if not exists guest_offers_public_search_idx
  on public.guest_offers (status, starts_at);
create index if not exists guest_offers_club_idx
  on public.guest_offers (club_id, starts_at desc);

create table if not exists public.guest_bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.guest_offers(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  party_size integer not null check (party_size between 2 and 20),
  unit_price integer not null check (unit_price >= 0),
  subtotal_amount integer not null check (subtotal_amount >= 0),
  platform_fee_amount integer not null check (platform_fee_amount >= 0),
  total_amount integer not null check (total_amount = subtotal_amount + platform_fee_amount),
  provider_payout_amount integer not null check (provider_payout_amount >= 0),
  payment_id text,
  status text not null default 'pending' check (status in ('pending', 'payment_pending', 'confirmed', 'cancelled', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists guest_bookings_offer_idx on public.guest_bookings (offer_id, status);
create index if not exists guest_bookings_user_idx on public.guest_bookings (user_id, created_at desc);
create unique index if not exists guest_bookings_active_user_offer_idx
  on public.guest_bookings (offer_id, user_id)
  where status in ('pending', 'payment_pending', 'confirmed');

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

alter table public.payments add column if not exists guest_booking_id uuid references public.guest_bookings(id) on delete set null;
alter table public.payments add column if not exists reference_type text;
alter table public.payments add column if not exists reference_id uuid;
alter table public.payments add column if not exists purpose text;
create index if not exists payments_guest_booking_idx on public.payments (guest_booking_id);

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'payments_portone_order_integrity' and conrelid = 'public.payments'::regclass) then
    alter table public.payments drop constraint payments_portone_order_integrity;
    alter table public.payments add constraint payments_portone_order_integrity check (
      provider::text <> 'PORTONE'
      or (
        portone_payment_id is not null
        and portone_store_id is not null
        and portone_channel_key is not null
        and amount > 0
        and currency = 'KRW'
        and (
          (guest_booking_id is not null and coach_id is null and booking_id is null)
          or (guest_booking_id is null and coach_id is not null and booking_id is null)
        )
        and (user_id is not null or account_deleted_at is not null)
      )
    );
  end if;
end $$;

alter table public.guest_offers enable row level security;
alter table public.guest_bookings enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists guest_offers_public_read on public.guest_offers;
create policy guest_offers_public_read on public.guest_offers
  for select to anon, authenticated
  using (status in ('open', 'full'));

drop policy if exists guest_offers_manager_write on public.guest_offers;
create policy guest_offers_manager_write on public.guest_offers
  for all to authenticated
  using (
    exists (
      select 1 from public.clubs c
      left join public.club_members cm on cm.club_id = c.id and cm.user_id = auth.uid() and cm.status = 'active'
      where c.id = guest_offers.club_id and (c.owner_id = auth.uid() or cm.role in ('owner', 'admin'))
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.clubs c
      left join public.club_members cm on cm.club_id = c.id and cm.user_id = auth.uid() and cm.status = 'active'
      where c.id = guest_offers.club_id and (c.owner_id = auth.uid() or cm.role in ('owner', 'admin'))
    )
  );

drop policy if exists guest_bookings_owner_read on public.guest_bookings;
create policy guest_bookings_owner_read on public.guest_bookings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists guest_bookings_manager_read on public.guest_bookings;
create policy guest_bookings_manager_read on public.guest_bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.guest_offers o
      join public.clubs c on c.id = o.club_id
      left join public.club_members cm on cm.club_id = c.id and cm.user_id = auth.uid() and cm.status = 'active'
      where o.id = guest_bookings.offer_id and (c.owner_id = auth.uid() or cm.role in ('owner', 'admin'))
    )
  );

drop policy if exists user_notifications_owner_read on public.user_notifications;
create policy user_notifications_owner_read on public.user_notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists user_notifications_owner_update on public.user_notifications;
create policy user_notifications_owner_update on public.user_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.guest_offers, public.guest_bookings, public.user_notifications from anon;
grant select on public.guest_offers to anon, authenticated;
grant select on public.guest_bookings to authenticated;
grant select on public.user_notifications to authenticated;
revoke insert, delete, update on public.guest_bookings from authenticated;
revoke insert, delete, update on public.user_notifications from authenticated;
grant update (read_at) on public.user_notifications to authenticated;

create or replace function public.create_guest_booking(p_offer_id uuid, p_party_size integer, p_user_id uuid)
returns public.guest_bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := coalesce(auth.uid(), p_user_id);
  offer_row public.guest_offers;
  booking_row public.guest_bookings;
  reserved integer;
  fee integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if auth.uid() is not null and auth.uid() <> p_user_id then raise exception 'USER_MISMATCH'; end if;
  if p_party_size < 2 or p_party_size > 20 then raise exception 'INVALID_PARTY_SIZE'; end if;
  select * into offer_row from public.guest_offers where id = p_offer_id for update;
  if not found or offer_row.status not in ('open', 'full') then raise exception 'OFFER_NOT_AVAILABLE'; end if;
  if now() < offer_row.booking_opens_at or now() > offer_row.booking_closes_at then raise exception 'BOOKING_CLOSED'; end if;
  select coalesce(sum(party_size), 0) into reserved from public.guest_bookings
   where offer_id = p_offer_id and status in ('pending', 'payment_pending', 'confirmed');
  if reserved + p_party_size > offer_row.capacity then raise exception 'CAPACITY_EXCEEDED'; end if;
  fee := floor((offer_row.price_per_person * p_party_size * offer_row.platform_fee_bps)::numeric / 10000);
  insert into public.guest_bookings (offer_id, user_id, party_size, unit_price, subtotal_amount, platform_fee_amount, total_amount, provider_payout_amount, status)
  values (p_offer_id, uid, p_party_size, offer_row.price_per_person, offer_row.price_per_person * p_party_size, fee, offer_row.price_per_person * p_party_size + fee, offer_row.price_per_person * p_party_size, 'pending')
  returning * into booking_row;
  if reserved + p_party_size = offer_row.capacity then update public.guest_offers set status = 'full', updated_at = now() where id = p_offer_id; end if;
  return booking_row;
exception when unique_violation then
  select * into booking_row from public.guest_bookings
   where offer_id = p_offer_id and user_id = uid and status in ('pending', 'payment_pending', 'confirmed')
   order by created_at desc limit 1;
  if booking_row.id is null then raise exception 'DUPLICATE_BOOKING'; end if;
  return booking_row;
end;
$$;

revoke all on function public.create_guest_booking(uuid, integer, uuid) from public, anon;
grant execute on function public.create_guest_booking(uuid, integer, uuid) to authenticated, service_role;

commit;
