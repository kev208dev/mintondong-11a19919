-- Club membership is an approval workflow.
-- Additive schema/RPC change. Apply explicitly after review; this file is not
-- applied to production by the application or by this change.
begin;

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_join_requests_club_status_idx
  on public.club_join_requests (club_id, status, created_at desc);
create index if not exists club_join_requests_user_idx
  on public.club_join_requests (user_id, created_at desc);
create unique index if not exists club_join_requests_pending_unique_idx
  on public.club_join_requests (club_id, user_id)
  where status = 'pending';

-- Preserve old private-club pending memberships as review requests. No row is deleted.
insert into public.club_join_requests (club_id, user_id, status, created_at, updated_at)
select cm.club_id, cm.user_id, 'pending', cm.created_at, cm.updated_at
from public.club_members cm
where cm.user_id is not null
  and cm.status = 'pending'
on conflict do nothing;

alter table public.club_join_requests enable row level security;
revoke all on public.club_join_requests from anon, authenticated;
grant select, insert, update on public.club_join_requests to authenticated;

create or replace function public.club_has_permission(p_club_id uuid, p_permission text, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.clubs c
    where c.id = p_club_id and c.owner_id = p_user_id
  )
  or exists (
    select 1
    from public.club_members cm
    join public.member_roles mr on mr.member_id = cm.id and mr.club_id = cm.club_id
    join public.club_roles cr on cr.id = mr.role_id and cr.club_id = mr.club_id
    where cm.club_id = p_club_id
      and cm.user_id = p_user_id
      and cm.status = 'active'
      and p_permission = any(cr.permissions)
  );
$$;
revoke all on function public.club_has_permission(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.club_has_permission(uuid, text, uuid) to authenticated;

drop policy if exists club_join_requests_owner_or_reviewer_read on public.club_join_requests;
create policy club_join_requests_owner_or_reviewer_read on public.club_join_requests
  for select to authenticated
  using (user_id = auth.uid() or public.club_has_permission(club_id, 'MANAGE_MEMBERS'));

drop policy if exists club_join_requests_self_insert on public.club_join_requests;
create policy club_join_requests_self_insert on public.club_join_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null);

drop policy if exists club_join_requests_self_cancel on public.club_join_requests;
create policy club_join_requests_self_cancel on public.club_join_requests
  for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled' and reviewed_by is null and reviewed_at is null);

-- The existing guard protects direct membership writes. This transaction-local marker
-- is only set by the approval RPC below, so a browser cannot use it to bypass approval.
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
  approved_change boolean := current_setting('mintondong.approved_membership_change', true) = '1';
