# 민턴동 모바일 Release Candidate

## Architecture

- Source of truth: `kev208dev/mintondong-11a19919`의 `main`
- Web origin: `https://mintondong-11a19919.kev208dev.workers.dev`
- Native runtime: Capacitor 8.5
- Bundle/Application ID: `com.mintondong.app`
- Display name: `민턴동`
- Deep-link scheme: `mintondong://`

민턴동은 TanStack Start server functions, Cloudflare runtime secrets, Supabase service role 조회,
PortOne 결제 검증과 webhook에 의존한다. 이를 로컬 정적 SPA로 바꾸면 인증과 결제 보안 구조를
다시 작성해야 하므로 앱에는 `mobile-web` 부트스트랩만 포함하고 연결 후 허용된 Production
HTTPS origin으로 이동한다. `capacitor.config.ts`는 `server.url`을 사용하지 않고 해당 host만
`allowNavigation`에 등록한다. 최초 연결 실패는 민턴동 오프라인 화면에서 재시도할 수 있다.

## Setup and build

    git clone https://github.com/kev208dev/mintondong-11a19919.git
    cd mintondong-11a19919
    npm install
    npm run build
    npm run mobile:sync

iOS:

    npm run mobile:ios
    npm run mobile:open:ios

Android:

    npm run mobile:android
    npm run mobile:open:android

Native 프로젝트는 `ios/`, `android/`에 커밋한다. Xcode signing, Android release keystore,
`local.properties`, `.env`, `*.jks`, `*.keystore`와 비밀번호는 커밋하지 않는다.

## OAuth and deep links

소셜 로그인은 네이티브에서 Capacitor Browser를 열고 다음 callback으로 돌아온다.

    mintondong://auth/callback

Supabase Dashboard → Authentication → URL Configuration의 Additional Redirect URLs에 이 값을
추가해야 한다. Google과 Apple provider는 기존 웹 callback을 유지한 채 네이티브 Bundle ID와
OAuth client 설정을 각 개발자 콘솔에 추가한다. 앱은 callback의 access/refresh token 또는 PKCE
code를 Supabase client에 전달하고, 저장해 둔 내부 `next` 경로로 이동한다. OAuth secret이나
Apple private key는 앱·저장소에 넣지 않는다.

