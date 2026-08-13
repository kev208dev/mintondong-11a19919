import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hidesBottomNavigation,
  isExactBottomTabDestination,
  isIosNativeShell,
} from "../src/components/app/app-shell-state.ts";

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

test("현재 탭의 정확한 목적지만 재이동을 막는다", () => {
  assert.equal(isExactBottomTabDestination("/", "/"), true);
  assert.equal(isExactBottomTabDestination("/club", "/club"), true);
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

test("iOS BottomNav는 safe-area를 위치에만 쓰는 floating glass bar다", () => {
  const shell = readFileSync("src/components/app/AppShell.tsx", "utf8");
  const footer = readFileSync("src/components/app/PublicFooter.tsx", "utf8");
  const styles = readFileSync("src/styles.css", "utf8");
  assert.match(shell, /isIosNativeShell/);
  assert.match(shell, /bottom-\[max\(0\.5rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(shell, /ios-liquid-tabbar/);
  assert.doesNotMatch(
    shell.match(/floating\s*\?\s*"([^"]+)"/)?.[1] ?? "",
    /pb-\[env\(safe-area-inset-bottom\)\]/,
  );
  assert.match(footer, /floatingNav \? "pb-20"/);
  assert.match(styles, /backdrop-filter: blur\(24px\) saturate\(180%\)/);
});

test("iOS native shell은 Capacitor bridge와 production-origin WKWebView 모두 감지한다", () => {
  const wkWebView =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
  const mobileSafari = `${wkWebView} Version/26.0 Mobile/15E148 Safari/604.1`;

  assert.equal(isIosNativeShell("ios", ""), true);
  assert.equal(isIosNativeShell("web", wkWebView), true);
  assert.equal(isIosNativeShell("web", mobileSafari), false);
  assert.equal(isIosNativeShell("web", "Mozilla/5.0 Chrome/140 Safari/537.36"), false);
});

test("ClubSwitcher는 seed store가 아닌 Supabase active club query를 유지한다", () => {
  const source = readFileSync("src/components/app/ClubSwitcher.tsx", "utf8");
  assert.match(source, /listMyClubs/);
  assert.doesNotMatch(source, /useStore|SEED_STATE/);
});
