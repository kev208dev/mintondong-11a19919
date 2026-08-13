# PortOne / KG이니시스 PG 입점 심사 운영 체크리스트

이 문서는 **사이트 심사 및 PortOne V2/KG이니시스 활성화 준비용**입니다. PortOne 결제창·서버 검증·웹훅·취소 구조가 추가되었고 기존 Toss 테스트 코드와 의존성은 그대로 유지됩니다. 환경값과 DB migration이 준비되지 않으면 결제는 fail-closed 상태로 비활성화됩니다.

## 1. 배포 전에 반드시 입력할 사업자 정보

배포 환경변수에 아래 실제 값을 입력하세요. 이 값들은 공개 Footer와 `/business-info`, 법적 문서에 표시되므로 비밀값이 아닙니다. 확인되지 않은 값이나 예시 번호를 운영 환경에 넣지 마세요.

| 환경변수                             | 표시 내용                         | 필수 여부   |
| ------------------------------------ | --------------------------------- | ----------- |
| `VITE_BUSINESS_NAME`                 | 상호명                            | 필수        |
| `VITE_BUSINESS_REPRESENTATIVE_NAME`  | 대표자 및 개인정보 보호 담당자    | 필수        |
| `VITE_BUSINESS_REGISTRATION_NUMBER`  | 사업자등록번호                    | 필수        |
| `VITE_BUSINESS_ADDRESS`              | 사업장 주소                       | 필수        |
| `VITE_CUSTOMER_SERVICE_PHONE`        | 사업자 명의 일반전화/전국대표번호 | 필수        |
| `VITE_CUSTOMER_SERVICE_EMAIL`        | 고객센터 및 개인정보 문의 이메일  | 필수        |
| `VITE_ECOMMERCE_REGISTRATION_NUMBER` | 통신판매업 신고번호               | 신고한 경우 |
| `VITE_POLICY_EFFECTIVE_DATE`         | 약관·개인정보처리방침 시행일      | 필수        |

값을 입력하지 않으면 가짜 정보 대신 `운영자 입력 필요`가 표시됩니다. 이 상태로 PG 심사를 신청하지 마세요.

`010` 휴대전화만 입력하면 `/business-info`에 PG 심사 미준비 경고가 표시됩니다. 사업자 명의 일반전화 또는 전국대표번호를 입력하세요.

취소 시한과 예상 환불 기간이 사업적으로 확정되면 `VITE_REFUND_CANCELLATION_DEADLINE`, `VITE_REFUND_EXPECTED_PROCESSING_PERIOD`에 실제 정책 문구를 입력하세요. 둘 중 하나라도 없으면 checkout에서 결제를 시작할 수 없습니다.

## 2. 공개/인증 라우트

로그인 없이 접근:

- `/`
- `/clubs/find`
- `/clubs/:clubId` 및 공개 클럽의 일정·레슨 정보
- `/terms`
- `/privacy`
- `/refund-policy`
- `/business-info`
- `/clubs/:clubId/lessons/:lessonId/checkout`의 상품·정책 확인 화면(결제 실행은 로그인 필요)

기존 인증 유지:

- `/lessons`: 개인 예약·결제 화면
- `/me`
- `/club/*`, `/games`, `/records` 등 회원 활동·운영 화면

비로그인 사용자가 공개 레슨의 신청 버튼을 누르면 checkout을 복귀 경로로 보존해 `/auth`로 이동합니다. 로그인 뒤 실제 Supabase 상품 checkout으로 돌아옵니다.

공개 클럽 페이지는 클럽명·소개·지역·상품 정보만 노출합니다. 회원 이름과 멤버 명단은 로그인한 해당 클럽의 활성 회원에게만 표시됩니다.

## 3. DB 적용 및 상품 등록 순서

현재 운영 Supabase에는 club-directory와 PortOne 결제 migration이 적용되어 있습니다.
새 레슨 관리 migration은 저장소에만 있으며 자동 실행되지 않으므로 아래 순서를 지키세요.

