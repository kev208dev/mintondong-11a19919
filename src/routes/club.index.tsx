import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Trophy, Users, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveClubRootView } from "@/lib/auth/club-route-access";
import { useDailyAttendance, useStore } from "@/lib/badminton/store";

export const Route = createFileRoute("/club/")({
  head: () => ({
    meta: [
      { title: "동호회 – 민턴동" },
      {
        name: "description",
        content: "선택한 동호회의 출석·경기·회비·회원 현황을 한 화면에서 확인해요.",
      },
      { property: "og:title", content: "동호회 – 민턴동" },
      { property: "og:description", content: "동호회 출석·경기·회비 현황 요약." },
    ],
  }),
  component: ClubIndexPage,
});

const QUICK_ACTIONS = [
  { to: "/games", label: "경기", icon: Trophy },
  { to: "/club/attendance", label: "출석", icon: Users },
  { to: "/club/members", label: "멤버", icon: Users },
] as const;

export function ClubLoginGate() {
  return (
    <section className="mx-auto flex min-h-[58vh] max-w-sm flex-col items-center justify-center px-4 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-secondary text-primary">
        <Users className="size-7" aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-extrabold tracking-tight text-foreground">
        동호회 기능은 로그인이 필요해요
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        로그인하면 가입한 동호회의 출석, 경기, 회원 정보를 이용할 수 있어요.
      </p>
      <Link
        to="/auth"
        search={{ next: "/club" }}
        className="mt-7 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground active:scale-[0.98]"
      >
        로그인하기
      </Link>
      <Link
        to="/auth/signup"
        search={{ next: "/club" }}
        className="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-primary"
      >
        계정이 없나요? 회원가입
      </Link>
      <Link
        to="/clubs/find"
        className="mt-1 flex min-h-11 items-center justify-center text-sm font-semibold text-muted-foreground underline-offset-4 active:text-foreground"
      >
        동호회 둘러보기
      </Link>
    </section>
  );
}

function ClubAuthLoading() {
  return (
    <div
      className="mx-auto flex min-h-[58vh] max-w-sm flex-col items-center justify-center px-4"
      role="status"
    >
      <span className="size-16 animate-pulse rounded-full bg-secondary" />
      <span className="mt-5 h-5 w-48 animate-pulse rounded-full bg-secondary" />
      <span className="mt-3 h-4 w-64 max-w-full animate-pulse rounded-full bg-secondary" />
      <span className="sr-only">로그인 상태 확인 중</span>
    </div>
  );
}

function ClubIndexPage() {
  const { user, loading } = useAuth();
  const view = resolveClubRootView({ authLoading: loading, authenticated: Boolean(user) });
  if (view === "loading") return <ClubAuthLoading />;
  if (view === "login") return <ClubLoginGate />;
  return <ClubHomePage />;
}

function ClubHomePage() {
  const { club, can } = useStore();
  const { counts } = useDailyAttendance();

  return (
    <div className="space-y-5">
      <section className="pt-2">
        <h1 className="page-heading">동호회</h1>
        <div className="mt-4 flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-wash text-base font-extrabold text-brand-green">
            {club.club.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-foreground">{club.club.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">
                {club.club.location === "장소 미설정" ? "장소 미정" : club.club.location}
              </span>
              <span aria-hidden>·</span>
              <span className="shrink-0">멤버 {club.members.length}명</span>
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted-foreground">오늘 출석</p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
              {counts.ATTENDING}명 참석
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              참석 {counts.ATTENDING} · 미정 {counts.UNDECIDED} · 불참 {counts.NOT_ATTENDING}
            </p>
          </div>
          <Link
            to="/club/attendance"
            search={{ date: undefined }}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-bold text-primary active:bg-primary/10"
          >
            자세히
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5" aria-label="동호회 주요 기능">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="surface-card flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl text-sm font-bold text-foreground transition-transform active:scale-[0.98]"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </section>

      {can("VIEW_FINANCE") ? (
        <Link
          to="/club/finance"
          className="surface-card flex min-h-14 items-center justify-between px-4 text-base font-extrabold text-foreground transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <Wallet className="size-5 text-primary" /> 회비 관리
          </span>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
      ) : (
        <div
          className="surface-card flex min-h-14 items-center justify-between px-4 text-base font-extrabold text-muted-foreground"
          aria-disabled="true"
        >
          <span className="flex items-center gap-2">
            <Wallet className="size-5" /> 회비 관리 🔒
          </span>
        </div>
      )}
    </div>
  );
}
