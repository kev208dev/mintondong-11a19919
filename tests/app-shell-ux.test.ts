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

test("하단 탭은 홈·동호회·게스트·대회·마이 5개를 유지한다", () => {
  assert.deepEqual(BOTTOM_TAB_ROUTES, ["/", "/club", "/guest", "/tournaments", "/me"]);
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

test("iOS shell은 표준 UIKit bar와 공식 Capacitor local plugin containment를 사용한다", () => {
  const native = readFileSync("ios/App/App/SceneDelegate.swift", "utf8");
  assert.match(native, /MintondongShellViewController/);
  assert.match(native, /UITabBar\(\)/);
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

test("ClubSwitcher는 seed store가 아닌 Supabase active club query를 유지한다", () => {
  const source = readFileSync("src/components/app/ClubSwitcher.tsx", "utf8");
  assert.match(source, /listMyClubs/);
  assert.doesNotMatch(source, /useStore|SEED_STATE/);
});
