-- One-time club onboarding state.
--
-- Existing profiles predate this state and are backfilled as completed. New
-- profiles keep the nullable default and complete only after an ACTIVE club
-- membership is inserted or approved. Client profile updates cannot forge the
-- completion timestamp.

begin;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Every profile present when this migration runs is an existing account.
update public.profiles
   set onboarding_completed_at = coalesce(onboarding_completed_at, now());

comment on column public.profiles.onboarding_completed_at is
  'Server-controlled completion time for the one-time first club onboarding.';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.profiles_onboarding_completion_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.onboarding_completed_at is not null then
      raise exception 'ONBOARDING_COMPLETION_SERVER_CONTROLLED';
    end if;
    return new;
  end if;

  if new.onboarding_completed_at is distinct from old.onboarding_completed_at
     and coalesce(
       current_setting('mintondong.onboarding_completion', true),
       ''
     ) <> 'active-membership' then
    raise exception 'ONBOARDING_COMPLETION_SERVER_CONTROLLED';
  end if;
  return new;
end
$$;

revoke all on function private.profiles_onboarding_completion_guard() from public;
revoke execute on function private.profiles_onboarding_completion_guard()
  from anon, authenticated, service_role;

drop trigger if exists trg_profiles_onboarding_completion_guard on public.profiles;
create trigger trg_profiles_onboarding_completion_guard
before insert or update on public.profiles
for each row execute function private.profiles_onboarding_completion_guard();

create or replace function private.complete_onboarding_for_active_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_complete boolean := false;
begin
  if tg_op = 'INSERT' then
    should_complete := new.status = 'active';
  elsif tg_op = 'UPDATE' then
    should_complete := new.status = 'active' and old.status is distinct from new.status;
  end if;

  if new.user_id is not null and should_complete then
    perform set_config(
      'mintondong.onboarding_completion',
      'active-membership',
      true
    );

    update public.profiles
       set onboarding_completed_at = coalesce(onboarding_completed_at, now()),
           updated_at = case
             when onboarding_completed_at is null then now()
             else updated_at
           end
     where id = new.user_id;
  end if;
  return new;
end
$$;

revoke all on function private.complete_onboarding_for_active_membership() from public;
revoke execute on function private.complete_onboarding_for_active_membership()
  from anon, authenticated, service_role;

drop trigger if exists trg_complete_onboarding_for_active_membership
  on public.club_members;
create trigger trg_complete_onboarding_for_active_membership
after insert or update of status on public.club_members
for each row execute function private.complete_onboarding_for_active_membership();

commit;;
