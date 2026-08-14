import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  isPublicClubRoot,
  requiresClubAuthentication,
  resolveClubRootView,
} from "../src/lib/auth/club-route-access";
import { resolveProviderEnabled } from "../src/lib/auth/providers";
import { SocialLoginButtons } from "../src/routes/auth.index";
import { ClubLoginGate } from "../src/routes/club.index";

function createClubGateRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const clubRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "club",
    component: ClubLoginGate,
  });
  const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "auth",
    component: () => null,
  });
  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "auth/signup",
    component: () => null,
  });
  const findRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "clubs/find",
    component: () => null,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([clubRoute, authRoute, signupRoute, findRoute]),
    history: createMemoryHistory({ initialEntries: ["/club"] }),
  });
}

describe("social login providers", () => {
  it("confirmed providers default on and explicit false remains a fail-safe", () => {
    expect(resolveProviderEnabled("kakao", "false")).toBe(true);
    expect(resolveProviderEnabled("google")).toBe(true);
    expect(resolveProviderEnabled("apple", "true")).toBe(true);
    expect(resolveProviderEnabled("google", "false")).toBe(false);
    expect(resolveProviderEnabled("apple", "false")).toBe(false);
  });

  it("renders Kakao, Google and Apple buttons with accessible labels", () => {
    const html = renderToString(<SocialLoginButtons busy={null} onSelect={vi.fn()} />);
    expect(html).toContain("카카오로 계속하기");
    expect(html).toContain("Google로 계속하기");
    expect(html).toContain("Apple로 계속하기");
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Google로 계속하기"');
    expect(html).toContain('aria-label="Apple로 계속하기"');
  });
});

describe("club root soft login gate", () => {
  it("keeps only /club public while protected subroutes still require auth", () => {
    expect(isPublicClubRoot("/club")).toBe(true);
    expect(isPublicClubRoot("/club/")).toBe(true);
    expect(requiresClubAuthentication("/club/members")).toBe(true);
    expect(requiresClubAuthentication("/club/manage")).toBe(true);
    expect(requiresClubAuthentication("/club/attendance?today=1")).toBe(true);
  });

  it("does not flash the gate while auth hydrates and never shows it to a user", () => {
    expect(resolveClubRootView({ authLoading: true, authenticated: false })).toBe("loading");
    expect(resolveClubRootView({ authLoading: false, authenticated: false })).toBe("login");
    expect(resolveClubRootView({ authLoading: false, authenticated: true })).toBe("content");
  });

  it("renders explicit login, signup and public browse actions without redirecting /club", async () => {
    const router = createClubGateRouter();
    await router.load();
    const html = renderToString(<RouterProvider router={router} />);
    expect(router.state.location.pathname).toBe("/club");
    expect(html).toContain("동호회 기능은 로그인이 필요해요");
    expect(html).toContain("로그인하기");
    expect(html).toContain("계정이 없나요? 회원가입");
    expect(html).toContain("동호회 둘러보기");
    expect(html).toContain("next=%2Fclub");
    expect(html).toContain('href="/clubs/find"');
  });
});
