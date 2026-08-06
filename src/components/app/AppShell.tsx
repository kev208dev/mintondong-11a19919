import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Calendar, ClipboardList, GraduationCap, Users, Zap } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { useStore } from "@/lib/badminton/store";
import { AccountButton } from "./AccountButton";
import { ClubSwitcher } from "./ClubSwitcher";

const TABS = [
  { to: "/", label: "오늘", icon: Calendar },
  { to: "/games", label: "경기", icon: Zap },
  { to: "/lessons", label: "레슨", icon: GraduationCap },
  { to: "/records", label: "기록", icon: ClipboardList },
  { to: "/club", label: "모임", icon: Users },
] as const;

const BottomNav = memo(function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">

        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                preload="intent"
                className={`flex h-16 select-none flex-col items-center justify-center gap-1 text-[11px] font-bold transition-transform duration-75 active:scale-95 active:bg-accent ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full ${
                    active ? "bg-accent" : ""
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.6 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

function useHeaderConfig(pathname: string) {
  const { club, clubs } = useStore();
  return useMemo(() => {
    if (pathname.startsWith("/games")) {
      return {
        title: "경기",
        subtitle: `코트 ${club.courtCount}면 · 대기 ${club.queue.length}명`,
      };
    }
    if (pathname.startsWith("/lessons")) {
      const upcoming = club.bookings.filter(
        (b) => b.status === "BOOKED" && b.endAt > Date.now(),
      ).length;
      return {
        title: "레슨",
        subtitle: club.lessonsEnabled
          ? `코치 ${club.coaches.length}명 · 예약 ${upcoming}건`
          : "이 클럽은 레슨 미운영",
      };
    }
    if (pathname.startsWith("/payments/toss")) {
      return {
        title: "레슨 결제",
        subtitle: "토스페이먼츠 테스트 결제",
      };
    }
    if (pathname.startsWith("/records")) {
      const totalGames = club.matches.filter((m) => m.status === "DONE").length;
      return { title: "기록", subtitle: `${club.club.name} · 누적 ${totalGames}경기` };
    }

    if (pathname.startsWith("/club")) {
      return { title: "모임", subtitle: `가입한 클럽 ${clubs.length}개` };
    }
    if (pathname.startsWith("/auth")) {
      return { title: "계정", subtitle: "로그인하고 여러 기기에서 함께 써요" };
    }
    if (pathname.startsWith("/me")) {
      return { title: "마이페이지", subtitle: "내 계정과 모임 상태" };
    }
    return { title: "오늘", subtitle: `${club.sessionLabel} · ${club.sessionTime}` };
  }, [pathname, club, clubs.length]);
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { title, subtitle } = useHeaderConfig(pathname);

  const router = useRouter();

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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="brand-header sticky top-0 z-20 border-b border-border px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/mintondong-logo.png"
              alt="민턴동"
              width={137}
              height={36}
              className="h-9 w-auto shrink-0 object-contain"
            />
            <span className="min-w-0 truncate text-[11px] font-semibold text-muted-foreground">
              오늘의 모임과 경기, 한 번에
            </span>
          </div>
          <AccountButton />
        </div>
        <div className="mt-2.5">
          <ClubSwitcher />
        </div>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>


      <BottomNav pathname={pathname} />
    </div>
  );
}
