import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Bell, Home, Trophy, User, UserRoundPlus, Users } from "lucide-react";
import { memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClubSectionNav } from "./ClubSectionNav";
import { ClubSwitcher } from "./ClubSwitcher";
import { PublicFooter } from "./PublicFooter";
import { ClubRouteBackButton } from "./ClubRouteBackButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { unreadNotificationCountFn } from "@/lib/notifications/notifications.functions";
import {
  hidesBottomNavigation,
  getNativeChromeState,
  isExactBottomTabDestination,
  isClubSection,
  pageTitle,
  showsNativePrimaryControls,
  usesNativeUIKitChrome,
} from "./app-shell-state";

const TABS = [
  { to: "/", label: "홈", icon: Home },
  { to: "/club", label: "동호회", icon: Users },
  { to: "/guest", label: "게스트", icon: UserRoundPlus },
  { to: "/tournaments", label: "대회", icon: Trophy },
  { to: "/me", label: "마이", icon: User },
] as const;

function isTabActive(to: string, pathname: string) {
  if (to === "/") return pathname === "/" || pathname.startsWith("/clubs/find");
  if (to === "/club") return isClubSection(pathname);
  if (to === "/guest") return pathname === "/guest" || pathname.startsWith("/guest/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

function showsPublicFooter(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/business-info" ||
    pathname === "/support" ||
    pathname === "/account-deletion" ||
    pathname.startsWith("/tournaments")
  );
}

const BottomNav = memo(function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = isTabActive(to, pathname);
          const atDestination = isExactBottomTabDestination(pathname, to);
          return (
            <li key={to}>
              <Link
                to={to}
                preload="intent"
                preloadDelay={0}
                disabled={atDestination}
                aria-current={atDestination ? "page" : undefined}
                className={`relative flex h-14 touch-manipulation select-none flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-[color,background-color,transform] duration-75 active:scale-[0.96] active:bg-accent ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.6 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

export function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const unread = useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: () => unreadNotificationCountFn(),
    enabled: Boolean(user) && !authLoading,
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = pageTitle(pathname);
  const router = useRouter();
  const showPublicFooter = showsPublicFooter(pathname);
  const hideBottomNav = hidesBottomNavigation(pathname);
  const authFlow = pathname === "/auth" || pathname.startsWith("/auth/");
  const usesUIKitChrome = usesNativeUIKitChrome(Capacitor.getPlatform());
  const showNativePrimaryControls = usesUIKitChrome && showsNativePrimaryControls(pathname);
  const showNativeInlineBack =
    usesUIKitChrome &&
    getNativeChromeState(pathname).showsBackButton &&
    !pathname.startsWith("/clubs/find") &&
    !pathname.startsWith("/clubs/new") &&
    !pathname.startsWith("/tournaments/");

  useEffect(() => {
    const run = () => {
      for (const tab of TABS) {
        void router.preloadRoute({ to: tab.to }).catch(() => {});
      }
    };
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else window.setTimeout(run, 150);
  }, [router]);

  return (
    <div className="app-shell mx-auto flex h-dvh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
      {authFlow || usesUIKitChrome ? null : (
        <header className="z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="flex h-[54px] items-center gap-1 px-3">
            <Link to="/" aria-label="민턴동 홈" className="shrink-0">
              <img
                src="/mintondong-logo.png"
                alt="민턴동"
                width={40}
                height={40}
                className="size-10 rounded-xl object-contain"
              />
            </Link>
            <ClubSwitcher />
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                to="/notifications"
                aria-label="알림"
                className="relative grid size-9 place-items-center rounded-full text-muted-foreground active:bg-accent"
              >
                <Bell className="size-[18px]" />
                {(unread.data ?? 0) > 0 ? (
                  <span className="absolute right-0.5 top-0.5 min-w-3.5 rounded-full bg-brand-lime px-1 text-center text-[10px] font-bold leading-3 text-brand-deep">
                    {(unread.data ?? 0) > 99 ? "99+" : unread.data}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </header>
      )}

      <div
        data-app-scroll-container
        data-scroll-restoration-id="app-scroll"
        className="app-scroll-region min-h-0 flex-1 overflow-y-auto"
      >
        <main
          className={`px-4 pt-3 ${
            hideBottomNav
              ? "pb-[max(2rem,env(safe-area-inset-bottom))]"
              : showPublicFooter
                ? "pb-8"
                : usesUIKitChrome
                  ? "pb-[calc(4rem+env(safe-area-inset-bottom))]"
                  : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {showNativePrimaryControls ? (
            <div className="mb-2 flex min-h-11 items-center gap-1">
              <Link to="/" aria-label="민턴동 홈" className="shrink-0">
                <img
                  src="/mintondong-logo.png"
                  alt="민턴동"
                  width={40}
                  height={40}
                  className="size-10 rounded-xl object-contain"
                />
              </Link>
              <ClubSwitcher />
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Link
                  to="/notifications"
                  aria-label="알림"
                  className="relative grid size-9 place-items-center rounded-full text-muted-foreground active:bg-accent"
                >
                  <Bell className="size-[18px]" />
                  {(unread.data ?? 0) > 0 ? (
                    <span className="absolute right-0.5 top-0.5 min-w-3.5 rounded-full bg-brand-lime px-1 text-center text-[10px] font-bold leading-3 text-brand-deep">
                      {(unread.data ?? 0) > 99 ? "99+" : unread.data}
                    </span>
                  ) : null}
                </Link>
              </div>
            </div>
          ) : null}
          {showNativeInlineBack ? <ClubRouteBackButton /> : null}
          {isClubSection(pathname) &&
          !(isExactBottomTabDestination(pathname, "/club") && (!user || authLoading)) ? (
            <ClubSectionNav pathname={pathname} />
          ) : null}
          {authFlow || usesUIKitChrome ? null : (
            <h1 className="mt-1 mb-3 text-[17px] font-extrabold tracking-tight text-foreground">
              {title}
            </h1>
          )}
          <div key={pathname} className="app-route-transition">
            <Outlet />
          </div>
        </main>

        {showPublicFooter ? (
          <PublicFooter nativeTabBar={usesUIKitChrome && !hideBottomNav} />
        ) : null}
      </div>

      {hideBottomNav || usesUIKitChrome ? null : <BottomNav pathname={pathname} />}
    </div>
  );
}
