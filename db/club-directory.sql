-- 민턴동: 동호회 디렉터리 (clubs / club_members) — additive 마이그레이션 v2
-- 외부 Supabase 프로젝트(mintondong / tkumfwiomcxkdbzljyss) SQL Editor 에서 1회 실행하세요.
--
-- 설계 메모
--  * 기존 컬럼/데이터/기능(경기·기록·출석·레슨)은 삭제하지 않습니다. 컬럼 추가 + 정책 재작성만 합니다.
--  * 지역은 기존 clubs.location 을 canonical 로 사용합니다. (region 중복 컬럼은 추가하지 않음)
--  * 현재 앱의 Supabase club_members 쓰기는 아래 3개 RPC(생성/가입/상태 변경)뿐입니다.
--    경기 전적(games/wins)과 회원 편집은 local demo store에만 있어 직접 UPDATE를 열지 않습니다.
--  * RLS로 행 접근을 제한하고, SECURITY DEFINER RPC도 guard trigger로 컬럼 무결성을 검증합니다.

begin;

-- 1) clubs 확장 ------------------------------------------------------------
alter table public.clubs
  add column if not exists description text,
  add column if not exists profile_image_url text,
  add column if not exists cover_image_url text,
  add column if not exists is_public boolean not null default true,
  add column if not exists member_count integer not null default 0;

-- 2) club_members 확장 -----------------------------------------------------
alter table public.club_members
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'active',
  add column if not exists joined_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'club_members_role_check') then
    alter table public.club_members
      add constraint club_members_role_check check (role in ('owner', 'admin', 'member'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'club_members_status_check') then
    alter table public.club_members
      add constraint club_members_status_check check (status in ('active', 'pending'));
  end if;
end $$;

-- 한 사용자가 같은 동호회에 중복 가입되지 않도록 (게스트는 user_id 가 null 이라 제외)
create unique index if not exists club_members_club_user_unique
  on public.club_members (club_id, user_id)
  where user_id is not null;

-- 기존 데이터 보정: 소유자 멤버십은 owner 역할로 --------------------------
update public.club_members m
   set role = 'owner'
  from public.clubs c
 where c.id = m.club_id
   and m.user_id = c.owner_id
   and m.role <> 'owner';

-- owner 역할은 clubs.owner_id 와 일치하는 사용자만 가질 수 있다
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
begin
  select owner_id, is_public into club_owner, club_public
    from public.clubs
   where id = new.club_id;
  is_owner := (club_owner is not null and club_owner = uid);

  -- owner 역할은 clubs.owner_id 본인의 active 행에만 존재한다.
  if new.role = 'owner' and (new.user_id is null or new.user_id <> club_owner) then
    raise exception 'owner role is reserved for the club owner';
  end if;
  if new.role = 'owner' and new.status <> 'active' then
    raise exception 'club owner membership must stay active';
  end if;

  if tg_op = 'INSERT' then
    -- SQL Editor/service_role의 보정 작업은 허용하되, 일반 API에는 직접 INSERT 권한이 없다.
    if uid is null then
      return new;
    end if;

    -- create_club_with_owner가 만드는 owner 행
    if is_owner and new.user_id = uid and new.role = 'owner' and new.status = 'active'
       and new.is_guest = false and new.invited_by is null then
      return new;
    end if;

    -- request_club_join이 만드는 본인 행. 공개 클럽은 active, 비공개는 pending이다.
    expected_status := case when club_public then 'active' else 'pending' end;
    if new.user_id = uid and new.role = 'member' and new.status = expected_status
       and new.is_guest = false and new.invited_by is null then
      return new;
    end if;

    raise exception 'club membership inserts must use an approved RPC';
  end if;

  -- 관계·식별·생성 메타데이터는 owner/RPC/service_role도 UPDATE로 바꿀 수 없다.
  if new.id is distinct from old.id
     or new.club_id is distinct from old.club_id
     or new.user_id is distinct from old.user_id
     or new.is_guest is distinct from old.is_guest
     or new.invited_by is distinct from old.invited_by
     or new.created_at is distinct from old.created_at
     or new.joined_at is distinct from old.joined_at then
    raise exception 'membership identity and relationship fields are immutable';
  end if;

  -- 기존 owner 행의 역할/상태도 강등하거나 비활성화할 수 없다.
  if (old.role = 'owner' or old.user_id = club_owner)
     and (new.role <> 'owner' or new.status <> 'active') then
    raise exception 'club owner membership cannot be demoted or deactivated';
  end if;

  -- SQL Editor/service_role의 운영 보정은 위 불변 필드와 owner 무결성을 지켜 통과한다.
  if uid is null then
    return new;
  end if;

  -- 현재 외부 write path는 owner 전용 set_club_member_state(role/status)뿐이다.
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

  -- updated_at은 기존 DB trigger가 관리하므로 비교하지 않는다.
  return new;
end $$;

revoke all on function public.club_members_guard() from public;
revoke execute on function public.club_members_guard() from anon, authenticated, service_role;

drop trigger if exists trg_club_members_guard on public.club_members;
create trigger trg_club_members_guard
before insert or update on public.club_members
for each row execute function public.club_members_guard();

-- 3) member_count: backfill + 좁은 범위 트리거 ------------------------------
update public.clubs c
   set member_count = coalesce((
     select count(*) from public.club_members m
      where m.club_id = c.id and m.status = 'active'
   ), 0);

