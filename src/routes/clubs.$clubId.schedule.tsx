import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/clubs/$clubId/schedule")({
  component: ClubDetailSchedule,
});

function ClubDetailSchedule() {
  return (
    <div className="rounded-2xl bg-secondary/60 p-8 text-center">
      <CalendarDays className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-bold text-foreground">일정이 없어요</p>
      <p className="mt-1 text-xs text-muted-foreground">
        운영자가 정기 운동 일정을 등록하면 여기에 표시돼요.
      </p>
    </div>
  );
}
