# 민턴동

배드민턴 클럽 운영, 공개 레슨 상품, PortOne V2/KG이니시스 결제를 제공하는
TanStack Start 애플리케이션입니다.

소스와 배포의 단일 기준은 GitHub
kev208dev/mintondong-11a19919 저장소의 main 브랜치입니다. 배포 대상은
Cloudflare Workers이며 GitHub Pages나 별도 에디터 호스팅은 사용하지 않습니다.

## 기술 구성

- TanStack Start + React + TypeScript
- Tailwind CSS
- 외부 Supabase mintondong 프로젝트
- PortOne V2 / KG이니시스
- Cloudflare Workers
- Capacitor iOS / Android shell

기존 Toss 테스트 코드는 후속 전환 판단 전까지 유지합니다.

## 로컬 실행

    git clone https://github.com/kev208dev/mintondong-11a19919.git
    cd mintondong-11a19919
    npm install
    cp .env.example .env
    npm run dev

.env에는 실제 개발 환경값을 입력합니다. secret은 커밋하지 않습니다.
Cloudflare Worker runtime을 포함한 production build와 preview는 다음과 같이 확인합니다.

    npm run build
    npm run preview

배포와 환경변수 설정은 [DEPLOYMENT.md](./DEPLOYMENT.md), PG 심사와 실제 상품 등록
순서는 [PG_REVIEW_SETUP.md](./PG_REVIEW_SETUP.md)를 확인하세요.

## 모바일 Release Candidate

네이티브 앱은 TanStack Start 서버 기능을 정적 SPA로 복제하지 않습니다. Capacitor가 로컬
부트스트랩/오프라인 화면을 먼저 표시한 뒤 허용된 민턴동 Production origin을 앱 WebView에서
엽니다. 따라서 Supabase 세션, Cloudflare server functions와 PortOne 서버 검증은 웹과 같은
코드를 사용합니다.

    npm install
    npm run mobile:sync
    npm run mobile:open:ios
    npm run mobile:open:android

Bundle/Application ID는 `capacitor.config.ts`의 `com.mintondong.app`에서 관리합니다. OAuth
callback, 네이티브 빌드와 스토어 제출 절차는 [docs/mobile-release.md](./docs/mobile-release.md),
남은 확인 항목은 [docs/release-checklist.md](./docs/release-checklist.md)를 확인하세요.

## 데이터 보호

- 외부 운영 Supabase 데이터를 초기화하거나 덮어쓰지 않습니다.
- 공개 레슨은 공개 클럽의 판매중인 실제 coaches 행만 사용합니다.
- 정산계좌, 멤버 명단, 예약자, 결제 원장은 공개 상품 응답에 포함하지 않습니다.
- PortOne 및 Supabase secret은 Workers server bundle에서만 읽습니다.

## Tournament Data Sources

대회 화면은 `tournaments`의 canonical 데이터와 `tournament_sources`의 출처를 서버 read
model로 읽습니다. 브라우저가 Facecock/CourtX를 직접 호출하거나 source DOM을 해석하지
않습니다. 목록 parser, normalizer, 고신뢰 deduplicator와 source adapter는
`src/lib/tournaments`에 분리되어 있습니다. 대회 상태는 한국 날짜 기준으로 대회/접수
날짜에서 계산하며 DB에 오래된 상태값을 저장하지 않습니다.

Facecock과 CourtX의 공개 페이지는 기술적으로 HTML 응답을 제공하지만, 확인한 이용약관에는
정보의 복제·제3자 제공 또는 사전 동의 없는 복제·배포 제한이 있습니다. 그래서 collector는
기본 비활성입니다. 운영자가 수집·표시에 필요한 허가와 최신 robots/약관을 확인한 source만
Worker runtime variable `TOURNAMENT_FACECOCK_ENABLED=true` 또는
`TOURNAMENT_COURTX_ENABLED=true`로 활성화해야 합니다. CAPTCHA, 로그인, rate limit은
우회하지 않습니다.

## Tournament Sync

먼저 `supabase/migrations/20260812235109_tournament_directory.sql`을 검토·적용하고 Worker
Secret `TOURNAMENT_SYNC_SECRET`을 등록합니다. 활성화된 source는 다음 서버 전용 endpoint로
동기화합니다.

    curl -X POST https://<production-domain>/api/tournaments/sync \
      -H "Authorization: Bearer <TOURNAMENT_SYNC_SECRET>"

동기화는 source별 목록을 한 번만 요청하고 timeout과 응답 크기를 제한합니다. 한 source의
실패는 다른 source를 중단시키지 않으며 결과와 건수만 `tournament_sync_runs`에 기록합니다.
secret과 외부 HTML 본문은 로그에 남기지 않습니다. Cloudflare Cron을 연결할 때도 같은
보호 endpoint 또는 server-only 호출 구조를 사용해야 합니다.

## Tournament Admin

외부 collector 허가 전에도 전역 `ADMIN` 계정은 `/admin/tournaments`에서 대회를 직접 등록,
수정, 비활성화할 수 있습니다. 수동 등록은 하나의 DB 함수 안에서 `tournaments` canonical
행과 `tournament_sources(source=MANUAL)` 행을 함께 저장합니다. 공개 목록과 상세에는
`is_active=true`인 대회만 표시되며 상태는 별도로 입력하지 않고 한국 date-only 기준으로
계산합니다.

먼저 다음 migration을 순서대로 적용합니다.

    supabase/migrations/20260812235109_tournament_directory.sql
    supabase/migrations/20260813022012_tournament_manual_admin.sql

초기 운영 관리자 지정은 Supabase SQL Editor에서 실제 사용자 ID를 확인한 뒤 service-role
권한으로 한 번만 수행합니다. 이메일이나 ID를 추측하지 않습니다.

    update public.profiles
       set role = 'ADMIN', updated_at = now()
     where id = '<확인한 auth.users.id>';

일반 사용자는 RLS와 column grant에 의해 자신의 `profiles.role`을 변경할 수 없고, 모든 관리자
write server function은 현재 access token 검증 후 서버에서 profile role을 다시 확인합니다.
