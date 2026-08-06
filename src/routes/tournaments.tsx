import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "대회 – 민턴동" },
      { name: "description", content: "지역 배드민턴 대회 정보와 참가 신청 (준비 중)." },
      { property: "og:title", content: "대회 – 민턴동" },
      { property: "og:description", content: "배드민턴 대회 정보와 참가 신청." },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-dashed border-border p-6 text-center">
        <Trophy className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">대회 기능 준비 중</p>
        <p className="mt-1 text-xs text-muted-foreground">
          대회 일정·참가 신청·대진표는 다음 단계에서 열려요. 지금은 동호회 내부 경기 기록을 사용해
          주세요.
        </p>
        <Link
          to="/games"
          className="mt-3 inline-flex h-9 items-center rounded-xl bg-secondary px-4 text-xs font-bold text-secondary-foreground"
        >
          동호회 경기로 가기
        </Link>
      </section>
    </div>
  );
}
