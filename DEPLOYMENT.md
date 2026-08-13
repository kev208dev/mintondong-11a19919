# Cloudflare Workers 배포

## 배포 기준

- Repository: kev208dev/mintondong-11a19919
- Production branch: main
- Worker name: mintondong-11a19919
- Hosting: Cloudflare Workers

GitHub Pages는 정적 파일만 호스팅하므로 사용하지 않습니다. 민턴동은 TanStack Start
server functions, Supabase service role 조회, PortOne 서버 검증·취소·webhook과 서버
secret이 필요합니다.

## 로컬 실행

일반 개발 서버:

    git clone https://github.com/kev208dev/mintondong-11a19919.git
    cd mintondong-11a19919
    npm install
    cp .env.example .env
    npm run dev

Cloudflare Vite runtime의 production build와 로컬 preview:

    npm run build
    npm run preview

Worker 설정 타입을 갱신해야 할 때:

    npm run cf-typegen

실제 배포 권한이 있는 운영자만 npm run deploy를 실행합니다. 이 명령은 build 후
Wrangler로 production Worker를 배포합니다.

## 환경변수

첫 배포에 반드시 필요한 브라우저 공개 build 변수:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_PORTONE_ENABLED=false (결제 준비 전)

`VITE_PORTONE_ENABLED=false`인 동안 PortOne Store/Channel과 서버 secret이 없어도 회원가입,
클럽 생성, 레슨 관리와 공개 레슨 확인이 가능합니다. 결제를 성공으로 가장하는 fallback은
없으며 결제 호출은 비활성 상태로 유지됩니다.

PortOne 활성화 및 PG 심사 전에 추가할 브라우저 공개 build 변수:

- VITE_PORTONE_STORE_ID=store-81345dbd-4a7e-49ce-b68f-f1c9465294c2
- VITE_PORTONE_CHANNEL_KEY=channel-key-f8da7be3-4a42-4e83-a7a9-f5926b6fec7d
- VITE_PORTONE_ENABLED=true
- VITE_BUSINESS_NAME
- VITE_BUSINESS_REPRESENTATIVE_NAME
- VITE_BUSINESS_REGISTRATION_NUMBER
- VITE_BUSINESS_ADDRESS
- VITE_CUSTOMER_SERVICE_PHONE
- VITE_CUSTOMER_SERVICE_EMAIL
- VITE_ECOMMERCE_REGISTRATION_NUMBER
- VITE_POLICY_EFFECTIVE_DATE
- VITE_REFUND_CANCELLATION_DEADLINE
- VITE_REFUND_EXPECTED_PROCESSING_PERIOD

첫 배포에 반드시 필요한 Workers runtime secret:

- SUPABASE_SERVICE_ROLE_KEY
- TOURNAMENT_SYNC_SECRET

이 값은 Cloudflare Worker의 Runtime Settings → Variables and Secrets에 Secret 타입으로
등록합니다. Git build에서 Dashboard runtime secret의 존재 여부를 확인할 수 없으므로
`wrangler.jsonc`의 `secrets.required`로 검증하지 않습니다. 값이 없으면 service-role이
필요한 서버 함수가 `SUPABASE_SERVICE_ROLE_KEY_MISSING`으로 안전하게 실패합니다.

대회 동기화 endpoint의 bearer secret은 실제 값을 저장소나 shell history에 쓰지 않고 다음
대화형 명령으로 등록합니다.

    npx wrangler secret put TOURNAMENT_SYNC_SECRET

Facecock/CourtX는 허가 확인 전까지 각각 `TOURNAMENT_FACECOCK_ENABLED=false`,
`TOURNAMENT_COURTX_ENABLED=false`를 유지합니다. 수동 등록에는 collector 활성화가 필요하지
않습니다.

`VITE_PORTONE_ENABLED=true`로 테스트 결제를 활성화하기 전에 반드시 추가해야 하는 Workers
runtime secret:

- PORTONE_API_SECRET

Standard Webhooks 서명 검증을 위한 다음 secret은 운영 실결제 전에 추가합니다.

- PORTONE_WEBHOOK_SECRET

Sign in with Apple server-to-server notification 검증에는 private key가 아니라 Apple 공개
JWKS를 사용합니다. Worker의 비밀값이 아닌 server runtime 변수로 Primary App ID를 설정합니다.

- APPLE_NOTIFICATION_AUDIENCE=com.mintondong.app

이 값은 browser OAuth용 Services ID인 `APPLE_CLIENT_ID`와 구분됩니다. Apple Developer의
Server-to-Server Notification Endpoint는 다음 Production URL과 정확히 일치해야 합니다.

    https://mintondong-11a19919.kev208dev.workers.dev/api/apple/notifications

