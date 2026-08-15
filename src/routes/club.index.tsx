import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveClubRootView } from "@/lib/auth/club-route-access";
import { useStore, useTodayPlayers } from "@/lib/badminton/store";
import { clubKeys, listMyClubs } from "@/lib/clubs/api";

export const Route = createFileRoute("/club/")({
  head: () => ({
    meta: [
      { title: "동호회 홈 – 민턴동" },
      {
        name: "description",
        content: "선택한 동호회의 출석·경기·게스트 모집·회비·회원 현황을 한 화면에서 확인해요.",
      },
      { property: "og:title", content: "동호회 홈 – 민턴동" },
      { property: "og:description", content: "동호회 출석·경기·게스트 모집·회비 현황 요약." },
    ],
  }),
  component: ClubIndexPage,
});

const QUICK = [
  { to: "/club/attendance", label: "출석 체크", icon: UserCheck },
  { to: "/games", label: "경기 배정", icon: Zap },
  { to: "/guest", label: "게스트 모집", icon: Users },
  { to: "/records", label: "활동 기록", icon: ClipboardList },
] as const;

const MORE = [
  { to: "/club/members", label: "회원", icon: UserCheck },
  { to: "/club/notices", label: "공지", icon: Megaphone },
  { to: "/club/finance", label: "회비/재정", icon: Wallet },
  { to: "/club/manage", label: "동호회 관리", icon: Trophy },
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
        로그인하면 가입한 동호회의 일정, 출석, 경기, 회원 정보를 이용할 수 있어요.
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
  const { club } = useStore();
  const { coming } = useTodayPlayers();
  const { user } = useAuth();
  const live = club.matches.filter((m) => m.status === "LIVE").length;
  const myClubs = useQuery({
    queryKey: clubKeys.mine(user?.id ?? null),
    queryFn: () => listMyClubs(user?.id ?? null),
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <section className="pt-3">
        <h1 className="page-heading">동호회</h1>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/clubs/new"
          className="surface-card flex min-h-24 flex-col items-start justify-between p-4 text-base font-extrabold active:scale-[0.98]"
        >
          <Plus className="size-4" /> 동호회 만들기
        </Link>
        <Link
          to="/clubs/find"
          className="surface-card flex min-h-24 flex-col items-start justify-between p-4 text-base font-extrabold active:scale-[0.98]"
        >
          <Search className="size-4" /> 동호회 찾기
        </Link>
      </div>

      {(myClubs.data?.length ?? 0) > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-extrabold tracking-tight">내 동호회</h2>
          <ul className="surface-card divide-y divide-border overflow-hidden">
            {myClubs.data!.map((c) => (
              <li key={c.id}>
                <Link
                  to="/clubs/$clubId"
                  params={{ clubId: c.id }}
                  className="flex items-center gap-3 p-4 active:bg-secondary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {c.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      멤버 {c.member_count} · {c.region ?? "지역 미등록"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="surface-card p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-wash text-lg font-extrabold text-brand-green">
            {club.club.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold text-foreground">{club.club.name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {club.club.location === "장소 미설정" ? "운동 장소 미등록" : club.club.location}
              </span>
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-center">
          {[
            { k: "회원", v: club.members.length },
            { k: "오늘 참석", v: coming.length },
            { k: "코트", v: club.courtCount },
            { k: "진행 경기", v: live },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-secondary py-3">
              <dt className="text-sm font-bold text-muted-foreground">{s.k}</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-green">{s.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="surface-card flex min-h-24 flex-col items-center justify-center gap-2 text-base font-bold text-foreground active:bg-secondary"
          >
            <Icon className="size-4 text-primary" />
            {label}
          </Link>
        ))}
      </section>

      <section className="surface-card p-5">
        <h2 className="text-xl font-extrabold text-foreground">다가오는 일정</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {club.sessionLabel} · {club.sessionTime}
        </p>
        <Link
          to="/club/schedule"
          className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-foreground text-base font-bold text-background"
        >
          <CalendarDays className="mr-1 size-3.5" /> 일정 보기
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold tracking-tight">더보기</h2>
        <ul className="surface-card divide-y divide-border overflow-hidden">
          {MORE.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex min-h-14 items-center gap-3 px-4 text-base font-bold text-foreground active:bg-secondary"
              >
                <Icon className="size-4 text-primary" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
