import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/clubs/$clubId/lessons")({
  component: ClubDetailLessons,
});

function ClubDetailLessons() {
  return (
    <div className="rounded-2xl bg-secondary/60 p-8 text-center">
      <GraduationCap className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-bold text-foreground">등록된 레슨이 없어요</p>
      <p className="mt-1 text-xs text-muted-foreground">
        동호회에서 레슨을 열면 이곳에서 예약할 수 있어요.
      </p>
    </div>
  );
}