begin
  begin
    deleting_user_id := nullif(current_setting('mintondong.account_deletion_user_id', true), '')::uuid;
  exception when others then
    deleting_user_id := null;
  end;

  select owner_id, is_public into club_owner, club_public from public.clubs where id = new.club_id;
  is_owner := (club_owner is not null and club_owner = uid);

  if new.role = 'owner' and (new.user_id is null or new.user_id <> club_owner) then
    raise exception 'owner role is reserved for the club owner';
  end if;
  if new.role = 'owner' and new.status <> 'active' then
    raise exception 'club owner membership must stay active';
  end if;

  if tg_op = 'INSERT' then
    if approved_change then return new; end if;
    if uid is null then return new; end if;
    if is_owner and new.user_id = uid and new.role = 'owner' and new.status = 'active'
       and new.is_guest = false and new.invited_by is null then return new; end if;
    expected_status := case when club_public then 'active' else 'pending' end;
    if new.user_id = uid and new.role = 'member' and new.status = expected_status
       and new.is_guest = false and new.invited_by is null then return new; end if;
    raise exception 'club membership inserts must use an approved RPC';
  end if;

  if deleting_user_id is not null
     and old.user_id = deleting_user_id and new.user_id is null and old.role <> 'owner'
     and new.role = 'member' and new.status = 'pending' and new.name = '탈퇴한 회원'
     and new.id = old.id and new.club_id = old.club_id and new.is_guest = old.is_guest
     and new.invited_by is not distinct from old.invited_by and new.created_at = old.created_at
     and new.joined_at = old.joined_at then return new; end if;

  if approved_change
     and old.id = new.id and old.club_id = new.club_id and old.user_id = new.user_id
     and old.role = 'member' and new.role = 'member'
     and old.status = 'pending' and new.status = 'active' then return new; end if;

  if new.id is distinct from old.id or new.club_id is distinct from old.club_id
     or new.user_id is distinct from old.user_id or new.is_guest is distinct from old.is_guest
     or new.invited_by is distinct from old.invited_by or new.created_at is distinct from old.created_at
     or new.joined_at is distinct from old.joined_at then
    raise exception 'membership identity and relationship fields are immutable';
  end if;
  if (old.role = 'owner' or old.user_id = club_owner)
     and (new.role <> 'owner' or new.status <> 'active') then
    raise exception 'club owner membership cannot be demoted or deactivated';
  end if;
  if uid is null or approved_change then return new; end if;
  if not is_owner then raise exception 'direct member updates are not allowed'; end if;
  if new.name is distinct from old.name or new.level is distinct from old.level
     or new.gender is distinct from old.gender or new.games is distinct from old.games
     or new.wins is distinct from old.wins then
    raise exception 'only role and status can be changed by the member state RPC';
  end if;
  return new;
end;
$$;
revoke all on function public.club_members_guard() from public, anon, authenticated, service_role;

drop function if exists public.request_club_join(uuid);
create function public.request_club_join(p_club_id uuid, p_message text default null)
returns public.club_join_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  result public.club_join_requests;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.clubs where id = p_club_id) then
    raise exception 'CLUB_NOT_FOUND';
  end if;
  if exists (select 1 from public.club_members where club_id = p_club_id and user_id = uid and status = 'active') then
    raise exception 'ALREADY_MEMBER';
  end if;
  select * into result from public.club_join_requests
   where club_id = p_club_id and user_id = uid and status = 'pending';
  if result.id is not null then return result; end if;

  insert into public.club_join_requests (club_id, user_id, message)
  values (p_club_id, uid, nullif(left(trim(coalesce(p_message, '')), 500), ''))
  returning * into result;

  -- Notify only members who can review applications, with a per-request dedupe key.
  insert into public.user_notifications (user_id, type, title, body, deep_link, metadata, dedupe_key)
  select recipient.user_id, 'club_join_request', '새 가입 신청이 있어요',
         coalesce((select display_name from public.profiles where id = uid), '새 회원') || ' · ' || c.name,
         '/club/members', jsonb_build_object('club_id', c.id, 'request_id', result.id),
         'club-join-request:' || result.id || ':' || recipient.user_id
  from public.clubs c
  join lateral (
    select c.owner_id as user_id
    union
    select cm.user_id
    from public.club_members cm
    join public.member_roles mr on mr.member_id = cm.id and mr.club_id = cm.club_id
    join public.club_roles cr on cr.id = mr.role_id and cr.club_id = mr.club_id
    where cm.club_id = c.id and cm.status = 'active' and cm.user_id is not null
      and 'MANAGE_MEMBERS' = any(cr.permissions)
  ) recipient on true
  where c.id = p_club_id and recipient.user_id is not null
  on conflict (user_id, dedupe_key) do nothing;

  return result;
end;
$$;

create or replace function public.cancel_club_join_request(p_request_id uuid)
returns public.club_join_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare result public.club_join_requests;
begin
  update public.club_join_requests set status = 'cancelled', updated_at = now()
   where id = p_request_id and user_id = auth.uid() and status = 'pending'
   returning * into result;
  if result.id is null then raise exception 'REQUEST_NOT_CANCELLABLE'; end if;
  return result;
end;
$$;

