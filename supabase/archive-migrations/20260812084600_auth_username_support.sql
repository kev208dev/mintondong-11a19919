-- Username/password auth support required by the deployed application.
-- This is intentionally focused on profiles + auth RPCs only; it does not
-- re-apply the broader legacy RLS script in db/auth-username-and-rls.sql.

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_key
  on public.profiles (username);

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
    raise exception 'invalid_username'
      using hint = '아이디는 영문 소문자, 숫자, _ 조합 4~20자여야 합니다.';
  end if;
  if public.username_is_reserved(v) then
    raise exception 'reserved_username'
      using hint = '사용할 수 없는 아이디입니다.';
  end if;
  return v;
end;
$$;

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

-- Keep profile creation compatible with email/password and social providers.
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
    split_part(coalesce(new.email, ''), '@', 1),
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

-- Public availability check: only returns a boolean and does not expose email.
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
  return not exists (
    select 1 from public.profiles where username = v
  );
end;
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text)
  to anon, authenticated, service_role;

-- Social-login users can claim an id once during onboarding.
create or replace function public.claim_username(
  p_username text,
  p_display_name text default null
)
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

  insert into public.profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  select username into v_current
    from public.profiles
   where id = v_uid;

  if v_current is not null and v_current <> v then
    raise exception 'username_already_set';
  end if;

  update public.profiles
     set username = v,
         display_name = coalesce(
           nullif(btrim(coalesce(p_display_name, '')), ''),
           display_name
         ),
         updated_at = now()
   where id = v_uid;

  return v;
exception when unique_violation then
  raise exception 'username_taken';
end;
$$;

revoke all on function public.claim_username(text, text) from public;
grant execute on function public.claim_username(text, text)
  to authenticated, service_role;

-- Server-only username -> auth email lookup used by username/password login.
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