`20260813112445_apple_auth_notifications.sql`을 먼저 적용해야 알림의 `jti` 멱등성, Apple
provider subject 매핑과 server-only audit가 동작합니다. endpoint는 Apple JWS의 RS256 서명,
issuer와 위 audience를 검증한 뒤에만 기록합니다. `consent-revoked`는 Apple 권한 상태만
기록하며, `account-deleted`도 기존 클럽 소유권·결제 원장 보존 절차를 우회해 사용자를 즉시
삭제하지 않고 검토 필요 상태로 기록합니다.

PortOne API secret이 없으면 결제 단건조회·완료·취소가 실패하도록 구현되어 있습니다.
또한 결제 준비 단계에서 API secret을 먼저 확인하므로, secret이 없으면 내부 주문 생성과
브라우저 결제창 호출 전에 안전하게 중단됩니다.
Webhook secret이 없을 때도 webhook payload의 상태나 금액을 신뢰하지 않고 paymentId로
PortOne API를 재조회합니다. API secret도 없다면 결제를 완료 처리하지 않습니다.

선택적인 기존 Toss 테스트 secret:

- TOSS_SECRET_KEY와 ORDER_SIGNING_SECRET은 기존 Toss 테스트 기능을 사용할 때만 필요

secret에는 VITE_ 접두사를 붙이지 않습니다. wrangler.jsonc, GitHub 또는 Cloudflare
build log에 실제 값을 넣지 않습니다. 로컬 secret은 gitignore된 .env 또는 .dev.vars
중 하나에만 저장하고, production secret은 Cloudflare Dashboard의
Settings → Variables and Secrets에서 Secret 형식으로 등록합니다.

공개 VITE_ 값은 Workers Builds의 build variables에 입력해야 Vite client bundle에
반영됩니다. server secret은 Worker runtime variables에만 등록합니다.

현재 KG이니시스 V2 테스트 채널은 위 Store ID와 `INIpayTest` MID에 연결된 Channel Key를
사용합니다. 두 값은 브라우저 공개 식별값이며 코드의 안전한 fallback에도 동일하게
기록되어 있습니다. `VITE_PORTONE_ENABLED`는 fallback하지 않으므로 Workers Builds에서
반드시 `true`로 설정합니다.
웹결제 signkey, INIAPI Key/IV, INILite Key, hashKey는 PortOne 채널 내부 PG 자격정보이므로
민턴동 환경변수, Worker 설정 또는 저장소에 복사하지 않습니다. Store ID는 PortOne 콘솔에서
확인한 실제 값만 입력하며 Channel Key나 MID로 추측하지 않습니다.

## GitHub 자동 배포 연결

Cloudflare Git 연결은 다음 값으로 설정되어 있습니다.

- Repository: kev208dev/mintondong-11a19919
- Production branch: main
- Build command: npm run build
- Deploy command: npx wrangler deploy

Cloudflare Dashboard의 Workers Builds에는 위 세 `VITE_*` 공개 build variables를
등록합니다. `SUPABASE_SERVICE_ROLE_KEY`는 Worker Runtime Settings → Variables and
Secrets에 Secret 타입으로 별도 등록합니다. 이후 main에 새 commit이 push되면 자동 build와
deployment가 시작됩니다.

첫 배포 예상 URL은 다음과 같으며 실제 배포 완료 후 Dashboard와 브라우저에서 확인합니다.

    https://mintondong-11a19919.kev208dev.workers.dev

## Custom domain과 PortOne

PG 심사 전에 Worker의 Settings → Domains & Routes에서 실제 소유한 custom domain을
연결합니다. 아직 도메인이 확정되지 않았으므로 저장소에는 가짜 도메인을 넣지 않습니다.

custom domain 연결과 HTTPS 확인 후 PortOne Console의 webhook URL을 다음 실제 주소로
변경합니다.

    https://<production-domain>/api/portone/webhook

webhook은 route handler에서 JSON parsing 전에 request.text()로 raw body를 읽고
PortOne server SDK의 Standard Webhooks 검증에 전달합니다. 배포 후 서명 검증,
중복 webhook, 결제 단건 재조회까지 실제 채널에서 확인합니다.

## 배포 전 순서

1. 미적용 Supabase migration(대회 directory, manual admin,
   `20260813035134_account_deletion.sql` 포함)을 검토하고 적용합니다. 계정 삭제 UI는 migration이
   없으면 안전하게 실행을 거부합니다.
2. 실제 클럽과 판매중 레슨을 등록합니다.
3. npm run build, npm run test:portone, 관련 테스트를 실행합니다.
4. Workers Builds 변수와 secret을 입력합니다.
5. workers.dev에서 로그아웃 공개 경로와 로그인 결제를 점검합니다.
6. custom domain을 연결하고 PortOne webhook URL을 갱신합니다.
