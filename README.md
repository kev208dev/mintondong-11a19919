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
