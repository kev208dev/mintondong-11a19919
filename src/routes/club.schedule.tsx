import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useStore } from "@/lib/badminton/store";

export const Route = createFileRoute("/club/schedule")({
  head: () => ({
    meta: [
      { title: "동호회 일정 – 민턴동" },
      { name: "description", content: "정기 운동 일정과 출석 체크를 확인해요." },
      { property: "og:title", content: "동호회 일정 – 민턴동" },
      { property: "og:description", content: "정기 운동 일정과 출석 체크." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { club } = useStore();

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <p className="text-[11px] font-bold text-muted-foreground">정기 운동</p>
        <p className="mt-1 text-[15px] font-extrabold text-foreground">{club.sessionLabel}</p>
        <p className="text-xs text-muted-foreground">
          {club.sessionTime} ·{" "}
          {club.club.location === "장소 미설정" ? "운동 장소 미등록" : club.club.location}
        </p>
        <Link
          to="/club/attendance"
          className="mt-3 flex h-10 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground"
        >
          <CalendarDays className="mr-1 size-4" /> 오늘 출석 체크하기
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm font-bold text-foreground">등록된 다음 일정이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          정기 운동 외 일정이 추가되면 이곳에서 확인할 수 있어요.
        </p>
      </section>
    </div>
  );
}
