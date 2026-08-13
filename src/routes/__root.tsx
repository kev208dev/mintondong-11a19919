import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
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
import { clubKeys, listMyClubs } from "../lib/clubs/api";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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

function isOnboardingSubflow(pathname: string) {
  return (
    pathname.startsWith("/onboarding") ||
    pathname === "/clubs/find" ||
    pathname === "/clubs/new" ||
    pathname.startsWith("/clubs/")
  );
}

function isLegalPage(pathname: string) {
  return (
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/tournaments") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/business-info"
  );
}

/** 로그인 직후 계정 설정과 첫 동호회 연결을 순서대로 안내한다. */
function PostAuthRedirect() {
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clubs = useQuery({
    queryKey: clubKeys.mine(user?.id ?? null),
    queryFn: () => listMyClubs(user?.id ?? null),
    enabled: !!user && !!profile?.username && !loading && !profileLoading,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    if (pathname.startsWith("/auth/reset-password")) return;

    // 소셜 최초 로그인은 먼저 아이디를 만든다.
    if (!profile?.username) {
      if (!pathname.startsWith("/onboarding/account")) {
        void router.navigate({ to: "/onboarding/account", replace: true });
      }
      return;
    }

    if (clubs.isLoading || clubs.isError || !clubs.data) return;

    // 활성 동호회가 하나도 없으면 가입/생성 온보딩을 먼저 보여준다.
    if (clubs.data.length === 0) {
      if (!isOnboardingSubflow(pathname) && !isLegalPage(pathname)) {
        void router.navigate({ to: "/onboarding", replace: true });
      }
      return;
    }

    // 첫 동호회 연결까지 끝난 뒤 원래 목적지가 있으면 이어서 이동한다.
    const next = sessionStorage.getItem(NEXT_STORAGE_KEY);
    if (!next) return;
    sessionStorage.removeItem(NEXT_STORAGE_KEY);
    if (next.startsWith("/") && !next.startsWith("//") && next !== pathname) {
      void router.navigate({ to: next });
    }
  }, [
    user,
    profile,
    loading,
    profileLoading,
    clubs.isLoading,
    clubs.isError,
    clubs.data,
    pathname,
    router,
  ]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StoreProvider>
          <PostAuthRedirect />
          <AppShell />
          <Toaster position="top-center" />
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