create or replace function public.sync_club_member_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.club_id is not null then
    update public.clubs c
       set member_count = (
         select count(*) from public.club_members m
          where m.club_id = new.club_id and m.status = 'active'
       )
     where c.id = new.club_id;
  end if;
  if tg_op in ('DELETE', 'UPDATE') and old.club_id is not null
     and (tg_op = 'DELETE' or old.club_id is distinct from new.club_id) then
    update public.clubs c
       set member_count = (
         select count(*) from public.club_members m
          where m.club_id = old.club_id and m.status = 'active'
       )
     where c.id = old.club_id;
  end if;
  return null;
end $$;

revoke all on function public.sync_club_member_count() from public;
revoke execute on function public.sync_club_member_count() from anon, authenticated, service_role;

drop trigger if exists trg_sync_club_member_count on public.club_members;
create trigger trg_sync_club_member_count
after insert or delete or update of club_id, status on public.club_members
for each row execute function public.sync_club_member_count();

-- 4) 멤버십 판정 함수 (기존 1-arg 함수를 교체) ------------------------------
create or replace function public.is_club_member(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.clubs c
     where c.id = _club_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.club_members m
     where m.club_id = _club_id
       and m.user_id = auth.uid()
       and m.status = 'active'
  )
$$;

revoke all on function public.is_club_member(uuid) from public;
revoke execute on function public.is_club_member(uuid) from anon, authenticated, service_role;
grant execute on function public.is_club_member(uuid) to authenticated;

-- 5) 권한 & RLS ------------------------------------------------------------
grant select, insert, update, delete on public.clubs to authenticated;
-- 생성/가입/상태 변경은 검증된 SECURITY DEFINER RPC만 사용한다.
revoke all privileges on table public.club_members from authenticated;
grant select on public.club_members to authenticated;
-- 공개 클럽 탐색에 필요한 SELECT 만 anon 에 다시 부여한다.
revoke all privileges on table public.clubs from anon;
grant select on public.clubs to anon;
-- 회원 명단은 공개 클럽에서도 개인정보다. anon 에는 테이블 권한 자체를 주지 않는다.
revoke all privileges on table public.club_members from anon;
grant all on public.clubs to service_role;
grant all on public.club_members to service_role;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

-- clubs: 기존 정책 전부 정리 후 재작성 (permissive OR 누적 방지)
drop policy if exists "create own club" on public.clubs;
drop policy if exists "members can view club" on public.clubs;
drop policy if exists "owner deletes club" on public.clubs;
drop policy if exists "owner updates club" on public.clubs;
drop policy if exists "clubs public read" on public.clubs;
drop policy if exists "clubs authenticated read" on public.clubs;
drop policy if exists "clubs read" on public.clubs;
drop policy if exists "clubs insert own" on public.clubs;
drop policy if exists "clubs owner insert" on public.clubs;
drop policy if exists "clubs owner update" on public.clubs;
drop policy if exists "clubs owner delete" on public.clubs;

