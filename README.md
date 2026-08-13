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
