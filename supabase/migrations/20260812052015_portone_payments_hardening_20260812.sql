begin;

drop policy if exists "club scoped payments" on public.payments;

revoke all on table public.payments from public;
revoke all on table public.payments from anon;
revoke all on table public.payments from authenticated;
grant all on table public.payments to service_role;

alter table public.payments enable row level security;

comment on table public.payments is
  '결제 주문 원장. anon/authenticated 직접 접근 없이 service_role 서버 함수로만 처리한다.';

commit;;
