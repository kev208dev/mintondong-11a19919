import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hidesBottomNavigation,
  isExactBottomTabDestination,
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

test("ClubSwitcher는 seed store가 아닌 Supabase active club query를 유지한다", () => {
  const source = readFileSync("src/components/app/ClubSwitcher.tsx", "utf8");
  assert.match(source, /listMyClubs/);
  assert.doesNotMatch(source, /useStore|SEED_STATE/);
});