1. 이미 적용된 `db/club-directory.sql`의 결과를 확인합니다. `clubs`·`club_members`의 추가 컬럼, RLS 활성화, 정책과 table privilege가 기준이며, `anon`은 `clubs`의 `is_public = true` 행만 조회할 수 있어야 하고 `club_members`에는 어떤 table privilege도 없어야 합니다.
2. 이미 적용된 `db/portone-payments.sql`과 `supabase/migrations/20260812051103_portone_payments_hardening.sql`의 결과를 확인합니다. `payments_portone_payment_id_unique`와 제약조건, `anon`/`authenticated`의 table privilege 회수, `service_role` 전용 접근을 유지합니다.
3. 아직 적용하지 않은 `supabase/migrations/20260812055429_coach_lesson_management.sql`을 검토하고 외부 Supabase 프로젝트 `tkumfwiomcxkdbzljyss`의 SQL Editor에서 적용합니다. 이 migration은
   coaches.is_active와 owner/active admin 최소권한을 추가하며 기존 행을 삭제하지 않습니다.
4. 적용 후 `coaches.is_active`, check constraint, RLS와 column privilege를 확인합니다. `anon`과 일반 member는 쓰지 못하고 해당 클럽의 active owner/admin만 안전한 상품 필드를 쓸 수 있어야 합니다.
5. 운영자가 회원가입 → 클럽 생성 → 동호회 관리 → 레슨 관리로 이동합니다.
6. 실제 코치, 소개, 대상, 요일·시간, 수업시간과 원 단위 가격을 입력하고 판매중으로 저장합니다.
7. 공개 페이지에서 보기를 눌러 저장한 실제 데이터가 즉시 노출되는지 확인합니다.
8. 로그아웃 상태의 390px 모바일 화면에서 홈 → 동호회 찾기 → 공개 클럽 → 레슨 →
   checkout으로 이동해 상품·가격·취소 정책과 사업자정보를 확인합니다.
9. 로그인 후에만 checkout의 PortOne 결제 호출이 가능한지 확인합니다.

공개 클럽이어도 회원 명단은 공개되지 않습니다. DB에서 `anon`의 `club_members` 권한을 회수하고, RLS 정책도 `authenticated` 역할의 본인 멤버십·같은 클럽 active 회원·클럽 owner에게만 로스터 조회를 허용합니다. 따라서 UI 숨김 여부와 관계없이 이름, `user_id`, 역할, 레벨은 비로그인 API 요청으로 읽을 수 없습니다.

`club-directory.sql`은 스키마/RLS/RPC와 Storage bucket/policy까지 하나의 PostgreSQL transaction으로 적용합니다. 어느 단계에서든 실패하면 전체가 rollback되며, `IF EXISTS`, `IF NOT EXISTS`, policy drop/create, bucket upsert를 사용하므로 원인을 수정한 뒤 SQL 전체를 다시 실행할 수 있습니다. authenticated 사용자는 `club_members`를 직접 INSERT/UPDATE/DELETE할 수 없고, 클럽 생성·가입·owner의 role/status 변경은 입력과 변경 컬럼을 검증하는 전용 RPC만 사용합니다.

마이그레이션 전의 `clubs`에는 `is_public`이 없어 공개/비공개를 구분할 수 없습니다. 클라이언트의 `searchPublicClubs()`와 `getClub()` fallback은 service role을 사용하지 않고 기존 DB RLS가 허용한 클럽만 읽습니다. 반면 공개 레슨 서버 함수는 service role을 사용하므로 `is_public`을 확인할 수 없는 마이그레이션 전에는 안전하게 빈 목록을 반환합니다. 이 fail-closed 동작은 비공개 클럽이나 상품을 공개로 추측하는 위험을 피하기 위한 것입니다.

## 4. 공개 레슨 데이터

2026-08-12 확인 시 운영 Supabase의 clubs와 coaches는 모두 0건입니다. 따라서 현재 심사자가
볼 실제 상품도 없습니다. 코드와 migration은 demo 상품, seed, 가짜 가격을 만들지 않습니다.
첫 클럽 운영자가 레슨 관리 화면에서 입력한 실제 coaches 행만 공개됩니다.

