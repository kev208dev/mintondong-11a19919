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

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
    profile: {
      display_name: "테스트 사용자",
      username: null,
      onboarding_completed_at: null,
    },
    loading: false,
    profileLoading: false,
    profileStatus: "ready",
    refreshProfile: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/account.functions", () => ({
  checkUsernameAvailable: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

import { Route as OnboardingAccountFileRoute } from "../src/routes/onboarding.account";
import { Route as OnboardingIndexFileRoute } from "../src/routes/onboarding.index";
import { Route as OnboardingFileRoute } from "../src/routes/onboarding";

const OnboardingLayout = OnboardingFileRoute.options.component;
const ClubOnboardingPage = OnboardingIndexFileRoute.options.component;
const OnboardingAccountPage = OnboardingAccountFileRoute.options.component;

if (!OnboardingLayout || !ClubOnboardingPage || !OnboardingAccountPage) {
  throw new Error("Onboarding route component configuration is incomplete");
}

function createOnboardingRouter(initialPath: "/onboarding" | "/onboarding/account") {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "onboarding",
    component: OnboardingLayout,
  });
  const onboardingIndexRoute = createRoute({
    getParentRoute: () => onboardingRoute,
    path: "/",
    component: ClubOnboardingPage,
  });
  const onboardingAccountRoute = createRoute({
    getParentRoute: () => onboardingRoute,
    path: "account",
    component: OnboardingAccountPage,
  });
  const clubsFindRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "clubs/find",
    component: () => null,
  });
  const clubsNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "clubs/new",
    component: () => null,
  });
  const routeTree = rootRoute.addChildren([
    onboardingRoute.addChildren([onboardingIndexRoute, onboardingAccountRoute]),
    clubsFindRoute,
    clubsNewRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

async function renderRoute(path: "/onboarding" | "/onboarding/account") {
  const router = createOnboardingRouter(path);
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

describe("onboarding route rendering", () => {
  it("/onboarding/account renders only the account setup form", async () => {
    const html = await renderRoute("/onboarding/account");
    expect(html).toContain("민턴동 아이디 만들기");
    expect(html).not.toContain("동호회 하나만 연결하면 준비 끝");
  });

  it("/onboarding renders only the club onboarding index", async () => {
    const html = await renderRoute("/onboarding");
    expect(html).toContain("동호회 하나만 연결하면 준비 끝");
    expect(html).not.toContain("민턴동 아이디 만들기");
  });
});