Apple 로그인 계정은 삭제 직전에 Apple OAuth로 다시 인증해 provider access token을 확보한다.
Worker는 server-only `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, `APPLE_PRIVATE_KEY`로
짧은 수명의 client secret을 만들고 Apple `/auth/revoke`가 성공한 경우에만 Supabase Auth user를
삭제한다. Supabase는 provider token을 영구 저장하지 않으므로 기존 세션에 token이 없으면 재인증을
건너뛰지 않는다. 이메일·Google 계정은 Apple credential 유무와 관계없이 삭제할 수 있다.

### iOS console values

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:

    mintondong://auth/callback

Apple 로그인은 native `AuthenticationServices`가 아니라 Supabase가 시작하는 browser OAuth를
사용한다. Apple Developer에서 Bundle ID `com.mintondong.app`의 Sign in with Apple capability를
활성화하고, 이 App ID에 연결된 기존 Services ID를 사용한다. Services ID의 Web Authentication
설정은 다음 값이다.

    Domain: tkumfwiomcxkdbzljyss.supabase.co
    Return URL: https://tkumfwiomcxkdbzljyss.supabase.co/auth/v1/callback

Services ID 값을 Supabase Apple provider Client IDs의 첫 항목과 Worker의 server-only
`APPLE_CLIENT_ID`에 동일하게 입력한다. Bundle ID가 필요한 native audience는 뒤 항목에 추가할 수
있다. Apple private key는 Supabase provider secret과 별개로 token revocation에 사용할 수 있는
Sign in with Apple key이며, 저장소가 아닌 Cloudflare Runtime Secret에만 둔다.

### Apple server-to-server notifications

Apple Developer의 Primary App ID `com.mintondong.app`에는 다음 endpoint를 등록한다.

    https://mintondong-11a19919.kev208dev.workers.dev/api/apple/notifications

Worker의 `APPLE_NOTIFICATION_AUDIENCE`도 동일한 Primary App ID로 설정한다. 이는 browser
OAuth의 Services ID(`APPLE_CLIENT_ID`)와 다른 목적의 값이다. endpoint는 Apple 공개 JWKS로
서명과 issuer/audience를 검증하고, `jti`를 중복 방지 키로 영구 기록한다. Apple subject 원문,
relay email과 raw JWS는 저장하지 않는다. `account-deleted` 알림은 기존 계정 삭제 보호 절차를
우회하지 않고 검토 필요 상태로만 기록한다.

## Native behavior

- 상태 표시줄은 밝은 배경/어두운 아이콘으로 설정하고 WebView를 침범하지 않는다.
- 키보드는 Android에서 body resize를 사용한다.
- Android back은 열린 dialog를 먼저 닫고, history가 있으면 뒤로 가며 root에서만 종료한다.
- `target=_blank` 외부 HTTPS 링크는 Capacitor Browser로 열고 같은 origin은 앱에 남긴다.
- 네트워크 단절 중에는 민턴동 재시도 화면을 표시한다.
- 앱 활성화만으로 결제나 주문을 자동 재시도하지 않는다.
- PortOne/KG이니시스 paymentId, 금액·Store·Channel·provider 검증과 webhook은 기존 서버 흐름을
  그대로 사용한다. 레슨은 앱 밖에서 제공되는 오프라인 서비스다.

## Account deletion

공개 설명 URL은 `/account-deletion`, 앱 내 진입점은 `마이 → 계정 설정`이다. Worker는 현재
access token의 user ID만 사용하며 클라이언트가 전달한 user ID를 받지 않는다.

`supabase/migrations/20260813035134_account_deletion.sql`은 Production에 적용되었다.

1. 소유한 클럽이 있으면 삭제를 차단하고 고객지원을 통한 소유권 이전을 안내한다.
2. 결제 기록은 직접 user link를 제거하고 `account_deleted_at`을 기록해 보존한다.
3. 클럽 멤버십은 예약/경기 참조를 위해 익명화한다.
4. 관심 대회와 프로필을 삭제하고 영상 업로더 link를 제거한다.
5. Supabase Auth admin API로 현재 Auth user를 삭제하고 세션을 지운다.

보관 기간은 코드에서 임의로 정하지 않는다. 실제 법률·회계 보관 기준은 운영자가 확인한다.

## Store build notes

- iOS deployment target: 15.0, version/build: 1.0/1
- Android min/compile/target SDK: 24/36/36, versionCode/versionName: 1/1.0
- Android manifest permission: `INTERNET`만 사용
- iOS에는 카메라·마이크·위치·연락처·사진 permission description이 없음
- App icon과 splash는 기존 민턴동 자산으로 생성했다. 원본 app icon은 64×64이므로 최종 제출
  전에 공식 1024×1024 원본으로 다시 생성해야 한다.
- `assets/icon-only.png`와 현재 AppIcon은 64×64 원본에서 생성된 결과이므로 고해상도 공식
  원본으로 인정하지 않는다.

## Production URLs

- Privacy: `https://mintondong-11a19919.kev208dev.workers.dev/privacy`
- Terms: `https://mintondong-11a19919.kev208dev.workers.dev/terms`
- Refund: `https://mintondong-11a19919.kev208dev.workers.dev/refund-policy`
- Support: `https://mintondong-11a19919.kev208dev.workers.dev/support`
- Account deletion: `https://mintondong-11a19919.kev208dev.workers.dev/account-deletion`
- Business: `https://mintondong-11a19919.kev208dev.workers.dev/business-info`

## Required console work

- Apple Developer: App ID/signing/provisioning, Sign in with Apple association, Services ID callback,
  TestFlight app record and contracts
- Google Cloud/Play: Android OAuth client with actual signing SHA fingerprints, Play App Signing,
  Internal Testing app record and developer/account agreements
- Supabase: `mintondong://auth/callback` allowlist and Google/Apple native provider round-trip
- PortOne: native WebView payment-open/cancel-return QA; real MID transition remains separate
