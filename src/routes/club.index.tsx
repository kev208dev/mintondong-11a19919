import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Trophy,
  UserCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore, useTodayPlayers } from "@/lib/badminton/store";
import { clubKeys, listMyClubs } from "@/lib/clubs/api";

export const Route = createFileRoute("/club/")({
  head: () => ({
    meta: [
      { title: "동호회 홈 – 민턴동" },
      {
        name: "description",
        content: "선택한 동호회의 출석·경기·레슨·회비·회원 현황을 한 화면에서 확인해요.",
      },
      { property: "og:title", content: "동호회 홈 – 민턴동" },
      { property: "og:description", content: "동호회 출석·경기·레슨·회비 현황 요약." },
    ],
  }),
  component: ClubHomePage,
});

const QUICK = [
  { to: "/club/attendance", label: "출석 체크", icon: UserCheck },
  { to: "/games", label: "경기 배정", icon: Zap },
  { to: "/lessons", label: "레슨 예약", icon: GraduationCap },
  { to: "/records", label: "활동 기록", icon: ClipboardList },
] as const;

const MORE = [
  { to: "/club/members", label: "회원", icon: UserCheck },
  { to: "/club/notices", label: "공지", icon: Megaphone },
  { to: "/club/finance", label: "회비/재정", icon: Wallet },
  { to: "/club/manage", label: "동호회 관리", icon: Trophy },
] as const;

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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/clubs/new"
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
        >
          <Plus className="size-4" /> 동호회 만들기
        </Link>
        <Link
          to="/clubs/find"
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-xs font-bold text-secondary-foreground"
        >
          <Search className="size-4" /> 동호회 찾기
        </Link>
      </div>

      {(myClubs.data?.length ?? 0) > 0 ? (
        <section>
          <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            내 동호회
          </h2>
          <ul className="mt-1.5 divide-y divide-border">
            {myClubs.data!.map((c) => (
              <li key={c.id}>
                <Link
                  to="/clubs/$clubId"
                  params={{ clubId: c.id }}
                  className="flex items-center gap-3 py-2.5 active:opacity-70"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {c.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      멤버 {c.member_count} · {c.region ?? "지역 미등록"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-base font-extrabold text-accent-foreground">
            {club.club.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold text-foreground">{club.club.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {club.club.location === "장소 미설정" ? "운동 장소 미등록" : club.club.location}
              </span>
            </p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          {[
            { k: "회원", v: club.members.length },
            { k: "오늘 참석", v: coming.length },
            { k: "코트", v: club.courtCount },
            { k: "진행 경기", v: live },
          ].map((s) => (
            <div key={s.k} className="rounded-xl bg-secondary py-2">
              <dt className="text-[10.5px] font-semibold text-muted-foreground">{s.k}</dt>
              <dd className="text-base font-extrabold tabular-nums text-secondary-foreground">
                {s.v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid grid-cols-4 gap-1.5">
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card py-3 text-[11px] font-bold text-foreground active:bg-accent"
          >
            <Icon className="size-4 text-primary" />
            {label}
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-3.5">
        <h2 className="text-[13px] font-extrabold text-foreground">다가오는 일정</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {club.sessionLabel} · {club.sessionTime}
        </p>
        <Link
          to="/club/schedule"
          className="mt-2.5 flex h-9 items-center justify-center rounded-xl bg-secondary text-xs font-bold text-secondary-foreground"
        >
          <CalendarDays className="mr-1 size-3.5" /> 일정 보기
        </Link>
      </section>

      <section>
        <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          더보기
        </h2>
        <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {MORE.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-2.5 px-3.5 py-3 text-sm font-bold text-foreground active:bg-accent"
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
