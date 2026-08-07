-- 민턴동: 동호회(clubs) / 멤버(club_members) 디렉터리 기능
-- 외부 Supabase 프로젝트(mintondong / tkumfwiomcxkdbzljyss) SQL Editor 에서 1회 실행하세요.
-- 기존 데이터/스키마를 삭제하지 않고 컬럼만 추가하는 additive 마이그레이션입니다.

-- 1) clubs 확장 ------------------------------------------------------------
alter table public.clubs
  add column if not exists description text,
  add column if not exists profile_image_url text,
  add column if not exists cover_image_url text,
  add column if not exists region text,
  add column if not exists is_public boolean not null default true,
  add column if not exists member_count integer not null default 1;

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

-- 3) member_count 자동 유지 -------------------------------------------------
create or replace function public.sync_club_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.club_id, old.club_id);
begin
  update public.clubs c
     set member_count = (
       select count(*) from public.club_members m
        where m.club_id = target and m.status = 'active'
     )
   where c.id = target;
  return null;
end $$;

drop trigger if exists trg_sync_club_member_count on public.club_members;
create trigger trg_sync_club_member_count
after insert or update or delete on public.club_members
for each row execute function public.sync_club_member_count();

-- 4) 권한 & RLS ------------------------------------------------------------
grant select, insert, update, delete on public.clubs to authenticated;
grant select, insert, update, delete on public.club_members to authenticated;
grant select on public.clubs to anon;
grant select on public.club_members to anon;
grant all on public.clubs to service_role;
grant all on public.club_members to service_role;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

-- 내 멤버십 확인용 security definer 함수 (RLS 재귀 방지)
create or replace function public.is_club_member(_club_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
     where club_id = _club_id and user_id = _user_id and status = 'active'
  )
$$;

grant execute on function public.is_club_member(uuid, uuid) to anon, authenticated;

-- 공개 동호회는 누구나 조회 가능, 비공개는 멤버/소유자만
drop policy if exists "clubs public read" on public.clubs;
create policy "clubs public read" on public.clubs
for select using (
  is_public
  or owner_id = auth.uid()
  or public.is_club_member(id, auth.uid())
);

drop policy if exists "clubs owner insert" on public.clubs;
create policy "clubs owner insert" on public.clubs
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "clubs owner update" on public.clubs;
create policy "clubs owner update" on public.clubs
for update to authenticated using (owner_id = auth.uid());

drop policy if exists "clubs owner delete" on public.clubs;
create policy "clubs owner delete" on public.clubs
for delete to authenticated using (owner_id = auth.uid());

-- 멤버 목록: 공개 동호회는 조회 가능, 비공개는 멤버만
drop policy if exists "club_members read" on public.club_members;
create policy "club_members read" on public.club_members
for select using (
  exists (select 1 from public.clubs c where c.id = club_id and c.is_public)
  or public.is_club_member(club_id, auth.uid())
);

drop policy if exists "club_members self join" on public.club_members;
create policy "club_members self join" on public.club_members
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "club_members self update" on public.club_members;
create policy "club_members self update" on public.club_members
for update to authenticated using (user_id = auth.uid());

drop policy if exists "club_members self leave" on public.club_members;
create policy "club_members self leave" on public.club_members
for delete to authenticated using (user_id = auth.uid());

-- 5) 동호회 이미지 스토리지 ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('club-images', 'club-images', true)
on conflict (id) do nothing;

drop policy if exists "club images public read" on storage.objects;
create policy "club images public read" on storage.objects
for select using (bucket_id = 'club-images');

drop policy if exists "club images auth upload" on storage.objects;
create policy "club images auth upload" on storage.objects
for insert to authenticated with check (bucket_id = 'club-images');
