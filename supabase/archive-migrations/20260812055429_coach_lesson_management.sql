-- 실제 레슨 상품 관리: 기존 coaches 행/참조를 보존하고 판매 상태와 최소권한만 추가한다.
-- 운영 DB에는 자동 적용하지 않는다. Supabase SQL Editor에서 검토 후 별도로 실행한다.

begin;

alter table public.coaches
  add column if not exists is_active boolean not null default false;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'coaches_active_product_valid'
       and conrelid = 'public.coaches'::regclass
  ) then
    alter table public.coaches
      add constraint coaches_active_product_valid check (
        not is_active
        or (
          name is not null
          and btrim(name) <> ''
          and price is not null
          and price > 0
          and duration_min is not null
          and duration_min > 0
          and start_hour is not null
          and start_hour >= 0
          and end_hour is not null
          and end_hour <= 24
          and start_hour < end_hour
          and weekdays is not null
          and cardinality(weekdays) > 0
          and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
          and array_position(weekdays, null) is null
        )
      );
  end if;
end
$$;

create index if not exists coaches_club_id_idx
  on public.coaches (club_id);

create index if not exists coaches_public_catalog_idx
  on public.coaches (club_id, created_at)
  where is_active = true;

create schema if not exists private;
revoke all on schema private from public, anon;

create or replace function private.can_manage_coach_lessons(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.clubs c
     where c.id = _club_id
       and c.owner_id = (select auth.uid())
  ) or exists (
    select 1
      from public.club_members cm
     where cm.club_id = _club_id
       and cm.user_id = (select auth.uid())
       and cm.status = 'active'
       and cm.role in ('owner', 'admin')
  );
$$;

revoke all on function private.can_manage_coach_lessons(uuid) from public;
revoke execute on function private.can_manage_coach_lessons(uuid) from anon;
grant usage on schema private to authenticated;
grant execute on function private.can_manage_coach_lessons(uuid) to authenticated;

-- 기존 정책은 owner에게 DELETE까지 포함한 ALL 권한을 주고, active member 전체에 row를
-- 보였다. 실제 관리 화면은 owner/active admin만 접근하며 hard delete는 제공하지 않는다.
drop policy if exists "members view coaches" on public.coaches;
drop policy if exists "owner manages coaches" on public.coaches;
drop policy if exists "coach lesson managers select" on public.coaches;
drop policy if exists "coach lesson managers insert" on public.coaches;
drop policy if exists "coach lesson managers update" on public.coaches;

alter table public.coaches enable row level security;

create policy "coach lesson managers select"
on public.coaches
for select
to authenticated
using (private.can_manage_coach_lessons(club_id));

create policy "coach lesson managers insert"
on public.coaches
for insert
to authenticated
with check (private.can_manage_coach_lessons(club_id));

create policy "coach lesson managers update"
on public.coaches
for update
to authenticated
using (private.can_manage_coach_lessons(club_id))
with check (private.can_manage_coach_lessons(club_id));

-- settlement_account, id, club_id, created_at은 UPDATE 대상에서 제외한다.
-- INSERT의 club_id 변조는 RLS가 대상 클럽의 owner/active admin인지 다시 검사한다.
revoke all on table public.coaches from public, anon, authenticated;

grant select (
  id, club_id, name, specialties, level_label, intro, duration_min, price,
  weekdays, start_hour, end_hour, is_active, created_at, updated_at
) on public.coaches to authenticated;

grant insert (
  club_id, name, specialties, level_label, intro, duration_min, price,
  weekdays, start_hour, end_hour, is_active
) on public.coaches to authenticated;

grant update (
  name, specialties, level_label, intro, duration_min, price,
  weekdays, start_hour, end_hour, is_active, updated_at
) on public.coaches to authenticated;

grant all on table public.coaches to service_role;

comment on column public.coaches.is_active is
  '공개 판매 상태. false는 상품과 결제 경로에서 제외하며 행과 결제/예약 참조는 보존한다.';

commit;
