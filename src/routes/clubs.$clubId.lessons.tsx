import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/clubs/$clubId/lessons")({
  component: ClubDetailLessons,
});

function ClubDetailLessons() {
  return (
    <div className="rounded-2xl bg-secondary/60 p-8 text-center">
      <GraduationCap className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-bold text-foreground">레슨 준비 중</p>
      <p className="mt-1 text-xs text-muted-foreground">
        코치 등록과 레슨 예약 기능은 다음 단계에서 제공될 예정이에요.
      </p>
    </div>
  );
}