-- 비로그인 사용자는 공개 클럽만, 로그인 사용자는 공개 클럽 또는 자기 클럽만 조회한다.
create policy "clubs public read" on public.clubs
for select to anon using (is_public = true);

create policy "clubs authenticated read" on public.clubs
for select to authenticated using (
  is_public = true
  or owner_id = (select auth.uid())
  or public.is_club_member(id)
);

create policy "clubs insert own" on public.clubs
for insert to authenticated with check (owner_id = auth.uid());

create policy "clubs owner update" on public.clubs
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "clubs owner delete" on public.clubs
for delete to authenticated using (owner_id = auth.uid());

-- club_members: 기존 정책 전부 정리 후 재작성
drop policy if exists "delete roster" on public.club_members;
drop policy if exists "join as self or owner adds" on public.club_members;
drop policy if exists "members view roster" on public.club_members;
drop policy if exists "update roster" on public.club_members;
drop policy if exists "club_members read" on public.club_members;
drop policy if exists "club_members authenticated read" on public.club_members;
drop policy if exists "club_members insert" on public.club_members;
drop policy if exists "club_members update" on public.club_members;
drop policy if exists "club_members delete" on public.club_members;
drop policy if exists "club_members self join" on public.club_members;
drop policy if exists "club_members self update" on public.club_members;
drop policy if exists "club_members self leave" on public.club_members;

-- 공개 여부와 무관하게 로그인한 본인, 해당 클럽의 active 회원, 소유자만 조회한다.
-- anon 은 이 정책의 대상도 아니며 위에서 테이블 권한도 회수했다.
create policy "club_members authenticated read" on public.club_members
for select to authenticated using (
  user_id = (select auth.uid())
  or public.is_club_member(club_id)
);

-- authenticated에는 직접 INSERT/UPDATE/DELETE table privilege와 write policy를 주지 않는다.
-- 자기 name/level/gender 및 games/wins의 Supabase write path는 현재 없으며, 필요해질 때
-- 허용 필드만 받는 전용 RPC를 추가한다. 기존 경기/기록 UI는 local demo store를 사용한다.

-- 6) 원자적 동호회 생성 / 가입 RPC ------------------------------------------
create or replace function public.generate_club_invite_code()
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.clubs where invite_code = code);
  end loop;
  return code;
end $$;

revoke all on function public.generate_club_invite_code() from public;
revoke execute on function public.generate_club_invite_code() from anon, authenticated, service_role;

create or replace function public.create_club_with_owner(
  p_name text,
  p_location text default null,
  p_description text default null,
  p_is_public boolean default true,
  p_profile_image_url text default null
)
returns public.clubs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  club public.clubs;
  owner_name text;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'club name is required';
  end if;

  select nullif(btrim(display_name), '') into owner_name from public.profiles where id = uid;
  owner_name := coalesce(owner_name, split_part(coalesce((auth.jwt() ->> 'email'), ''), '@', 1), '회원');
  if coalesce(btrim(owner_name), '') = '' then
    owner_name := '회원';
  end if;

  insert into public.clubs (name, location, description, is_public, profile_image_url, owner_id, invite_code)
  values (
    btrim(p_name),
    coalesce(nullif(btrim(p_location), ''), '장소 미설정'),
    nullif(btrim(p_description), ''),
    coalesce(p_is_public, true),
    p_profile_image_url,
    uid,
    public.generate_club_invite_code()
  )
  returning * into club;

  insert into public.club_members (club_id, user_id, name, role, status)
  values (club.id, uid, owner_name, 'owner', 'active');

  return club;
end $$;

revoke all on function public.create_club_with_owner(text, text, text, boolean, text) from public;
revoke execute on function public.create_club_with_owner(text, text, text, boolean, text) from anon, authenticated, service_role;
grant execute on function public.create_club_with_owner(text, text, text, boolean, text) to authenticated;