공개 레슨 페이지는 외부 Supabase `mintondong` 프로젝트의 다음 실제 데이터를 사용합니다.

- `clubs`: 클럽명, 장소, 레슨 운영 여부
- `coaches`: 코치명, 소개, 전문 분야, 대상 수준, 요일, 운영 시간, 수업 시간(`duration_min`), 가격(`price`)

공개 전용 서버 함수는 위 상품 필드만 반환합니다. `settlement_account`, `club_members`, 예약자, `lesson_bookings`, `payments`는 조회하지 않습니다. `is_public = true`인 클럽만 상품을 반환하며, 컬럼이 없거나 값이 true가 아니면 빈 목록을 반환합니다. 공개 조회에는 서버의 `SUPABASE_SERVICE_ROLE_KEY` 설정이 필요하며 키 자체는 브라우저에 노출되지 않습니다.

레슨 관리 migration 적용 후에는 coaches.is_active=true, 가격과 수업시간이 0보다 큰 상품만
공개 catalog와 checkout에 포함됩니다. migration 전처럼 판매 상태를 확인할 수 없는 경우에는
기존 행을 공개로 추측하지 않고 빈 목록/결제 불가로 처리합니다. 판매중지는 행을 삭제하지 않고
is_active=false로 변경하므로 기존 결제와 향후 예약 참조를 보존합니다.

기존 `/lessons`는 `localStorage` 기반 demo store를 계속 사용하며 이번 작업에서 구조를 변경하지 않았습니다. 현재 저장소의 demo seed에는 코치나 가격이 들어 있지 않습니다. 공개 레슨 가격은 demo 값으로 대체하지 않으며 Supabase `coaches.price`에 등록된 값만 원 단위로 표시합니다.

위 DB 적용 순서를 완료한 뒤 다음을 추가로 확인하세요.

- 클럽이 공개 상태이고 `lessons_enabled`가 켜져 있는지
- 레슨 상품이 판매중 상태인지
- 코치명, 소개, 장소, 요일·시간, 수업 시간, 실제 원화 가격이 정확한지
- 공개 URL에서 로그아웃 상태로 상품 카드와 `가격원 / 수업시간분` 표시가 보이는지
- 허위 상품, 허위 가격, 정산계좌 또는 예약자 정보가 노출되지 않는지

## 5. PortOne 환경변수와 결제 생명주기

브라우저 공개값:

- `VITE_PORTONE_STORE_ID=store-81345dbd-4a7e-49ce-b68f-f1c9465294c2`: PortOne V2 상점 ID
- `VITE_PORTONE_CHANNEL_KEY=channel-key-f8da7be3-4a42-4e83-a7a9-f5926b6fec7d`: KG이니시스 V2 테스트 채널 키
- `VITE_PORTONE_ENABLED=true`: DB·정책·계약·채널 검증 뒤 마지막에 활성화

서버 secret:

- `PORTONE_API_SECRET`: 결제 단건조회 및 취소 API 인증
- `PORTONE_WEBHOOK_SECRET`: Standard Webhooks 서명 검증 secret

서버 secret에는 절대 `VITE_` 접두사를 붙이지 말고 브라우저 환경에 주입하지 마세요. PortOne 콘솔에서 KG이니시스 V2 채널을 만들고 상점 ID/채널 키를 등록하며, webhook URL은 `https://<운영도메인>/api/portone/webhook`으로 설정합니다. webhook secret 미설정 시 payload 자체의 상태·금액은 신뢰하지 않고 내부 주문 존재를 확인한 후 단건조회합니다. KG이니시스 테스트 결제 단계에서는 이 fail-safe 구조를 사용할 수 있지만 운영 실결제 전에는 Standard Webhooks secret을 반드시 등록하세요.

