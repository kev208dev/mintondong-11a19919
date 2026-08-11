-- ============================================================================
-- 민턴동 (Supabase project ref: tkumfwiomcxkdbzljyss)
-- 1) profiles.username (로그인 아이디) 추가 + 정규화/예약어 방어
-- 2) 가입 트리거를 모든 provider (email/kakao/google/apple) 에서 동작하게 정리
-- 3) username 관련 RPC (가용성 검사 / 온보딩 claim / 서버 전용 email 조회)
-- 4) 동호회 운영 데이터 RLS 를 최소 권한 원칙으로 세분화
-- 5) SECURITY DEFINER helper 함수 search_path / 실행 권한 정리
--
-- 이 파일은 스키마를 새로 만들지 않고 기존 스키마 위에서 idempotent 하게 동작한다.
-- Supabase Dashboard > SQL Editor 에 붙여 넣고 한 번 실행하면 된다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles.username
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_key on public.profiles (username);

create or replace function public.normalize_username(_username text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(lower(btrim(coalesce(_username, ''))), '')
$$;

create or replace function public.username_is_reserved(_username text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.normalize_username(_username) in (
    'admin','administrator','root','system','mintondong','support','help','api'
  )
$$;

create or replace function public.assert_valid_username(_username text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := public.normalize_username(_username);
begin
  if v is null then
    return null;
  end if;
  if v !~ '^[a-z0-9_]{4,20}$' then
    raise exception 'invalid_username' using hint = '아이디는 영문 소문자, 숫자, _ 조합 4~20자여야 합니다.';
  end if;
  if public.username_is_reserved(v) then
    raise exception 'reserved_username' using hint = '사용할 수 없는 아이디입니다.';
  end if;
  return v;
end;
$$;

-- 저장 직전에 항상 소문자/trim 정규화 + 검증
create or replace function public.profiles_normalize_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.username := public.assert_valid_username(new.username);
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_username on public.profiles;
create trigger trg_profiles_normalize_username
before insert or update of username on public.profiles
for each row execute function public.profiles_normalize_username();

-- ---------------------------------------------------------------------------
-- 2. auth.users -> profiles 자동 생성 (모든 provider 공통, upsert)
--    username 은 자동 생성하지 않는다 (사용자가 직접 선택 / 온보딩).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := public.assert_valid_username(new.raw_user_meta_data ->> 'username');
  v_name text := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  v_avatar text := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture',
    ''
  )), '');
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (new.id, v_name, v_avatar, v_username)
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. username RPC
-- ---------------------------------------------------------------------------
-- (a) 가입/온보딩 화면에서 아이디 사용 가능 여부만 확인 (비밀번호/이메일 노출 없음)
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  begin
    v := public.assert_valid_username(p_username);
  exception when others then
    return false;
  end;
  if v is null then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = v);
end;
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated, service_role;

-- (b) 소셜 로그인 사용자의 아이디 최초 설정 (이미 있으면 변경 불가)
create or replace function public.claim_username(p_username text, p_display_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v text := public.assert_valid_username(p_username);
  v_current text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if v is null then
    raise exception 'invalid_username';
  end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;
  select username into v_current from public.profiles where id = v_uid;
  if v_current is not null and v_current <> v then
    raise exception 'username_already_set';
  end if;

  update public.profiles
     set username = v,
         display_name = coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), display_name),
         updated_at = now()
   where id = v_uid;

  return v;
exception when unique_violation then
  raise exception 'username_taken';
end;
$$;

revoke all on function public.claim_username(text, text) from public;
grant execute on function public.claim_username(text, text) to authenticated, service_role;

