import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Bell, Home, Trophy, User, Users } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ClubSectionNav, isClubSection } from "./ClubSectionNav";
import { AccountButton } from "./AccountButton";
import { ClubSwitcher } from "./ClubSwitcher";
import { PublicFooter } from "./PublicFooter";
import {
  hidesBottomNavigation,
  isExactBottomTabDestination,
  isIosNativeShell,
} from "./app-shell-state";

const TABS = [
  { to: "/", label: "홈", icon: Home },
  { to: "/club", label: "동호회", icon: Users },
  { to: "/tournaments", label: "대회", icon: Trophy },
  { to: "/me", label: "마이", icon: User },
] as const;

function isTabActive(to: string, pathname: string) {
  if (to === "/") return pathname === "/" || pathname.startsWith("/clubs/find");
  if (to === "/club") return isClubSection(pathname);
  return pathname === to || pathname.startsWith(`${to}/`);
}

function showsPublicFooter(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/lessons" ||
    (pathname.startsWith("/clubs/") && pathname.includes("/lessons")) ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/business-info" ||
    pathname === "/support" ||
    pathname === "/account-deletion" ||
    pathname.startsWith("/tournaments")
  );
}

const BottomNav = memo(function BottomNav({
  pathname,
  floating,
}: {
  pathname: string;
  floating: boolean;
}) {
  return (
    <nav
      className={
        floating
          ? "ios-liquid-tabbar fixed bottom-[max(0.5rem,calc(env(safe-area-inset-bottom)-1rem))] left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[26.5rem] -translate-x-1/2 overflow-hidden rounded-[1.75rem]"
          : "fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      }
    >
      <ul className="grid grid-cols-4">
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
                className={`relative flex touch-manipulation select-none flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-[color,background-color,transform,box-shadow] duration-75 active:scale-[0.96] ${
                  floating ? "m-1.5 h-12 rounded-[1.25rem]" : "h-14 active:bg-accent"
                } ${
                  active
                    ? floating
                      ? "bg-card/55 text-primary shadow-[inset_0_1px_0_color-mix(in_oklab,var(--card)_80%,transparent),0_1px_5px_oklch(0.44_0.115_249/0.08)]"
                      : "text-primary"
                    : "text-muted-foreground"
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

function usePageTitle(pathname: string) {
  return useMemo(() => {
    if (pathname === "/") return "홈";
    if (pathname.startsWith("/onboarding")) return "시작하기";
    if (pathname.startsWith("/clubs/find")) return "동호회 찾기";
    if (pathname.startsWith("/clubs/new")) return "동호회 만들기";
    if (pathname.startsWith("/clubs/")) return "동호회";
    if (pathname.startsWith("/games")) return "경기";
    if (pathname.startsWith("/lessons")) return "레슨";
    if (pathname.startsWith("/payments/toss")) return "레슨 결제";
    if (pathname.startsWith("/terms")) return "이용약관";
    if (pathname.startsWith("/privacy")) return "개인정보처리방침";
    if (pathname.startsWith("/refund-policy")) return "취소 및 환불 정책";
    if (pathname.startsWith("/business-info")) return "사업자 정보";
    if (pathname.startsWith("/support")) return "고객지원";
    if (pathname.startsWith("/account-deletion")) return "계정 삭제";
    if (pathname.startsWith("/admin/tournaments")) return "대회 관리";
    if (pathname.startsWith("/records")) return "활동 기록";
    if (pathname.startsWith("/club/attendance")) return "출석 체크";
    if (pathname.startsWith("/club/schedule")) return "일정";
    if (pathname.startsWith("/club/ranking")) return "랭킹";
    if (pathname.startsWith("/club/members")) return "회원";
    if (pathname.startsWith("/club/notices")) return "공지";
    if (pathname.startsWith("/club/finance")) return "회비 · 재정";
    if (pathname.startsWith("/club/manage")) return "동호회 관리";
    if (pathname.startsWith("/club/more")) return "더보기";
    if (pathname.startsWith("/club")) return "동호회 홈";
    if (pathname.startsWith("/tournaments")) return "대회";
    if (pathname.startsWith("/auth")) return "로그인";
    if (pathname.startsWith("/me")) return "마이페이지";
    return "민턴동";
  }, [pathname]);
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = usePageTitle(pathname);
  const router = useRouter();
  const showPublicFooter = showsPublicFooter(pathname);
  const hideBottomNav = hidesBottomNavigation(pathname);
  const authFlow = pathname === "/auth" || pathname.startsWith("/auth/");
  const iosNative = isIosNativeShell(
    Capacitor.getPlatform(),
    typeof navigator === "undefined" ? "" : navigator.userAgent,
  );

  useEffect(() => {
    const run = () => {
      // 로그인 가드가 있는 탭(/club)은 사전 로딩에서 제외한다.
      for (const tab of TABS) {
        if (tab.to === "/club") continue;
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
      {authFlow ? null : (
        <header className="z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="flex h-[54px] items-center gap-1 px-3">
            <Link to="/" aria-label="민턴동 홈" className="shrink-0">
              <img
                src="/mintondong-logo.png"
                alt="민턴동"
                width={92}
                height={24}
                className="h-6 w-auto object-contain"
              />
            </Link>
            <ClubSwitcher />
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="알림"
                onClick={() => toast.info("새로운 알림이 없어요.")}
                className="grid size-9 place-items-center rounded-full text-muted-foreground active:bg-accent"
              >
                <Bell className="size-[18px]" />
              </button>
              <AccountButton />
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
          className={`px-4 ${authFlow ? "pt-[max(0.75rem,env(safe-area-inset-top))]" : "pt-3"} ${
            hideBottomNav
              ? "pb-[max(2rem,env(safe-area-inset-bottom))]"
              : showPublicFooter
                ? "pb-8"
                : iosNative
                  ? "pb-20"
                  : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {isClubSection(pathname) ? <ClubSectionNav pathname={pathname} /> : null}
          {authFlow ? null : (
            <h1 className="mt-1 mb-3 text-[17px] font-extrabold tracking-tight text-foreground">
              {title}
            </h1>
          )}
          <div key={pathname} className="app-route-transition">
            <Outlet />
          </div>
        </main>

        {showPublicFooter ? <PublicFooter floatingNav={iosNative && !hideBottomNav} /> : null}
      </div>

      {hideBottomNav ? null : <BottomNav pathname={pathname} floating={iosNative} />}
    </div>
  );
}
