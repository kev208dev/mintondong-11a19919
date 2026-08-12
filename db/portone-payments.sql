-- PortOne V2 결제 주문 저장용 additive migration.
-- 운영 DB에서 직접 자동 실행하지 않는다. SQL Editor에서 검토 후 전체 파일을 실행한다.
-- 기존 payments/lesson_bookings 행을 삭제하거나 테이블을 재생성하지 않는다.

begin;

alter type public.payment_provider add value if not exists 'PORTONE';

-- 레슨 상품 결제는 아직 특정 예약 일시가 선택되기 전 만들어진다. 기존 예약 결제의 booking_id는
-- 그대로 유지하면서 PortOne 사전 주문에 한해 nullable을 허용하고 coach/user를 직접 연결한다.
alter table public.payments
  alter column booking_id drop not null,
  add column if not exists user_id uuid references auth.users(id) on delete restrict,
  add column if not exists coach_id uuid references public.coaches(id) on delete restrict,
  add column if not exists portone_payment_id text,
  add column if not exists portone_transaction_id text,
  add column if not exists portone_status text,
  add column if not exists portone_store_id text,
  add column if not exists portone_channel_key text,
  add column if not exists currency text not null default 'KRW',
  add column if not exists order_name text,
  add column if not exists verified_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_amount integer not null default 0,
  add column if not exists cancel_idempotency_key text,
  add column if not exists cancel_requested_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_portone_payment_id_format'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments add constraint payments_portone_payment_id_format check (
      portone_payment_id is null
      or (char_length(portone_payment_id) between 16 and 64
          and portone_payment_id ~ '^[A-Za-z0-9_-]+$')
    );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_portone_order_integrity'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments add constraint payments_portone_order_integrity check (
      provider::text <> 'PORTONE'
      or (
        portone_payment_id is not null and user_id is not null and coach_id is not null
        and portone_store_id is not null and portone_channel_key is not null
        and amount > 0 and currency = 'KRW' and booking_id is null
      )
    );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_cancelled_amount_valid'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments add constraint payments_cancelled_amount_valid check (
      cancelled_amount >= 0 and cancelled_amount <= amount
    );
  end if;
end
$$;

create unique index if not exists payments_portone_payment_id_unique
  on public.payments (portone_payment_id)
  where portone_payment_id is not null;
create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc)
  where user_id is not null;
create index if not exists payments_coach_created_idx
  on public.payments (coach_id, created_at desc)
  where coach_id is not null;

-- PortOne 주문 생성/검증/취소는 service_role 서버 함수만 수행한다. 브라우저가 금액이나 상태를
-- 직접 쓰거나 읽지 않도록 table privilege를 부여하지 않는다. 기존 정책이 있더라도 grant가 없어
-- anon/authenticated Data API 직접 접근은 차단된다.
revoke all on table public.payments from anon;
revoke all on table public.payments from authenticated;
grant all on table public.payments to service_role;
alter table public.payments enable row level security;

comment on column public.payments.portone_payment_id is
  '민턴동 서버가 생성한 PortOne V2 고유 paymentId. 브라우저 입력값을 사용하지 않음.';
comment on column public.payments.verified_at is
  'PortOne 결제 단건조회 API와 내부 주문의 ID/금액/상점/채널/PG/통화를 대조한 시각.';
comment on column public.payments.cancel_idempotency_key is
  '서버가 전액 취소 요청에 사용한 PortOne Idempotency-Key.';

commit;
