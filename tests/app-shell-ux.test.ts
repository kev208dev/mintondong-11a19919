import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BOTTOM_TAB_ROUTES,
  getNativeChromeState,
  hidesBottomNavigation,
  isExactBottomTabDestination,
  pageTitle,
  usesNativeUIKitChrome,
} from "../src/components/app/app-shell-state.ts";
import { isNavigationCancellation } from "../src/lib/navigation/navigation-errors.ts";

test("하단 탭은 홈·동호회·게스트·대회·마이 5개를 유지한다", () => {
  assert.deepEqual(BOTTOM_TAB_ROUTES, ["/", "/club", "/guest", "/tournaments", "/me"]);
});

test("동호회 root는 secondary navigation 없이 상태와 핵심 행동만 보여준다", () => {
  const shell = readFileSync("src/components/app/AppShell.tsx", "utf8");
  const clubRoot = readFileSync("src/routes/club.index.tsx", "utf8");
  assert.doesNotMatch(shell, /ClubSectionNav/);
  assert.match(clubRoot, /오늘 운동/);
  assert.match(clubRoot, /QUICK_ACTIONS/);
  assert.match(clubRoot, /게스트 모집/);
  assert.match(clubRoot, /to="\/club\/manage"/);
  assert.doesNotMatch(clubRoot, /동호회 만들기|동호회 찾기|더보기/);
});

test("동호회 하위 route는 legacy 6개 chip과 중복 상위 UI를 렌더링하지 않는다", () => {
  const routeFiles = [
    "src/routes/club.attendance.tsx",
    "src/routes/club.finance.tsx",
    "src/routes/club.manage.tsx",
    "src/routes/club.manage_.guest.tsx",
    "src/routes/club.members.tsx",
    "src/routes/club.more.tsx",
    "src/routes/club.notices.tsx",
    "src/routes/club.ranking.tsx",
    "src/routes/club.schedule.tsx",
    "src/routes/games.tsx",
    "src/routes/records.tsx",
  ];
  for (const file of routeFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /동호회 홈|ClubSubnav|ClubTabs|ClubNavigation/);
  }
  const guestManagement = readFileSync("src/routes/club.manage_.guest.tsx", "utf8");
  assert.doesNotMatch(guestManagement, /동호회 운동에 참여할 자리를/);
});

test("인증과 온보딩 route에서는 BottomNav를 숨긴다", () => {
  for (const pathname of [
    "/auth",
    "/auth/signup",
    "/auth/forgot-password",
    "/onboarding",
    "/onboarding/account",
  ]) {
    assert.equal(hidesBottomNavigation(pathname), true, pathname);
  }
  for (const pathname of ["/", "/club", "/guest", "/tournaments", "/me", "/clubs/find"]) {
    assert.equal(hidesBottomNavigation(pathname), false, pathname);
  }
});

test("현재 탭의 정확한 목적지만 재이동을 막는다", () => {
  assert.equal(isExactBottomTabDestination("/", "/"), true);
  assert.equal(isExactBottomTabDestination("/club", "/club"), true);
  assert.equal(isExactBottomTabDestination("/club/", "/club"), true);
  assert.equal(isExactBottomTabDestination("/tournaments/", "/tournaments"), true);
  assert.equal(isExactBottomTabDestination("/me/", "/me"), true);
  assert.equal(isExactBottomTabDestination("/club/attendance", "/club"), false);
  assert.equal(isExactBottomTabDestination("/clubs/find", "/"), false);
});

