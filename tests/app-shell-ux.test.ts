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
import {
  formatDailyAttendanceDate,
  shiftDailyAttendanceDate,
} from "../src/lib/badminton/daily-attendance.ts";

test("출시 하단 탭은 홈·동호회·대회·마이 4개다", () => {
  assert.deepEqual(BOTTOM_TAB_ROUTES, ["/", "/club", "/tournaments", "/me"]);
});

test("동호회 root는 secondary navigation 없이 상태와 핵심 행동만 보여준다", () => {
  const shell = readFileSync("src/components/app/AppShell.tsx", "utf8");
  const clubRoot = readFileSync("src/routes/club.index.tsx", "utf8");
  assert.doesNotMatch(shell, /ClubSectionNav/);
  assert.match(clubRoot, /오늘 출석/);
  assert.match(clubRoot, /\/club\/attendance/);
  assert.match(clubRoot, /QUICK_ACTIONS/);
  assert.match(clubRoot, /회비 관리/);
  assert.doesNotMatch(clubRoot, /게스트 모집/);
  assert.doesNotMatch(clubRoot, /to="\/club\/manage"/);
  assert.doesNotMatch(clubRoot, /일정/);
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

test("홈은 일정·장소가 아닌 날짜 단위 출석 요약을 우선한다", () => {
  const home = readFileSync("src/routes/index.tsx", "utf8");
  const attendance = readFileSync("src/routes/club.attendance.tsx", "utf8");
  const store = readFileSync("src/lib/badminton/store.tsx", "utf8");
  assert.match(home, /TodayAttendanceCard/);
  assert.match(home, /useDailyAttendance/);
  assert.doesNotMatch(home, /오늘 운동|오늘 일정|운동 장소 없음|장소 설정/);
  assert.match(attendance, /날짜/);
  assert.match(attendance, /ATTENDING|NOT_ATTENDING|UNDECIDED/);
  assert.match(store, /setDailyAttendance/);
  assert.match(store, /seoulDateKey/);
  assert.match(home, /formatDailyAttendanceDate/);
  assert.match(home, /shiftDailyAttendanceDate/);
});

test("홈 출석 날짜는 한국어 날짜와 date-only 이동을 사용한다", () => {
  assert.match(formatDailyAttendanceDate("2026-08-16"), /2026년 8월 16일/);
  assert.equal(shiftDailyAttendanceDate("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftDailyAttendanceDate("2026-01-01", -1), "2025-12-31");
});

test("날짜 출석 migration은 하루 한 건 unique와 멤버 RLS를 보장한다", () => {
  const migration = readFileSync(
    "supabase/migrations/20260816140000_club_daily_attendance.sql",
    "utf8",
  );
  assert.match(migration, /club_daily_attendance/);
  assert.match(migration, /UNIQUE \(club_id, user_id, attendance_date\)/);
  assert.match(migration, /public\.is_club_member\(club_id\)/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
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
  for (const pathname of ["/", "/club", "/tournaments", "/me", "/clubs/find"]) {
    assert.equal(hidesBottomNavigation(pathname), false, pathname);
  }
});

test("인증 bootstrap은 세션·프로필 준비 전 앱 화면 진입을 보류한다", () => {
  const root = readFileSync("src/routes/__root.tsx", "utf8");
  const auth = readFileSync("src/lib/auth/AuthProvider.tsx", "utf8");
  assert.match(root, /AuthBootstrapGate/);
  assert.match(root, /Boolean\(user\) && profileLoading/);
  assert.match(auth, /bootstrapStatus/);
  assert.match(auth, /SESSION_READY/);
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
  assert.match(shell, /const isNativePlatform = Capacitor\.getPlatform\(\) === "ios"/);
  assert.match(shell, /hideBottomNav \|\| isNativePlatform/);
  assert.match(shell, /authFlow \|\| isNativePlatform/);
  assert.match(shell, /data-web-bottom-nav/);
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
  assert.equal(getNativeChromeState("/guest").selectedTab, "home");
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
  assert.match(native, /private let tabBar = UITabBar\(\)/);
  assert.match(native, /private var tabItems: \[UITabBarItem\] = \[\]/);
  assert.match(native, /let appearance = UITabBarAppearance\(\)/);
  assert.match(native, /tabBar\.standardAppearance = appearance/);
  assert.match(native, /tabBar\.delegate = self/);
  assert.match(native, /func tabBar\(_ tabBar: UITabBar, didSelect item: UITabBarItem\)/);
  assert.match(native, /selectedSystemImageName/);
  assert.doesNotMatch(native, /allControls\(in:/);
  assert.doesNotMatch(
    native,
    /UIStackView|tabButtons|tabButtonTapped|backgroundColor = isSelected/,
  );
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
  assert.match(native, /case home[\s\S]*case club[\s\S]*case tournaments[\s\S]*case me/);
  assert.doesNotMatch(native, /case \.guest/);
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
  assert.match(notifications, /잠시 후 다시 시도해 주세요/);
  assert.match(notifications, /새 알림이 없어요/);
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
