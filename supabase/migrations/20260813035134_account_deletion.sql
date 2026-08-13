-- Store release account deletion support.
--
-- The Auth user deletion itself is still initiated through supabase.auth.admin.deleteUser()
-- from the Worker. This migration makes the database side atomic with that Auth deletion:
-- a BEFORE DELETE trigger blocks club owners, anonymizes membership rows, detaches retained
-- payment records, and removes non-retained per-user data in the same transaction.
--
-- Additive only. No table is recreated and no existing account is changed when this runs.

begin;

alter table public.payments
  add column if not exists account_deleted_at timestamptz;

-- A PortOne payment remains a valid accounting record after its account is deleted. The
-- user_id is detached, while account_deleted_at records why the otherwise-required user_id
-- is absent. All other PortOne order integrity requirements remain unchanged.
do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'payments_portone_order_integrity'
       and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments drop constraint payments_portone_order_integrity;
  end if;
end
$$;

alter table public.payments
  add constraint payments_portone_order_integrity check (
    provider::text <> 'PORTONE'
    or (
      portone_payment_id is not null
      and coach_id is not null
      and portone_store_id is not null
      and portone_channel_key is not null
      and amount > 0
      and currency = 'KRW'
      and booking_id is null
      and (user_id is not null or account_deleted_at is not null)
    )
  );

comment on column public.payments.account_deleted_at is
  'Account deletion timestamp. The payment is retained without a direct Auth user link for legal/accounting handling.';

-- The existing guard intentionally treats membership identity as immutable. Account deletion
-- is the sole exception: the Auth deletion trigger sets a transaction-local marker, then removes
-- the user link and visible name while retaining the row required by bookings and match history.
create or replace function public.club_members_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  club_owner uuid;
  is_owner boolean;
  club_public boolean;
  expected_status text;
  deleting_user_id uuid;
begin
  begin
    deleting_user_id := nullif(
      current_setting('mintondong.account_deletion_user_id', true),
      ''
    )::uuid;
  exception when others then
    deleting_user_id := null;
  end;

  select owner_id, is_public into club_owner, club_public
    from public.clubs
   where id = new.club_id;
  is_owner := (club_owner is not null and club_owner = uid);

  if new.role = 'owner' and (new.user_id is null or new.user_id <> club_owner) then
    raise exception 'owner role is reserved for the club owner';
  end if;
  if new.role = 'owner' and new.status <> 'active' then
    raise exception 'club owner membership must stay active';
  end if;

  if tg_op = 'INSERT' then
    if uid is null then
      return new;
    end if;

    if is_owner and new.user_id = uid and new.role = 'owner' and new.status = 'active'
       and new.is_guest = false and new.invited_by is null then
      return new;
    end if;

    expected_status := case when club_public then 'active' else 'pending' end;
    if new.user_id = uid and new.role = 'member' and new.status = expected_status
       and new.is_guest = false and new.invited_by is null then
      return new;
    end if;

    raise exception 'club membership inserts must use an approved RPC';
  end if;

  if deleting_user_id is not null
     and old.user_id = deleting_user_id
     and new.user_id is null
     and old.role <> 'owner'
     and new.role = 'member'
     and new.status = 'pending'
     and new.name = '탈퇴한 회원'
     and new.id = old.id
     and new.club_id = old.club_id
     and new.is_guest = old.is_guest
     and new.invited_by is not distinct from old.invited_by
     and new.created_at = old.created_at
     and new.joined_at = old.joined_at then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.club_id is distinct from old.club_id
     or new.user_id is distinct from old.user_id
     or new.is_guest is distinct from old.is_guest
     or new.invited_by is distinct from old.invited_by
     or new.created_at is distinct from old.created_at
     or new.joined_at is distinct from old.joined_at then
    raise exception 'membership identity and relationship fields are immutable';
  end if;

  if (old.role = 'owner' or old.user_id = club_owner)
     and (new.role <> 'owner' or new.status <> 'active') then
    raise exception 'club owner membership cannot be demoted or deactivated';
  end if;

  if uid is null then
    return new;
  end if;

  if not is_owner then
    raise exception 'direct member updates are not allowed';
  end if;
  if new.name is distinct from old.name
     or new.level is distinct from old.level
     or new.gender is distinct from old.gender
     or new.games is distinct from old.games
     or new.wins is distinct from old.wins then
    raise exception 'only role and status can be changed by the member state RPC';
  end if;

  return new;
end
$$;

revoke all on function public.club_members_guard() from public, anon, authenticated, service_role;

create or replace function public.account_deletion_preflight(p_user_id uuid)
returns table (
  can_delete boolean,
  blocker_code text,
  owned_club_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) = 0,
    case when count(*) > 0 then 'ACCOUNT_OWNS_CLUB' else null end,
    count(*)::integer
  from public.clubs
  where owner_id = p_user_id
$$;

revoke all on function public.account_deletion_preflight(uuid)
  from public, anon, authenticated;
grant execute on function public.account_deletion_preflight(uuid) to service_role;

create or replace function public.handle_auth_user_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.clubs where owner_id = old.id) then
    raise exception 'ACCOUNT_OWNS_CLUB'
      using hint = 'Transfer club ownership before deleting the account.';
  end if;

  perform set_config('mintondong.account_deletion_user_id', old.id::text, true);

  update public.payments
     set user_id = null,
         account_deleted_at = coalesce(account_deleted_at, now()),
         updated_at = now()
   where user_id = old.id;

  update public.club_members
     set user_id = null,
         name = '탈퇴한 회원',
         role = 'member',
         status = 'pending',
         updated_at = now()
   where user_id = old.id;

  update public.match_videos
     set uploaded_by = null,
         updated_at = now()
   where uploaded_by = old.id;

  delete from public.tournament_favorites where user_id = old.id;
  delete from public.profiles where id = old.id;

  return old;
end
$$;

revoke all on function public.handle_auth_user_deletion()
  from public, anon, authenticated, service_role;

drop trigger if exists before_auth_user_delete_mintondong on auth.users;
create trigger before_auth_user_delete_mintondong
before delete on auth.users
for each row execute function public.handle_auth_user_deletion();

commit;