KG이니시스 테스트 MID `INIpayTest`의 웹결제 signkey, INIAPI Key/IV, INILite Key,
hashKey는 PortOne 채널 설정에만 보관합니다. 앱 환경변수나 GitHub에 입력하지 않습니다.

결제 흐름은 다음과 같습니다.

1. 서버가 인증 사용자를 확인하고 `clubs.is_public=true`, `lessons_enabled=true`, 실제 `coaches.price/duration_min > 0`을 다시 조회합니다.
2. 서버가 ASCII 고유 `paymentId`를 만들고 실제 원화 금액으로 내부 PENDING 주문을 저장합니다.
3. 브라우저는 서버 응답으로만 `PortOne.requestPayment`를 호출합니다.
4. 결제창 성공 결과나 webhook payload만으로 PAID 처리하지 않습니다. 서버가 `GET /payments/{paymentId}`를 호출해 ID·금액·통화·상점·채널·KG이니시스를 대조한 뒤 상태를 반영합니다.
5. 중복 완료 요청과 webhook은 같은 고유 주문을 다시 동기화하므로 멱등적으로 처리됩니다.
6. 취소는 브라우저 금액을 받지 않습니다. 서버가 단건조회로 취소 가능 전액을 계산하고 quoted `Idempotency-Key`로 취소 API를 호출한 뒤 다시 조회합니다.

검증 정보가 일치하지 않으면 실제 PortOne 결제가 완료되었을 가능성을 배제할 수 없으므로 주문을 `FAILED`로 확정하지 않습니다. 내부 상태는 `PENDING` review로 두고 `PORTONE_VERIFICATION_MISMATCH`를 기록하며, 고객에게 다시 결제하지 말고 고객센터에 문의하도록 안내합니다. 이 review가 해소되기 전에는 같은 사용자·레슨의 신규 주문도 서버에서 차단합니다.

`settlement_account`, `club_members`, `lesson_bookings`, 예약자 목록, 다른 사용자 주문은 공개 상품이나 checkout 응답에 포함되지 않습니다.

## 6. 기존 Toss 영향

- `@tosspayments/tosspayments-sdk`, Toss 성공/실패 라우트와 서버 함수는 유지됩니다.
- 현재 Toss 기능은 테스트/준비 상태이며 운영 결제대행사로 개인정보처리방침에 확정 기재하지 않았습니다.
- PortOne은 additive하게 추가되었으며 Toss 파일·라우트·의존성은 삭제하거나 변경하지 않았습니다.
- 계약 확정 뒤 이용약관·개인정보처리방침의 실제 수탁자, 위탁 범위와 보유기간을 계약서와 일치하도록 갱신하세요.

## 7. 제출 전 수동 점검

1. 위 사업자 환경변수를 운영 배포에 입력하고 재배포합니다.
2. 실사업자 서류와 Footer·사업자 정보 페이지의 값이 한 글자까지 일치하는지 확인합니다.
3. 위 3절 순서로 migration 적용과 실제 상품 등록을 완료합니다. 가짜 심사용 상품은 만들지 않습니다.
4. 공개 클럽의 회원 명단이 로그아웃 상태에서 UI와 Supabase Data API 양쪽 모두 노출되지 않는지 확인합니다.
5. 모바일 390px 로그아웃 창에서 홈 → 동호회와 레슨 찾기 → 레슨 버튼 경로를 점검합니다.
6. 상품 신청 전에 가격·시간·장소·취소 조건이 확인 가능한지 점검합니다.
7. 실제 환불 기준과 처리 기간을 두 환불 환경변수에 반영합니다.
8. `db/portone-payments.sql`을 별도 검수·적용하고 PortOne/KG이니시스 운영 채널과 webhook을 설정합니다.
9. 테스트 결제로 PAID, 중복 완료, 중복 webhook, 취소 후 CANCELLED 상태와 관리자 콘솔 금액을 대조합니다.
10. 상호·대표자·사업자등록번호·주소·일반전화·통신판매업 신고번호가 서류와 일치하는지 최종 확인한 뒤 `VITE_PORTONE_ENABLED=true`로 배포합니다.