create or replace function public.request_club_join_by_code(p_invite_code text, p_message text default null)
returns public.club_join_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare target_club uuid;
begin
  select id into target_club from public.clubs
   where upper(invite_code) = upper(trim(p_invite_code)) limit 1;
  if target_club is null then raise exception 'CLUB_INVITE_NOT_FOUND'; end if;
  return public.request_club_join(target_club, p_message);
end;
$$;

create or replace function public.list_club_join_requests(p_club_id uuid)
returns table (id uuid, club_id uuid, user_id uuid, status text, message text, reviewed_by uuid,
               reviewed_at timestamptz, created_at timestamptz, updated_at timestamptz,
               display_name text, username text)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.club_has_permission(p_club_id, 'MANAGE_MEMBERS') then raise exception 'FORBIDDEN'; end if;
  return query
    select r.id, r.club_id, r.user_id, r.status, r.message, r.reviewed_by, r.reviewed_at,
           r.created_at, r.updated_at, p.display_name, p.username
    from public.club_join_requests r
    left join public.profiles p on p.id = r.user_id
    where r.club_id = p_club_id and r.status = 'pending'
    order by r.created_at asc;
end;
$$;

create or replace function public.review_club_join_request(p_request_id uuid, p_decision text)
returns public.club_join_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  request_row public.club_join_requests;
  member_row public.club_members;
  club_row public.clubs;
  applicant_name text;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'INVALID_DECISION'; end if;
  select * into request_row from public.club_join_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if not public.club_has_permission(request_row.club_id, 'MANAGE_MEMBERS', uid) then raise exception 'FORBIDDEN'; end if;
  if request_row.status <> 'pending' then return request_row; end if;
  select * into club_row from public.clubs where id = request_row.club_id;
  select nullif(display_name, '') into applicant_name from public.profiles where id = request_row.user_id;

  if p_decision = 'approved' then
    perform set_config('mintondong.approved_membership_change', '1', true);
    select * into member_row from public.club_members where club_id = request_row.club_id and user_id = request_row.user_id for update;
    if member_row.id is null then
      insert into public.club_members (club_id, user_id, name, role, status)
      values (request_row.club_id, request_row.user_id, coalesce(applicant_name, '회원'), 'member', 'active');
    elsif member_row.status <> 'active' then
      update public.club_members set status = 'active', updated_at = now(), joined_at = coalesce(joined_at, now()) where id = member_row.id;
    end if;
  end if;

  update public.club_join_requests
     set status = p_decision, reviewed_by = uid, reviewed_at = now(), updated_at = now()
   where id = request_row.id
   returning * into request_row;

  insert into public.user_notifications (user_id, type, title, body, deep_link, metadata, dedupe_key)
  values (
    request_row.user_id,
    case when p_decision = 'approved' then 'club_join_approved' else 'club_join_rejected' end,
    case when p_decision = 'approved' then '동호회 가입이 승인됐어요' else '동호회 가입 신청이 거절됐어요' end,
    coalesce(club_row.name, '동호회'), '/clubs/' || request_row.club_id,
    jsonb_build_object('club_id', request_row.club_id, 'request_id', request_row.id),
    'club-join-result:' || request_row.id || ':' || p_decision
  ) on conflict (user_id, dedupe_key) do nothing;
  return request_row;
end;
$$;

revoke all on function public.request_club_join(uuid, text) from public, anon;
grant execute on function public.request_club_join(uuid, text) to authenticated;
revoke all on function public.cancel_club_join_request(uuid) from public, anon;
grant execute on function public.cancel_club_join_request(uuid) to authenticated;
revoke all on function public.request_club_join_by_code(text, text) from public, anon;
grant execute on function public.request_club_join_by_code(text, text) to authenticated;
revoke all on function public.list_club_join_requests(uuid) from public, anon;
grant execute on function public.list_club_join_requests(uuid) to authenticated;
revoke all on function public.review_club_join_request(uuid, text) from public, anon;
grant execute on function public.review_club_join_request(uuid, text) to authenticated;

commit;
