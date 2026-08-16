-- Sign in with Apple server-to-server notification audit and account state.
--
-- Apple sends a signed JWS to the Worker. The Worker verifies the signature and
-- claims, hashes the Apple subject, then calls the service-role-only function
-- below. The raw JWS, raw Apple subject and relay email are never persisted.

begin;

create table if not exists public.apple_auth_notifications (
  id uuid primary key default gen_random_uuid(),
  jti text not null unique check (length(jti) between 1 and 255),
  event_type text not null check (length(event_type) between 1 and 64),
  user_id uuid references auth.users(id) on delete set null,
  apple_sub_hash text not null check (apple_sub_hash ~ '^[0-9a-f]{64}$'),
  event_time timestamptz not null,
  status text not null check (
    status in ('processed', 'review_required', 'unresolved', 'unknown')
  ),
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

create index if not exists apple_auth_notifications_user_id_idx
  on public.apple_auth_notifications(user_id);
create index if not exists apple_auth_notifications_received_at_idx
  on public.apple_auth_notifications(received_at desc);

comment on table public.apple_auth_notifications is
  'Server-only durable audit for verified Sign in with Apple notifications. Raw JWS, Apple subject and email are not stored.';

create table if not exists public.apple_auth_account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apple_sub_hash text not null check (apple_sub_hash ~ '^[0-9a-f]{64}$'),
  email_forwarding_enabled boolean,
  authorization_status text not null default 'active' check (
    authorization_status in ('active', 'consent_revoked', 'account_deleted')
  ),
  account_deletion_required boolean not null default false,
  last_event_type text not null check (length(last_event_type) between 1 and 64),
  last_event_at timestamptz not null,
  last_notification_jti text not null,
  updated_at timestamptz not null default now()
);

comment on table public.apple_auth_account_states is
  'Server-only Apple identity state. Account-deleted events require the existing protected account-deletion workflow; they do not directly delete users.';

alter table public.apple_auth_notifications enable row level security;
alter table public.apple_auth_notifications force row level security;
alter table public.apple_auth_account_states enable row level security;
alter table public.apple_auth_account_states force row level security;

revoke all on table public.apple_auth_notifications
  from public, anon, authenticated;
revoke all on table public.apple_auth_account_states
  from public, anon, authenticated;
grant select, insert on table public.apple_auth_notifications to service_role;
grant select, insert, update on table public.apple_auth_account_states to service_role;

-- One transaction resolves the Apple provider subject, claims the unique jti,
-- updates the account state and finalizes the audit row. A duplicate jti returns
-- the original result without repeating any state change.
create or replace function public.process_apple_auth_notification(
  p_jti text,
  p_event_type text,
  p_apple_sub text,
  p_apple_sub_hash text,
  p_event_time timestamptz
)
returns table (
  notification_id uuid,
  resolved_user_id uuid,
  result_status text,
  is_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_ids uuid[];
  resolved_id uuid;
  inserted_id uuid;
  final_status text;
begin
  if p_jti is null or length(p_jti) not between 1 and 255
     or p_event_type is null or length(p_event_type) not between 1 and 64
     or p_apple_sub is null or length(p_apple_sub) not between 1 and 512
     or p_apple_sub_hash !~ '^[0-9a-f]{64}$'
     or p_event_time is null then
    raise exception 'INVALID_APPLE_NOTIFICATION';
  end if;

  select array_agg(distinct identity_user_id)
    into matched_user_ids
    from (
      select identities.user_id as identity_user_id
        from auth.identities
       where identities.provider = 'apple'
         and (
           identities.provider_id = p_apple_sub
           or identities.identity_data ->> 'sub' = p_apple_sub
         )
    ) matches;

  if coalesce(cardinality(matched_user_ids), 0) = 1 then
    resolved_id := matched_user_ids[1];
  end if;

  final_status := case
    when resolved_id is null then 'unresolved'
    when p_event_type = 'account-deleted' then 'review_required'
    when p_event_type in ('email-enabled', 'email-disabled', 'consent-revoked') then 'processed'
    else 'unknown'
  end;

  insert into public.apple_auth_notifications (
    jti,
    event_type,
    user_id,
    apple_sub_hash,
    event_time,
    status
  ) values (
    p_jti,
    p_event_type,
    resolved_id,
    p_apple_sub_hash,
    p_event_time,
    final_status
  )
  on conflict (jti) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return query
      select existing.id, existing.user_id, existing.status, true
        from public.apple_auth_notifications existing
       where existing.jti = p_jti;
    return;
  end if;

  if resolved_id is not null and p_event_type = 'email-enabled' then
    insert into public.apple_auth_account_states (
      user_id, apple_sub_hash, email_forwarding_enabled, authorization_status,
      account_deletion_required, last_event_type, last_event_at,
      last_notification_jti
    ) values (
      resolved_id, p_apple_sub_hash, true, 'active', false, p_event_type,
      p_event_time, p_jti
    )
    on conflict (user_id) do update
      set apple_sub_hash = excluded.apple_sub_hash,
          email_forwarding_enabled = true,
          last_event_type = excluded.last_event_type,
          last_event_at = excluded.last_event_at,
          last_notification_jti = excluded.last_notification_jti,
          updated_at = now();
  elsif resolved_id is not null and p_event_type = 'email-disabled' then
    insert into public.apple_auth_account_states (
      user_id, apple_sub_hash, email_forwarding_enabled, authorization_status,
      account_deletion_required, last_event_type, last_event_at,
      last_notification_jti
    ) values (
      resolved_id, p_apple_sub_hash, false, 'active', false, p_event_type,
      p_event_time, p_jti
    )
    on conflict (user_id) do update
      set apple_sub_hash = excluded.apple_sub_hash,
          email_forwarding_enabled = false,
          last_event_type = excluded.last_event_type,
          last_event_at = excluded.last_event_at,
          last_notification_jti = excluded.last_notification_jti,
          updated_at = now();
  elsif resolved_id is not null and p_event_type = 'consent-revoked' then
    insert into public.apple_auth_account_states (
      user_id, apple_sub_hash, authorization_status,
      account_deletion_required, last_event_type, last_event_at,
      last_notification_jti
    ) values (
      resolved_id, p_apple_sub_hash, 'consent_revoked', false, p_event_type,
      p_event_time, p_jti
    )
    on conflict (user_id) do update
      set apple_sub_hash = excluded.apple_sub_hash,
          authorization_status = 'consent_revoked',
          last_event_type = excluded.last_event_type,
          last_event_at = excluded.last_event_at,
          last_notification_jti = excluded.last_notification_jti,
          updated_at = now();
  elsif resolved_id is not null and p_event_type = 'account-deleted' then
    insert into public.apple_auth_account_states (
      user_id, apple_sub_hash, email_forwarding_enabled, authorization_status,
      account_deletion_required, last_event_type, last_event_at,
      last_notification_jti
    ) values (
      resolved_id, p_apple_sub_hash, false, 'account_deleted', true,
      p_event_type, p_event_time, p_jti
    )
    on conflict (user_id) do update
      set apple_sub_hash = excluded.apple_sub_hash,
          email_forwarding_enabled = false,
          authorization_status = 'account_deleted',
          account_deletion_required = true,
          last_event_type = excluded.last_event_type,
          last_event_at = excluded.last_event_at,
          last_notification_jti = excluded.last_notification_jti,
          updated_at = now();
  end if;

  return query select inserted_id, resolved_id, final_status, false;
end
$$;

revoke all on function public.process_apple_auth_notification(
  text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.process_apple_auth_notification(
  text, text, text, text, timestamptz
) to service_role;

commit;
;
