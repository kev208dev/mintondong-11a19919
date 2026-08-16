import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, UserCheck, UsersRound } from "lucide-react";
import { HomeTournamentSection } from "@/components/tournaments/HomeTournamentSection";
import { useDailyAttendance, useStore } from "@/lib/badminton/store";
import type { DailyAttendanceStatus } from "@/lib/badminton/types";

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
  const { club, meMemberId, setDailyAttendance } = useStore();
  const { counts, getStatus } = useDailyAttendance();
  const myStatus = getStatus(meMemberId);

  return (
    <div className="space-y-8">
      <TodayAttendanceCard
        clubName={club.club.name}
        counts={counts}
        myStatus={myStatus}
        onStatusChange={(status) => setDailyAttendance(meMemberId, status)}
      />
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
    </div>
  );
}

function TodayAttendanceCard({
  clubName,
  counts,
  myStatus,
  onStatusChange,
}: {
  clubName: string;
  counts: { ATTENDING: number; UNDECIDED: number; NOT_ATTENDING: number };
  myStatus: DailyAttendanceStatus;
  onStatusChange: (status: DailyAttendanceStatus) => void;
}) {
  const statuses: { key: DailyAttendanceStatus; label: string }[] = [
    { key: "ATTENDING", label: "참석" },
    { key: "NOT_ATTENDING", label: "불참" },
    { key: "UNDECIDED", label: "미정" },
  ];
  return (
    <section className="surface-card p-5" aria-label="오늘 출석">
      <p className="text-lg font-extrabold">오늘 출석</p>
      <p className="mt-3 text-[32px] font-extrabold tracking-tight text-foreground">
        {counts.ATTENDING}명 참석
      </p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{clubName}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <AttendanceMetric label="참석" value={counts.ATTENDING} />
        <AttendanceMetric label="미정" value={counts.UNDECIDED} />
        <AttendanceMetric label="불참" value={counts.NOT_ATTENDING} />
      </div>
      <p className="mt-5 text-sm font-bold text-foreground">오늘 참석하시나요?</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {statuses.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={myStatus === key}
            onClick={() => onStatusChange(key)}
            className={`h-11 rounded-xl text-sm font-bold transition-colors ${
              myStatus === key
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Link
        to="/club/attendance"
        className="mt-4 flex min-h-11 items-center justify-between text-sm font-bold text-foreground"
      >
        출석 현황 보기 <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}

function AttendanceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/70 py-2">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
