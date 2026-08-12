# PortOne / KG이니시스 PG 입점 심사 운영 체크리스트

이 문서는 **사이트 심사 준비용**입니다. 현재 코드에는 PortOne 실결제가 없으며 기존 Toss 테스트 코드와 의존성은 그대로 유지됩니다.

## 1. 배포 전에 반드시 입력할 사업자 정보

배포 환경변수에 아래 실제 값을 입력하세요. 이 값들은 공개 Footer와 `/business-info`, 법적 문서에 표시되므로 비밀값이 아닙니다. 확인되지 않은 값이나 예시 번호를 운영 환경에 넣지 마세요.

| 환경변수                             | 표시 내용                        | 필수 여부   |
| ------------------------------------ | -------------------------------- | ----------- |
| `VITE_BUSINESS_NAME`                 | 상호명                           | 필수        |
| `VITE_BUSINESS_REPRESENTATIVE_NAME`  | 대표자 및 개인정보 보호 담당자   | 필수        |
| `VITE_BUSINESS_REGISTRATION_NUMBER`  | 사업자등록번호                   | 필수        |
| `VITE_BUSINESS_ADDRESS`              | 사업장 주소                      | 필수        |
| `VITE_CUSTOMER_SERVICE_PHONE`        | 고객센터 전화                    | 필수        |
| `VITE_CUSTOMER_SERVICE_EMAIL`        | 고객센터 및 개인정보 문의 이메일 | 필수        |
| `VITE_ECOMMERCE_REGISTRATION_NUMBER` | 통신판매업 신고번호              | 신고한 경우 |
| `VITE_POLICY_EFFECTIVE_DATE`         | 약관·개인정보처리방침 시행일     | 필수        |

값을 입력하지 않으면 가짜 정보 대신 `운영자 입력 필요`가 표시됩니다. 이 상태로 PG 심사를 신청하지 마세요.

취소 시한과 예상 환불 기간이 사업적으로 확정되면 `src/config/refund-policy.ts`의 `cancellationDeadline`, `expectedRefundPeriod`를 실제 정책으로 변경하세요. 변경한 조건은 반드시 레슨 신청·결제 화면에도 동일하게 표시해야 합니다.

## 2. 공개/인증 라우트

로그인 없이 접근:

- `/`
- `/clubs/find`
- `/clubs/:clubId` 및 공개 클럽의 일정·레슨 정보
- `/terms`
- `/privacy`
- `/refund-policy`
- `/business-info`

기존 인증 유지:

- `/lessons`: 개인 예약·결제 화면
- `/me`
- `/club/*`, `/games`, `/records` 등 회원 활동·운영 화면

비로그인 사용자가 공개 레슨의 신청 버튼을 누르면 `/auth?next=/clubs/:clubId/lessons`로 이동합니다. 로그인 뒤 공개 레슨 원래 경로로 돌아옵니다.

공개 클럽 페이지는 클럽명·소개·지역·상품 정보만 노출합니다. 회원 이름과 멤버 명단은 로그인한 해당 클럽의 활성 회원에게만 표시됩니다.

## 3. DB 적용 및 상품 등록 순서

현재 운영 Supabase에는 `club-directory.sql`의 디렉터리 컬럼이 아직 없으므로 아래 순서를 지키세요. 저장소 코드를 배포하는 것만으로 DB migration이 실행되지는 않습니다.

1. `db/club-directory.sql`을 검토합니다. 기존 테이블/데이터를 삭제하지 않는 additive migration이며, 공개 범위와 권한이 운영 정책과 일치하는지 확인합니다.
2. 외부 Supabase 프로젝트 `tkumfwiomcxkdbzljyss`의 SQL Editor에서 검토한 SQL을 적용합니다.
3. `clubs`·`club_members`의 추가 컬럼, RLS 활성화, 정책과 table privilege를 확인합니다. `anon`은 `clubs`의 `is_public = true` 행만 조회할 수 있어야 하며 `club_members`에는 어떤 table privilege도 없어야 합니다.
4. 운영 계정으로 실제 공개 클럽을 생성합니다.
5. 해당 클럽에 실제 코치와 실제 수업 시간·가격(`coaches.price`, 원 단위)을 등록합니다.
6. 로그아웃 상태의 390px 모바일 화면에서 `/clubs/find`를 열어 공개 클럽만 보이는지 확인합니다.
7. 공개 클럽의 레슨 탭에서 실제 가격이 `30,000원 / 50분` 형식으로 정확히 표시되는지 확인합니다.

