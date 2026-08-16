import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { HomeTournamentSection } from "@/components/tournaments/HomeTournamentSection";
import { seoulDateKey, useDailyAttendance, useStore } from "@/lib/badminton/store";
import type { DailyAttendanceStatus } from "@/lib/badminton/types";
import {
  formatDailyAttendanceDate,
  shiftDailyAttendanceDate,
} from "@/lib/badminton/daily-attendance";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "민턴동 – 배드민턴 동호회" },
      { name: "description", content: "오늘 출석과 동호회 활동을 한 곳에서." },
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
  const { meMemberId, setDailyAttendance } = useStore();
  const [attendanceDate, setAttendanceDate] = useState(seoulDateKey());
  const { counts, getStatus } = useDailyAttendance(attendanceDate);
  const myStatus = getStatus(meMemberId);

  return (
    <div className="space-y-8">
      <TodayAttendanceCard
        attendanceDate={attendanceDate}
        counts={counts}
        myStatus={myStatus}
        onPrevious={() => setAttendanceDate((value) => shiftDailyAttendanceDate(value, -1))}
        onNext={() => setAttendanceDate((value) => shiftDailyAttendanceDate(value, 1))}
        onStatusChange={(status) => setDailyAttendance(meMemberId, status, attendanceDate)}
      />
      <section className="grid grid-cols-1 gap-3" aria-label="빠른 실행">
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
      <HomeTournamentSection />
    </div>
  );
}

function TodayAttendanceCard({
  attendanceDate,
  counts,
  myStatus,
  onStatusChange,
  onPrevious,
  onNext,
}: {
  attendanceDate: string;
  counts: { ATTENDING: number; UNDECIDED: number; NOT_ATTENDING: number };
  myStatus: DailyAttendanceStatus;
  onStatusChange: (status: DailyAttendanceStatus) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const statuses: { key: DailyAttendanceStatus; label: string }[] = [
    { key: "ATTENDING", label: "참석" },
    { key: "NOT_ATTENDING", label: "불참" },
    { key: "UNDECIDED", label: "미정" },
  ];
  const today = attendanceDate === seoulDateKey();
  return (
    <section className="surface-card p-5" aria-label="날짜별 출석">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="이전 날짜"
          onClick={onPrevious}
          className="grid size-10 place-items-center rounded-xl text-foreground active:bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="text-lg font-extrabold tracking-tight">
            {formatDailyAttendanceDate(attendanceDate)}
          </p>
          {today ? (
            <span className="mt-1 inline-flex rounded-full bg-brand-wash px-2 py-0.5 text-xs font-bold text-brand-deep">
              오늘
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="다음 날짜"
          onClick={onNext}
          className="grid size-10 place-items-center rounded-xl text-foreground active:bg-secondary"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <p className="mt-3 text-[32px] font-extrabold tracking-tight text-foreground">
        {counts.ATTENDING}명
      </p>
      <p className="text-sm font-bold text-muted-foreground">참석 예정</p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <AttendanceMetric label="참석" value={counts.ATTENDING} tone="attending" />
        <AttendanceMetric label="미정" value={counts.UNDECIDED} tone="undecided" />
        <AttendanceMetric label="불참" value={counts.NOT_ATTENDING} tone="absent" />
      </div>
      <p className="mt-5 text-sm font-bold text-foreground">내 출석</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {statuses.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={myStatus === key}
            onClick={() => onStatusChange(key)}
            className={`h-11 rounded-xl text-sm font-bold transition-[color,background-color,transform] duration-150 active:scale-[0.98] ${
              myStatus === key
                ? key === "ATTENDING"
                  ? "bg-brand-green text-white"
                  : key === "UNDECIDED"
                    ? "bg-brand-lime text-ink"
                    : "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Link
        to="/club/attendance"
        search={{ date: attendanceDate }}
        className="mt-4 flex min-h-11 items-center justify-between text-sm font-bold text-foreground"
      >
        출석 현황 보기 <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}

function AttendanceMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "attending" | "undecided" | "absent";
}) {
  const toneClass =
    tone === "attending"
      ? "bg-brand-wash"
      : tone === "undecided"
        ? "bg-brand-lime/25"
        : "bg-secondary/70";
  return (
    <div className={`rounded-xl py-2 ${toneClass}`}>
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
