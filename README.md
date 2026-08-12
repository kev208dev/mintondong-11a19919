# Mintondong Bridge

새 프로젝트로 민턴동 앱을 이관해 주세요. 기존 참조 프로젝트는 같은 워크스페이스의 프로젝트 ID `dd255d9a-3576-4edd-9e31-2af60fb4c099`(published: https://rally-fair-app.lovable.app)입니다. 기존 프로젝트의 UI/브랜딩/라우트/기능을 최대한 동일하게 재현하되, 이 새 프로젝트에서는 Lovable Cloud를 절대 활성화하거나 사용하지 마세요. 백엔드는 사용자가 이미 보유한 외부 Supabase 프로젝트 `mintondong` (project ref: `tkumfwiomcxkdbzljyss`)만 사용해야 합니다. 이 Supabase에는 기존 Lovable Cloud의 14개 public 테이블/RLS/프로필 생성 트리거까지 이미 동일하게 마이그레이션되어 있으므로 DB 스키마를 새로 만들거나 초기화하거나 덮어쓰지 마세요. 기존 코드 구조(TanStack Start + React + Tailwind/shadcn)를 유지하고, 특히 다음을 그대로 옮겨 주세요: 민턴동 로고/브랜딩, 5개 하단 탭(오늘/경기/레슨/기록/모임), /auth, /me 마이페이지, 클럽/역할/권한/출석/경기/레슨/기록/재정 UI, Toss는 준비중 상태 유지. 인증은 외부 Supabase Auth 기준으로 통일하세요. 이메일/비밀번호와 Kakao는 Supabase Auth로 연결하고, Apple/Google도 Lovable 관리형 auth를 쓰지 말고 Supabase Auth 기반으로 전환할 준비를 하되 provider 자격증명이 없으면 UI를 깨뜨리거나 임의의 키를 넣지 마세요. Kakao는 이미 외부 Supabase에서 provider 설정을 완료한 상태입니다. 로그인 성공 후 기존 /me에서 계정/클럽/역할/활동 상태가 보이게 유지하세요. 기존 프로젝트의 실제 데이터는 복사하지 말고, 기존 프로젝트도 수정/삭제하지 마세요. 새 프로젝트에서 외부 Supabase 연결이 계정 승인 때문에 수동 선택이 필요하면 코드 생성은 멈추지 말고, 필요한 정확한 연결 단계만 응답에 남기세요. 완료 후 typecheck/build, 390px 모바일 overflow, 콘솔 오류를 점검하고 변경/남은 수동 작업을 요약해 주세요.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mintondong.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8272dbe0-2072-474a-af0d-03f6ef9eb5fa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## PG 입점 심사 준비

공개 사업자 정보, 법적 페이지, 공개 레슨 상품 노출과 배포 전 수동 작업은 [PG_REVIEW_SETUP.md](./PG_REVIEW_SETUP.md)를 확인하세요. 저장소에는 확인되지 않은 사업자 정보나 가짜 레슨·가격을 넣지 않습니다.
