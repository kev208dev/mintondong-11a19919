import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { StoreProvider } from "../lib/badminton/store";
import { Toaster } from "../components/ui/sonner";
import { AppShell } from "../components/app/AppShell";
import { AuthProvider, useAuth } from "../lib/auth/AuthProvider";
import { NEXT_STORAGE_KEY } from "../lib/auth/providers";
import { logOnboardingState } from "../lib/auth/onboarding-debug";
import { resolvePostAuthRedirect } from "../lib/auth/onboarding-state";
import { NativeRuntimeBridge } from "../components/native/NativeRuntimeBridge";
import { isNavigationCancellation } from "../lib/navigation/navigation-errors";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">페이지를 찾을 수 없어요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          주소가 잘못되었거나 페이지가 이동되었을 수 있어요.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          화면을 준비하지 못했어요
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          잠시 후 다시 시도하거나 홈으로 이동해 주세요.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              void router.invalidate().catch((invalidateError) => {
                if (!isNavigationCancellation(invalidateError))
                  console.error("[root] retry failed", invalidateError);
              });
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "민턴동 – 배드민턴 클럽 관리 앱" },
      {
        name: "description",
        content:
          "오늘 누가 오는지 한 번에 확인하고, 참석 체크·게스트·코트 배정까지 관리하는 배드민턴 동호회 앱.",
      },
      { property: "og:title", content: "민턴동 – 배드민턴 클럽 관리 앱" },
      {
        property: "og:description",
        content:
          "오늘 누가 오는지 한 번에 확인하고, 참석 체크·게스트·코트 배정까지 관리하는 배드민턴 동호회 앱.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "민턴동 – 배드민턴 클럽 관리 앱" },
      {
        name: "twitter:description",
        content:
          "오늘 누가 오는지 한 번에 확인하고, 참석 체크·게스트·코트 배정까지 관리하는 배드민턴 동호회 앱.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/mintondong-icon.png" },
      { rel: "apple-touch-icon", href: "/mintondong-icon.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** 로그인 직후 DB의 계정별 one-time onboarding 상태를 확인한다. */
function PostAuthRedirect() {
  const { user, profile, loading, profileLoading, profileStatus } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading || profileLoading) return;
    const target = resolvePostAuthRedirect({
      authenticated: Boolean(user),
      pathname,
      profile: profileStatus,
      username: profile?.username,
      onboardingCompletedAt: profile?.onboarding_completed_at,
    });
    logOnboardingState({
      pathname,
      profileStatus,
      usernamePresent: Boolean(profile?.username),
      onboardingCompleted: Boolean(profile?.onboarding_completed_at),
      redirectTarget: target,
    });
    if (target) {
      void router.navigate({ to: target, replace: true }).catch((error) => {
        if (!isNavigationCancellation(error)) console.error("[auth] redirect failed", error);
      });
      return;
    }

    if (
      !user ||
      profileStatus !== "ready" ||
      !profile?.username ||
      !profile.onboarding_completed_at
    )
      return;

    // 첫 동호회 연결까지 끝난 뒤 원래 목적지가 있으면 이어서 이동한다.
    const next = sessionStorage.getItem(NEXT_STORAGE_KEY);
    if (!next) return;
    sessionStorage.removeItem(NEXT_STORAGE_KEY);
    if (next.startsWith("/") && !next.startsWith("//") && next !== pathname) {
      void router.navigate({ to: next }).catch((error) => {
        if (!isNavigationCancellation(error)) console.error("[auth] next navigation failed", error);
      });
    }
  }, [user, profile, loading, profileLoading, profileStatus, pathname, router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NativeRuntimeBridge />
        <StoreProvider>
          <PostAuthRedirect />
          <AuthBootstrapGate />
          <Toaster position="top-center" />
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthBootstrapGate() {
  const { user, loading, profileLoading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = pathname === "/auth" || pathname.startsWith("/auth/");

  // 인증 화면은 세션 확인 중에도 즉시 보여준다. 인증된 세션이 있는 경우에만
  // 프로필/온보딩 데이터가 준비될 때까지 앱 화면 진입을 잠깐 보류한다.
  if (!isAuthPage && (loading || (Boolean(user) && profileLoading))) {
    return (
      <div className="app-shell mx-auto flex h-dvh w-full max-w-md items-center justify-center bg-background px-6">
        <div className="text-center" role="status" aria-live="polite">
          <img src="/mintondong-icon.png" alt="민턴동" className="mx-auto size-14 rounded-2xl" />
          <p className="mt-4 text-sm font-bold text-foreground">민턴동을 준비하고 있어요</p>
        </div>
      </div>
    );
  }
  return <AppShell />;
}