공개 클럽이어도 회원 명단은 공개되지 않습니다. DB에서 `anon`의 `club_members` 권한을 회수하고, RLS 정책도 `authenticated` 역할의 본인 멤버십·같은 클럽 active 회원·클럽 owner에게만 로스터 조회를 허용합니다. 따라서 UI 숨김 여부와 관계없이 이름, `user_id`, 역할, 레벨은 비로그인 API 요청으로 읽을 수 없습니다.

마이그레이션 전의 `clubs`에는 `is_public`이 없어 공개/비공개를 구분할 수 없습니다. 클라이언트의 `searchPublicClubs()`와 `getClub()` fallback은 service role을 사용하지 않고 기존 DB RLS가 허용한 클럽만 읽습니다. 반면 공개 레슨 서버 함수는 service role을 사용하므로 `is_public`을 확인할 수 없는 마이그레이션 전에는 안전하게 빈 목록을 반환합니다. 이 fail-closed 동작은 비공개 클럽이나 상품을 공개로 추측하는 위험을 피하기 위한 것입니다.

## 4. 공개 레슨 데이터

공개 레슨 페이지는 외부 Supabase `mintondong` 프로젝트의 다음 실제 데이터를 사용합니다.

- `clubs`: 클럽명, 장소, 레슨 운영 여부
- `coaches`: 코치명, 소개, 전문 분야, 대상 수준, 요일, 운영 시간, 수업 시간(`duration_min`), 가격(`price`)

공개 전용 서버 함수는 위 상품 필드만 반환합니다. `settlement_account`, `club_members`, 예약자, `lesson_bookings`, `payments`는 조회하지 않습니다. `is_public = true`인 클럽만 상품을 반환하며, 컬럼이 없거나 값이 true가 아니면 빈 목록을 반환합니다. 공개 조회에는 서버의 `SUPABASE_SERVICE_ROLE_KEY` 설정이 필요하며 키 자체는 브라우저에 노출되지 않습니다.

기존 `/lessons`는 `localStorage` 기반 demo store를 계속 사용하며 이번 작업에서 구조를 변경하지 않았습니다. 현재 저장소의 demo seed에는 코치나 가격이 들어 있지 않습니다. 공개 레슨 가격은 demo 값으로 대체하지 않으며 Supabase `coaches.price`에 등록된 값만 원 단위로 표시합니다.

위 DB 적용 순서를 완료한 뒤 다음을 추가로 확인하세요.

- 클럽이 공개 상태이고 `lessons_enabled`가 켜져 있는지
- 코치명, 소개, 장소, 요일·시간, 수업 시간, 실제 원화 가격이 정확한지
- 공개 URL에서 로그아웃 상태로 상품 카드와 `가격원 / 수업시간분` 표시가 보이는지
- 허위 상품, 허위 가격, 정산계좌 또는 예약자 정보가 노출되지 않는지

## 5. 결제 관련 범위

- `@tosspayments/tosspayments-sdk`, Toss 성공/실패 라우트와 서버 함수는 유지됩니다.
- 현재 Toss 기능은 테스트/준비 상태이며 운영 결제대행사로 개인정보처리방침에 확정 기재하지 않았습니다.
- PortOne SDK, 키, 결제 요청, webhook은 이번 작업에 추가하지 않았습니다.
- PortOne/KG이니시스 계약이 확정된 뒤 이용약관·개인정보처리방침·환불 정책의 결제대행사 및 처리 내용을 실제 계약과 일치하도록 갱신하세요.

## 6. 제출 전 수동 점검

1. 위 사업자 환경변수를 운영 배포에 입력하고 재배포합니다.
2. 실사업자 서류와 Footer·사업자 정보 페이지의 값이 한 글자까지 일치하는지 확인합니다.
3. 위 3절 순서로 migration 적용과 실제 상품 등록을 완료합니다. 가짜 심사용 상품은 만들지 않습니다.
4. 공개 클럽의 회원 명단이 로그아웃 상태에서 UI와 Supabase Data API 양쪽 모두 노출되지 않는지 확인합니다.
5. 모바일 390px 로그아웃 창에서 홈 → 동호회와 레슨 찾기 → 레슨 버튼 경로를 점검합니다.
6. 상품 신청 전에 가격·시간·장소·취소 조건이 확인 가능한지 점검합니다.
7. 실제 환불 기준과 처리 기간을 확정해 `src/config/refund-policy.ts`에 반영합니다.
8. PortOne/KG이니시스 실연동 전 키 관리, 서버 결제 검증, webhook, 중복 처리 방지와 환불 API 설계를 별도 작업으로 진행합니다.
