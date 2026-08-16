import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDailyAttendance, useStore, seoulDateKey } from "@/lib/badminton/store";
import type { DailyAttendanceStatus } from "@/lib/badminton/types";

export const Route = createFileRoute("/club/attendance")({
  head: () => ({
    meta: [
      { title: "오늘 출석 – 민턴동 동호회" },
      { property: "og:title", content: "오늘 출석 – 민턴동 동호회" },
    ],
  }),
  component: AttendancePage,
});

const STATUS_OPTIONS: { key: DailyAttendanceStatus; label: string }[] = [
  { key: "ATTENDING", label: "참석" },
  { key: "UNDECIDED", label: "미정" },
  { key: "NOT_ATTENDING", label: "불참" },
];

function formatDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function shiftDate(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day!, 12));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function AttendancePage() {
  const { can, meMemberId, setDailyAttendance } = useStore();
  const [date, setDate] = useState(seoulDateKey());
  const { members, counts, getStatus } = useDailyAttendance(date);

  if (!can("VIEW_ATTENDANCE")) {
    return (
      <section className="surface-card p-6 text-center">
        <p className="text-base font-bold text-foreground">출석 현황을 볼 권한이 없어요</p>
      </section>
    );
  }

  const updateMine = (status: DailyAttendanceStatus) =>
    setDailyAttendance(meMemberId, status, date);
  const grouped = STATUS_OPTIONS.map((status) => ({
    ...status,
    members: members.filter((member) => getStatus(member.id) === status.key),
  }));

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 날짜"
            className="grid size-11 place-items-center rounded-xl text-foreground active:bg-secondary"
            onClick={() => setDate((value) => shiftDate(value, -1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-muted-foreground">{formatDate(date)}</p>
          </div>
          <button
            type="button"
            aria-label="다음 날짜"
            className="grid size-11 place-items-center rounded-xl text-foreground active:bg-secondary"
            onClick={() => setDate((value) => shiftDate(value, 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        {date !== seoulDateKey() ? (
          <Button
            variant="ghost"
            className="mx-auto mt-1 flex h-9 text-xs font-bold"
            onClick={() => setDate(seoulDateKey())}
          >
            오늘로
          </Button>
        ) : null}
      </header>

      <section className="surface-card p-5">
        <p className="text-sm font-bold text-muted-foreground">내 출석</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={getStatus(meMemberId) === key}
              onClick={() => updateMine(key)}
              className={`h-11 rounded-xl text-sm font-bold ${
                getStatus(meMemberId) === key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center" aria-label="출석 요약">
        <Summary label="참석" value={counts.ATTENDING} />
        <Summary label="미정" value={counts.UNDECIDED} />
        <Summary label="불참" value={counts.NOT_ATTENDING} />
      </section>

      <section className="space-y-5">
        {grouped.map(({ key, label, members: group }) => (
          <div key={key}>
            <h2 className="text-lg font-extrabold">
              {label} {group.length}
            </h2>
            {group.length ? (
              <ul className="mt-2 divide-y divide-border/70 rounded-2xl bg-card px-4">
                {group.map((member) => (
                  <li key={member.id} className="flex min-h-14 items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold">
                      {member.name.slice(0, 1)}
                    </span>
                    <span className="text-sm font-bold">{member.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">아직 응답한 멤버가 없어요.</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/70 py-3">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
