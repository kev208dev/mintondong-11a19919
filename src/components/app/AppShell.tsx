import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Trophy, User, Users } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ClubSectionNav, isClubSection } from "./ClubSectionNav";
import { AccountButton } from "./AccountButton";
import { ClubSwitcher } from "./ClubSwitcher";

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

const BottomNav = memo(function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = isTabActive(to, pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                preload="intent"
                className={`flex h-14 select-none flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-transform duration-75 active:scale-95 active:bg-accent ${
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

function usePageTitle(pathname: string) {
  return useMemo(() => {
    if (pathname === "/") return "홈";
    if (pathname.startsWith("/clubs/find")) return "동호회 찾기";
    if (pathname.startsWith("/clubs/new")) return "동호회 만들기";
    if (pathname.startsWith("/clubs/")) return "동호회";
    if (pathname.startsWith("/games")) return "경기";
    if (pathname.startsWith("/lessons")) return "레슨";
    if (pathname.startsWith("/payments/toss")) return "레슨 결제";
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)]">
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

      <main className="flex-1 px-4 pb-24 pt-3">
        {isClubSection(pathname) ? <ClubSectionNav pathname={pathname} /> : null}
        <h1 className="mt-1 mb-3 text-[17px] font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <Outlet />
      </main>

      <BottomNav pathname={pathname} />
    </div>
  );
}
