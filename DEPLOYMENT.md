# Cloudflare Workers 배포

## 배포 기준

- Repository: kev208dev/mintondong-11a19919
- Production branch: main
- Worker name: mintondong
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

브라우저 공개 build 변수:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_PORTONE_STORE_ID
- VITE_PORTONE_CHANNEL_KEY
- VITE_PORTONE_ENABLED
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

Workers runtime secret:

- SUPABASE_SERVICE_ROLE_KEY
- PORTONE_API_SECRET
- PORTONE_WEBHOOK_SECRET
- TOSS_SECRET_KEY와 ORDER_SIGNING_SECRET은 기존 Toss 테스트 기능을 사용할 때만 필요

secret에는 VITE_ 접두사를 붙이지 않습니다. wrangler.jsonc, GitHub 또는 Cloudflare
build log에 실제 값을 넣지 않습니다. 로컬 secret은 gitignore된 .env 또는 .dev.vars
중 하나에만 저장하고, production secret은 Cloudflare Dashboard의
Settings → Variables and Secrets에서 Secret 형식으로 등록합니다.

공개 VITE_ 값은 Workers Builds의 build variables에 입력해야 Vite client bundle에
반영됩니다. server secret은 Worker runtime variables에만 등록합니다.

## GitHub 자동 배포 연결

1. Cloudflare Dashboard에서 Workers & Pages → Create → Import a repository로 이동합니다.
2. Cloudflare Workers and Pages GitHub App에
   kev208dev/mintondong-11a19919 저장소 접근을 허용합니다.
3. production branch를 main으로 지정합니다.
4. Build command는 npm run build, Deploy command는 npx wrangler deploy로 둡니다.
5. 공개 VITE_ build variables와 위 runtime secrets를 각각 등록합니다.
6. 저장 후 main push가 자동 build와 deployment를 만드는지 확인합니다.

첫 배포 URL은 Cloudflare 계정 subdomain을 추측하지 않고 Dashboard에서 확인합니다.
형식은 https://mintondong.&lt;account-subdomain&gt;.workers.dev 입니다.

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

1. 미적용 Supabase migration을 검토하고 운영자가 SQL Editor에서 적용합니다.
2. 실제 클럽과 판매중 레슨을 등록합니다.
3. npm run build, npm run test:portone, 관련 테스트를 실행합니다.
4. Workers Builds 변수와 secret을 입력합니다.
5. workers.dev에서 로그아웃 공개 경로와 로그인 결제를 점검합니다.
6. custom domain을 연결하고 PortOne webhook URL을 갱신합니다.