create or replace function public.request_club_join(p_club_id uuid)
returns public.club_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  club public.clubs;
  member public.club_members;
  member_name text;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  select * into club from public.clubs where id = p_club_id;
  if club.id is null then
    raise exception 'club not found';
  end if;

  select * into member from public.club_members where club_id = p_club_id and user_id = uid;
  if member.id is not null then
    return member;
  end if;

  select nullif(btrim(display_name), '') into member_name from public.profiles where id = uid;
  member_name := coalesce(member_name, split_part(coalesce((auth.jwt() ->> 'email'), ''), '@', 1), '회원');
  if coalesce(btrim(member_name), '') = '' then
    member_name := '회원';
  end if;

  insert into public.club_members (club_id, user_id, name, role, status)
  values (p_club_id, uid, member_name, 'member', case when club.is_public then 'active' else 'pending' end)
  returning * into member;

  return member;
end $$;

revoke all on function public.request_club_join(uuid) from public;
revoke execute on function public.request_club_join(uuid) from anon, authenticated, service_role;
grant execute on function public.request_club_join(uuid) to authenticated;

-- 소유자용 멤버 관리 RPC (승인 / 역할 변경)
create or replace function public.set_club_member_state(
  p_member_id uuid,
  p_role text default null,
  p_status text default null
)
returns public.club_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member public.club_members;
  club public.clubs;
begin
  select * into member from public.club_members where id = p_member_id;
  if member.id is null then
    raise exception 'member not found';
  end if;
  select * into club from public.clubs where id = member.club_id;
  if club.owner_id is distinct from auth.uid() then
    raise exception 'only the club owner can manage members';
  end if;
  if p_role is not null and p_role not in ('admin', 'member') then
    raise exception 'role must be admin or member';
  end if;
  if p_status is not null and p_status not in ('active', 'pending') then
    raise exception 'status must be active or pending';
  end if;
  if member.role = 'owner' and p_role is not null then
    raise exception 'owner role cannot be changed';
  end if;

  update public.club_members
     set role = coalesce(p_role, role),
         status = coalesce(p_status, status)
   where id = p_member_id
  returning * into member;

  return member;
end $$;

revoke all on function public.set_club_member_state(uuid, text, text) from public;
revoke execute on function public.set_club_member_state(uuid, text, text) from anon, authenticated, service_role;
grant execute on function public.set_club_member_state(uuid, text, text) to authenticated;

-- 7) 동호회 이미지 스토리지 ------------------------------------------------
-- 경로 규칙: clubs/<club_id>/<파일명>
insert into storage.buckets (id, name, public)
values ('club-images', 'club-images', true)
on conflict (id) do update set public = true;

create or replace function public.can_manage_club_images(_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  parts text[] := string_to_array(_path, '/');
  club uuid;
begin
  if array_length(parts, 1) < 3 or parts[1] <> 'clubs' then
    return false;
  end if;
  begin
    club := parts[2]::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.clubs c
     where c.id = club
       and (c.owner_id = auth.uid()
            or exists (
              select 1 from public.club_members m
               where m.club_id = c.id and m.user_id = auth.uid()
                 and m.status = 'active' and m.role in ('owner', 'admin')
            ))
  );
end $$;

revoke all on function public.can_manage_club_images(text) from public;
revoke execute on function public.can_manage_club_images(text) from anon, authenticated, service_role;
grant execute on function public.can_manage_club_images(text) to authenticated;

drop policy if exists "club images public read" on storage.objects;
create policy "club images public read" on storage.objects
for select using (bucket_id = 'club-images');

drop policy if exists "club images auth upload" on storage.objects;
drop policy if exists "club images manager insert" on storage.objects;
create policy "club images manager insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'club-images' and public.can_manage_club_images(name));

drop policy if exists "club images manager update" on storage.objects;
create policy "club images manager update" on storage.objects
for update to authenticated
using (bucket_id = 'club-images' and public.can_manage_club_images(name))
with check (bucket_id = 'club-images' and public.can_manage_club_images(name));

drop policy if exists "club images manager delete" on storage.objects;
create policy "club images manager delete" on storage.objects
for delete to authenticated
using (bucket_id = 'club-images' and public.can_manage_club_images(name));

-- Storage bucket과 정책도 PostgreSQL transaction 안에서 처리되므로 전 단계가 함께 commit/rollback된다.
commit;
