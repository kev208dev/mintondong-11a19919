import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarDays, ChevronRight, Search, UserCheck, UsersRound } from "lucide-react";
import { HomeTournamentSection } from "@/components/tournaments/HomeTournamentSection";
import { useStore, useTodayPlayers } from "@/lib/badminton/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "민턴동 – 배드민턴 동호회와 게스트 운동" },
      { name: "description", content: "동호회 활동과 주변 게스트 운동을 한 곳에서." },
    ],
  }),
  component: HomePage,
});

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h2>
      {to ? (
        <Link
          to={to}
          className="inline-flex min-h-11 items-center gap-0.5 text-sm font-bold text-foreground"
        >
          전체보기 <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function HomePage() {
  const { club, can } = useStore();
  const { coming } = useTodayPlayers();
  const placeUnset = !club.club.location || club.club.location === "장소 미설정";
  const scheduleUnset = club.sessionLabel === "운동 일정 미설정";
  const canSettings = can("MANAGE_CLUB_SETTINGS");

  return (
    <div className="space-y-8">
      <header className="pt-3">
        <p className="text-sm font-bold text-brand-green">민턴동</p>
        <h1 className="mt-2 page-heading">오늘 어디서 칠까요?</h1>
      </header>
      <section className="grid grid-cols-2 gap-3" aria-label="빠른 실행">
        <Link
          to="/guest"
          className="surface-card flex min-h-32 flex-col justify-between p-4 active:scale-[0.98]"
        >
          <UserCheck className="size-6 text-brand-green" />
          <span>
            <strong className="block text-lg font-extrabold">게스트 찾기</strong>
            <span className="text-sm text-muted-foreground">함께 칠 사람</span>
          </span>
        </Link>
        <Link
          to="/clubs/find"
          className="surface-card flex min-h-32 flex-col justify-between p-4 active:scale-[0.98]"
        >
          <Search className="size-6 text-foreground" />
          <span>
            <strong className="block text-lg font-extrabold">동호회 찾기</strong>
            <span className="text-sm text-muted-foreground">새 모임 둘러보기</span>
          </span>
        </Link>
      </section>
      <section>
        <SectionHeader title="오늘 운동" to="/club/schedule" />
        <Link to="/club/schedule" className="surface-card block p-5 active:scale-[0.99]">
          {scheduleUnset ? (
            <p className="text-lg font-extrabold">오늘 일정 없음</p>
          ) : (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-brand-green">
                  {club.sessionTime}
                </p>
                <p className="mt-2 text-lg font-extrabold">{club.club.name}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> {club.sessionLabel}
                </p>
              </div>
              <span className="text-sm font-bold text-muted-foreground">
                자세히 <ChevronRight className="inline size-4" />
              </span>
            </div>
          )}
          {!scheduleUnset ? (
            <p className="mt-4 text-sm text-muted-foreground">참가 {coming.length}명</p>
          ) : null}
        </Link>
      </section>
      <section>
        <SectionHeader title="근처 게스트" to="/guest" />
        <Link to="/guest" className="surface-card flex items-center gap-4 p-5 active:scale-[0.99]">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-wash text-brand-green">
            <UsersRound className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-lg font-extrabold">가까운 운동 찾기</strong>
            <span className="text-sm text-muted-foreground">가격과 시간 비교</span>
          </span>
          <ChevronRight className="size-5 text-foreground" />
        </Link>
      </section>
      <HomeTournamentSection />
      {placeUnset ? (
        <section className="surface-card p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold">운동 장소 없음</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {canSettings ? "장소를 등록해 주세요." : "운영진이 장소를 등록하면 표시돼요."}
              </p>
            </div>
          </div>
          {canSettings ? (
            <Link
              to="/club/manage"
              className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-foreground text-base font-bold text-background"
            >
              장소 설정
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