-- (c) 서버(service_role) 전용: username -> auth 계정 이메일.
--     브라우저/anon/authenticated 에게는 절대 노출하지 않는다 (계정 열거 방지).
create or replace function public.auth_email_for_username(p_username text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text := public.normalize_username(p_username);
  v_email text;
begin
  if v is null then
    return null;
  end if;
  select u.email into v_email
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.username = v
   limit 1;
  return v_email;
end;
$$;

revoke all on function public.auth_email_for_username(text) from public;
revoke all on function public.auth_email_for_username(text) from anon, authenticated;
grant execute on function public.auth_email_for_username(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. RLS helper 함수 (search_path 고정 + 최소 노출)
-- ---------------------------------------------------------------------------
create or replace function public.is_club_member(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clubs c
     where c.id = _club_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.club_members m
     where m.club_id = _club_id
       and m.user_id = auth.uid()
       and coalesce(m.status, 'active') = 'active'
  )
$$;

create or replace function public.is_club_owner(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clubs c
     where c.id = _club_id and c.owner_id = auth.uid()
  )
$$;

-- 관리자/owner: 동호회 설정, 회원/역할/재정 관리, 주요 데이터 삭제
create or replace function public.is_club_admin(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_club_owner(_club_id) or exists (
    select 1 from public.club_members m
     where m.club_id = _club_id
       and m.user_id = auth.uid()
       and coalesce(m.status, 'active') = 'active'
       and coalesce(m.role, 'member') in ('owner', 'admin')
  )
$$;

-- 운영진: 관리자 + 동호회 역할(member_roles)이 부여된 회원
create or replace function public.is_club_staff(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_club_admin(_club_id) or exists (
    select 1
      from public.member_roles mr
      join public.club_members m on m.id = mr.member_id
     where mr.club_id = _club_id
       and m.user_id = auth.uid()
       and coalesce(m.status, 'active') = 'active'
  )
$$;

-- 현재 로그인 사용자의 해당 동호회 회원 레코드 id
create or replace function public.my_member_id(_club_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
    from public.club_members m
   where m.club_id = _club_id
     and m.user_id = auth.uid()
   order by (coalesce(m.status, 'active') = 'active') desc
   limit 1
$$;

revoke all on function public.is_club_member(uuid) from public;
revoke all on function public.is_club_owner(uuid) from public;
revoke all on function public.is_club_admin(uuid) from public;
revoke all on function public.is_club_staff(uuid) from public;
revoke all on function public.my_member_id(uuid) from public;
-- RLS 정책은 호출자 권한으로 평가되므로 anon/authenticated 실행 권한은 유지한다.
grant execute on function public.is_club_member(uuid) to anon, authenticated, service_role;
grant execute on function public.is_club_owner(uuid) to anon, authenticated, service_role;
grant execute on function public.is_club_admin(uuid) to authenticated, service_role;
grant execute on function public.is_club_staff(uuid) to authenticated, service_role;
grant execute on function public.my_member_id(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. 운영 데이터 RLS 세분화
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'attendance','matches','queue_entries','score_events','match_videos','lesson_bookings','payments'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant insert, update, delete on public.attendance to authenticated;
grant insert, update, delete on public.matches to authenticated;
grant insert, update, delete on public.queue_entries to authenticated;
grant insert, update, delete on public.score_events to authenticated;
grant insert, update, delete on public.match_videos to authenticated;
grant insert, update, delete on public.lesson_bookings to authenticated;

-- attendance: 본인 출석은 본인이, 나머지는 운영진
drop policy if exists "attendance read" on public.attendance;
drop policy if exists "attendance write" on public.attendance;
drop policy if exists "attendance insert" on public.attendance;
drop policy if exists "attendance update" on public.attendance;
drop policy if exists "attendance delete" on public.attendance;
drop policy if exists "members manage attendance" on public.attendance;
drop policy if exists "members view attendance" on public.attendance;
create policy "attendance read" on public.attendance
  for select to authenticated using (public.is_club_member(club_id));
create policy "attendance insert" on public.attendance
  for insert to authenticated
  with check (
    public.is_club_member(club_id)
    and (member_id = public.my_member_id(club_id) or public.is_club_staff(club_id))
  );
create policy "attendance update" on public.attendance
  for update to authenticated
  using (
    public.is_club_member(club_id)
    and (member_id = public.my_member_id(club_id) or public.is_club_staff(club_id))
  )
  with check (
    public.is_club_member(club_id)
    and (member_id = public.my_member_id(club_id) or public.is_club_staff(club_id))
  );
create policy "attendance delete" on public.attendance
  for delete to authenticated using (public.is_club_staff(club_id));

-- queue_entries: 본인 대기 등록/취소, 운영진은 전체
drop policy if exists "queue read" on public.queue_entries;
drop policy if exists "queue write" on public.queue_entries;
drop policy if exists "queue insert" on public.queue_entries;
drop policy if exists "queue delete" on public.queue_entries;
drop policy if exists "queue update" on public.queue_entries;
drop policy if exists "members manage queue" on public.queue_entries;
drop policy if exists "members view queue" on public.queue_entries;
create policy "queue read" on public.queue_entries
  for select to authenticated using (public.is_club_member(club_id));
create policy "queue insert" on public.queue_entries
  for insert to authenticated
  with check (
    public.is_club_member(club_id)
    and (member_id = public.my_member_id(club_id) or public.is_club_staff(club_id))
  );
create policy "queue update" on public.queue_entries
  for update to authenticated using (public.is_club_staff(club_id))
  with check (public.is_club_staff(club_id));
create policy "queue delete" on public.queue_entries
  for delete to authenticated
  using (
    public.is_club_member(club_id)
    and (member_id = public.my_member_id(club_id) or public.is_club_staff(club_id))
  );

-- matches / score_events / match_videos: 조회는 회원, 기록은 운영진, 삭제는 관리자
drop policy if exists "matches read" on public.matches;
drop policy if exists "matches write" on public.matches;
drop policy if exists "matches insert" on public.matches;
drop policy if exists "matches update" on public.matches;
drop policy if exists "matches delete" on public.matches;
drop policy if exists "members manage matches" on public.matches;
drop policy if exists "members view matches" on public.matches;
create policy "matches read" on public.matches
  for select to authenticated using (public.is_club_member(club_id));
create policy "matches insert" on public.matches
  for insert to authenticated with check (public.is_club_staff(club_id));
create policy "matches update" on public.matches
  for update to authenticated using (public.is_club_staff(club_id))
  with check (public.is_club_staff(club_id));
create policy "matches delete" on public.matches
  for delete to authenticated using (public.is_club_admin(club_id));

drop policy if exists "score_events read" on public.score_events;
drop policy if exists "score_events write" on public.score_events;
drop policy if exists "score_events insert" on public.score_events;
drop policy if exists "score_events update" on public.score_events;
drop policy if exists "score_events delete" on public.score_events;
drop policy if exists "members manage score_events" on public.score_events;
drop policy if exists "members view score_events" on public.score_events;
create policy "score_events read" on public.score_events
  for select to authenticated using (public.is_club_member(club_id));
create policy "score_events insert" on public.score_events
  for insert to authenticated with check (public.is_club_staff(club_id));
create policy "score_events update" on public.score_events
  for update to authenticated using (public.is_club_staff(club_id))
  with check (public.is_club_staff(club_id));
create policy "score_events delete" on public.score_events
  for delete to authenticated using (public.is_club_admin(club_id));

drop policy if exists "match_videos read" on public.match_videos;
drop policy if exists "match_videos write" on public.match_videos;
drop policy if exists "match_videos insert" on public.match_videos;
drop policy if exists "match_videos update" on public.match_videos;
drop policy if exists "match_videos delete" on public.match_videos;
drop policy if exists "members manage match_videos" on public.match_videos;
drop policy if exists "members view match_videos" on public.match_videos;
create policy "match_videos read" on public.match_videos
  for select to authenticated using (public.is_club_member(club_id));
create policy "match_videos insert" on public.match_videos
  for insert to authenticated
  with check (
    public.is_club_member(club_id)
    and (uploaded_by = auth.uid() or public.is_club_staff(club_id))
  );
create policy "match_videos update" on public.match_videos
  for update to authenticated
  using (public.is_club_staff(club_id) or uploaded_by = auth.uid())
  with check (public.is_club_staff(club_id) or uploaded_by = auth.uid());
create policy "match_videos delete" on public.match_videos
  for delete to authenticated using (public.is_club_admin(club_id));

-- lesson_bookings: 본인 예약 + 운영진, 결제 상태 변경은 서버(service_role)
drop policy if exists "lesson_bookings read" on public.lesson_bookings;
drop policy if exists "lesson_bookings write" on public.lesson_bookings;
drop policy if exists "lesson_bookings insert" on public.lesson_bookings;
drop policy if exists "lesson_bookings update" on public.lesson_bookings;
drop policy if exists "lesson_bookings delete" on public.lesson_bookings;
drop policy if exists "members manage lesson_bookings" on public.lesson_bookings;
drop policy if exists "members view lesson_bookings" on public.lesson_bookings;
create policy "lesson_bookings read" on public.lesson_bookings
  for select to authenticated
  using (
    public.is_club_staff(club_id)
    or (public.is_club_member(club_id) and member_id = public.my_member_id(club_id))
  );
create policy "lesson_bookings insert" on public.lesson_bookings
  for insert to authenticated
  with check (
    public.is_club_member(club_id)
    and (member_id = public.my_member_id(club_id) or public.is_club_staff(club_id))
  );
create policy "lesson_bookings update" on public.lesson_bookings
  for update to authenticated
  using (
    public.is_club_staff(club_id)
    or (public.is_club_member(club_id) and member_id = public.my_member_id(club_id))
  )
  with check (
    public.is_club_staff(club_id)
    or (public.is_club_member(club_id) and member_id = public.my_member_id(club_id))
  );
create policy "lesson_bookings delete" on public.lesson_bookings
  for delete to authenticated using (public.is_club_admin(club_id));

-- payments: 본인 결제 조회 + 관리자 조회. 생성/수정은 서버 전용(service_role).
revoke insert, update, delete on public.payments from authenticated;
drop policy if exists "payments read" on public.payments;
drop policy if exists "payments write" on public.payments;
drop policy if exists "payments insert" on public.payments;
drop policy if exists "payments update" on public.payments;
drop policy if exists "payments delete" on public.payments;
drop policy if exists "members manage payments" on public.payments;
drop policy if exists "members view payments" on public.payments;
create policy "payments read" on public.payments
  for select to authenticated
  using (
    public.is_club_admin(club_id)
    or exists (
      select 1 from public.lesson_bookings b
       where b.id = payments.booking_id
         and b.member_id = public.my_member_id(payments.club_id)
    )
  );

-- finance_entries: 재정은 관리자만 쓰기
alter table public.finance_entries enable row level security;
grant select on public.finance_entries to authenticated;
grant insert, update, delete on public.finance_entries to authenticated;
grant all on public.finance_entries to service_role;
drop policy if exists "finance read" on public.finance_entries;
drop policy if exists "finance write" on public.finance_entries;
drop policy if exists "finance insert" on public.finance_entries;
drop policy if exists "finance update" on public.finance_entries;
drop policy if exists "finance delete" on public.finance_entries;
drop policy if exists "members manage finance_entries" on public.finance_entries;
drop policy if exists "members view finance_entries" on public.finance_entries;
create policy "finance read" on public.finance_entries
  for select to authenticated using (public.is_club_member(club_id));
create policy "finance insert" on public.finance_entries
  for insert to authenticated with check (public.is_club_admin(club_id));
create policy "finance update" on public.finance_entries
  for update to authenticated using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));
create policy "finance delete" on public.finance_entries
  for delete to authenticated using (public.is_club_admin(club_id));

-- member_roles / club_roles: 역할 부여는 관리자만
alter table public.member_roles enable row level security;
alter table public.club_roles enable row level security;
grant select on public.member_roles, public.club_roles to authenticated;
grant insert, update, delete on public.member_roles, public.club_roles to authenticated;
grant all on public.member_roles, public.club_roles to service_role;
drop policy if exists "member_roles read" on public.member_roles;
drop policy if exists "member_roles write" on public.member_roles;
drop policy if exists "members manage member_roles" on public.member_roles;
drop policy if exists "members view member_roles" on public.member_roles;
create policy "member_roles read" on public.member_roles
  for select to authenticated using (public.is_club_member(club_id));
create policy "member_roles write" on public.member_roles
  for all to authenticated
  using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));
drop policy if exists "club_roles read" on public.club_roles;
drop policy if exists "club_roles write" on public.club_roles;
drop policy if exists "members manage club_roles" on public.club_roles;
drop policy if exists "members view club_roles" on public.club_roles;
create policy "club_roles read" on public.club_roles
  for select to authenticated using (public.is_club_member(club_id));
create policy "club_roles write" on public.club_roles
  for all to authenticated
  using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- 6. club_members UPDATE 재정의:
--    일반 회원은 자기 레코드의 표시용 필드만, 등급/역할/상태/통계는 운영진·관리자
-- ---------------------------------------------------------------------------
drop policy if exists "club_members update" on public.club_members;
create policy "club_members update" on public.club_members
  for update to authenticated
  using (public.is_club_admin(club_id) or user_id = auth.uid())
  with check (public.is_club_admin(club_id) or user_id = auth.uid());

create or replace function public.club_members_field_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean := public.is_club_admin(new.club_id);
  v_staff boolean := public.is_club_staff(new.club_id);
begin
  -- service_role / 트리거 내부 호출(auth.uid() 없음)은 그대로 통과
  if auth.uid() is null then
    return new;
  end if;

  if not v_admin then
    -- 관리자만 바꿀 수 있는 필드
    if coalesce(new.role, 'member') is distinct from coalesce(old.role, 'member')
       or coalesce(new.status, 'active') is distinct from coalesce(old.status, 'active')
       or new.club_id is distinct from old.club_id
       or new.user_id is distinct from old.user_id
       or new.invited_by is distinct from old.invited_by then
      raise exception 'not_allowed' using hint = '회원 역할/상태 변경 권한이 없습니다.';
    end if;
  end if;

  if not v_staff then
    -- 운영진만 바꿀 수 있는 운영 데이터
    if new.level is distinct from old.level
       or new.games is distinct from old.games
       or new.wins is distinct from old.wins
       or new.is_guest is distinct from old.is_guest then
      raise exception 'not_allowed' using hint = '회원 등급/전적 수정 권한이 없습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_club_members_field_guard on public.club_members;
create trigger trg_club_members_field_guard
before update on public.club_members
for each row execute function public.club_members_field_guard();

-- ---------------------------------------------------------------------------
-- 7. profiles RLS (본인만 수정, username 은 위 트리거로 검증)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles self update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