test("AppShell은 독립 scroll container, safe area와 짧은 transition을 유지한다", () => {
  const shell = readFileSync("src/components/app/AppShell.tsx", "utf8");
  const styles = readFileSync("src/styles.css", "utf8");
  assert.match(shell, /data-app-scroll-container/);
  assert.match(shell, /env\(safe-area-inset-bottom\)/);
  assert.match(shell, /preloadDelay=\{0\}/);
  assert.match(styles, /overscroll-behavior-y: contain/);
  assert.match(styles, /150ms ease-out/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("iOS native는 CSS glass nav 대신 UIKit chrome을 사용한다", () => {
  const shell = readFileSync("src/components/app/AppShell.tsx", "utf8");
  const footer = readFileSync("src/components/app/PublicFooter.tsx", "utf8");
  const styles = readFileSync("src/styles.css", "utf8");
  assert.match(shell, /usesNativeUIKitChrome/);
  assert.match(shell, /hideBottomNav \|\| usesUIKitChrome/);
  assert.match(shell, /authFlow \|\| usesUIKitChrome/);
  assert.match(shell, /!pathname\.startsWith\("\/tournaments\/"\)/);
  assert.match(shell, /isClubSubroute/);
  assert.match(shell, /<AppPageHeader title=\{title\} backLabel="동호회" fallback="\/club"/);
  assert.match(footer, /nativeTabBar/);
  assert.doesNotMatch(shell, /ios-liquid-tabbar|floating/);
  assert.doesNotMatch(styles, /ios-liquid-tabbar|blur\(24px\) saturate\(180%\)/);
});

test("iOS는 상단 native navigation bar 없이 tab과 back 메타데이터만 계산한다", () => {
  assert.equal(usesNativeUIKitChrome("ios"), true);
  assert.equal(usesNativeUIKitChrome("android"), false);
  assert.equal(usesNativeUIKitChrome("web"), false);

  assert.deepEqual(getNativeChromeState("/"), {
    pathname: "/",
    title: "홈",
    selectedTab: "home",
    showsTabBar: true,
    showsNavigationBar: false,
    showsBackButton: false,
  });
  assert.equal(getNativeChromeState("/club").selectedTab, "club");
  assert.equal(getNativeChromeState("/guest").selectedTab, "guest");
  assert.equal(getNativeChromeState("/guest").title, "게스트");
  assert.equal(getNativeChromeState("/tournaments/abc").selectedTab, "tournaments");
  assert.equal(getNativeChromeState("/tournaments/abc").showsBackButton, true);
  assert.equal(getNativeChromeState("/tournaments/abc").showsNavigationBar, false);
  assert.equal(getNativeChromeState("/clubs/find").selectedTab, "home");
  assert.equal(getNativeChromeState("/clubs/find").showsBackButton, true);
  assert.equal(getNativeChromeState("/clubs/new").selectedTab, null);
  assert.equal(getNativeChromeState("/clubs/new").showsBackButton, true);
  assert.equal(getNativeChromeState("/onboarding").showsTabBar, false);
  assert.equal(getNativeChromeState("/onboarding").showsBackButton, false);
  assert.equal(getNativeChromeState("/auth/signup").showsNavigationBar, false);
  assert.equal(getNativeChromeState("/auth/signup").showsTabBar, false);
  assert.equal(pageTitle("/onboarding/account"), "계정 설정");
});

test("iOS shell은 안정적인 UIKit native bar와 공식 Capacitor local plugin containment를 사용한다", () => {
  const native = readFileSync("ios/App/App/SceneDelegate.swift", "utf8");
  assert.match(native, /MintondongShellViewController/);
  assert.match(native, /private let tabBar = UIView\(\)/);
  assert.match(native, /private let tabStack = UIStackView\(\)/);
  assert.match(native, /backgroundColor = isSelected \? \.black : \.clear/);
  assert.match(native, /baseForegroundColor = isSelected \? \.white : \.label/);
  assert.match(native, /tabButtonTapped/);
  assert.doesNotMatch(native, /allControls\(in:/);
  assert.doesNotMatch(native, /control\.backgroundColor = control\.isSelected/);
  assert.match(native, /UIImage\(systemName: tab\.systemImageName\)/);
  assert.match(native, /CAPPlugin, CAPBridgedPlugin/);
  assert.match(native, /override func capacitorDidLoad\(\)/);
  assert.match(native, /registerPluginInstance\(plugin\)/);
  assert.match(native, /addChild\(bridgeViewController\)/);
  assert.match(native, /didMove\(toParent: self\)/);
  assert.match(native, /SceneDelegateProxy\.shared/);
  assert.match(native, /NativeAuthPlugin/);
  assert.match(native, /ASAuthorizationAppleIDProvider/);
  assert.match(native, /SHA256/);
  assert.match(native, /signInWithApple/);
  assert.doesNotMatch(native, /navigationBar\.setItems/);
  assert.doesNotMatch(native, /UIBlurEffect|UIVisualEffectView|UIGlassEffect/);
});

test("iOS native tab과 Debug/Release web origin이 분리되어 있다", () => {
  const native = readFileSync("ios/App/App/SceneDelegate.swift", "utf8");
  assert.match(
    native,
    /case home[\s\S]*case club[\s\S]*case guest[\s\S]*case tournaments[\s\S]*case me/,
  );
  assert.match(native, /case \.guest: return "게스트"/);
  assert.match(native, /case \.guest: return "\/guest"/);
  assert.match(native, /#if DEBUG[\s\S]*descriptor\.serverURL = "http:\/\/127\.0\.0\.1:5173"/);
  assert.match(native, /#else[\s\S]*descriptor\.serverURL = nil/);
});

test("ClubSwitcher는 seed store가 아닌 Supabase active club query를 유지한다", () => {
  const source = readFileSync("src/components/app/ClubSwitcher.tsx", "utf8");
  assert.match(source, /listMyClubs/);
  assert.doesNotMatch(source, /useStore|SEED_STATE/);
});

test("알림은 자체 페이지 헤더 하나만 소유하고 빠른 실패를 사용한다", () => {
  const shell = readFileSync("src/components/app/AppShell.tsx", "utf8");
  const notifications = readFileSync("src/routes/notifications.tsx", "utf8");
  assert.match(shell, /!pathname\.startsWith\("\/notifications"\)/);
  assert.match(notifications, /<AppPageHeader[\s\S]*title="알림"/);
  assert.match(notifications, /retry: 0/);
  assert.match(notifications, /알림을 불러오지 못했어요/);
  assert.doesNotMatch(notifications, /ChevronLeft/);
});

test("날짜·시간 picker는 자명한 설명문 없이 제목과 선택 UI만 제공한다", () => {
  const datePicker = readFileSync("src/components/date-time/DatePickerSheet.tsx", "utf8");
  const timePicker = readFileSync("src/components/date-time/TimePickerSheet.tsx", "utf8");
  const placePicker = readFileSync("src/components/places/PlacePicker.tsx", "utf8");
  assert.doesNotMatch(datePicker, /한국 시간 기준|날짜를 선택하세요/);
  assert.doesNotMatch(timePicker, /24시간제로 시간을 선택하세요|시간을 선택하세요/);
  assert.doesNotMatch(placePicker, /검색 결과에서 정확한 장소를 선택하세요/);
  assert.match(datePicker, /DrawerTitle/);
  assert.match(timePicker, /DrawerTitle/);
});

test("native tab navigation은 취소된 이동을 전역 오류로 재전파하지 않는다", () => {
  const bridge = readFileSync("src/components/native/NativeRuntimeBridge.tsx", "utf8");
  assert.match(bridge, /isNavigationCancellation/);
  assert.match(bridge, /tab navigation failed/);
  assert.match(bridge, /back navigation failed/);
});

test("AbortError와 TanStack CancelledError는 navigation 취소로 분류한다", () => {
  assert.equal(
    isNavigationCancellation(Object.assign(new Error("aborted"), { name: "AbortError" })),
    true,
  );
  assert.equal(isNavigationCancellation(new Error("CancelledError")), true);
  assert.equal(isNavigationCancellation(new Error("Supabase permission denied")), false);
});
