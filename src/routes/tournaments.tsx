import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "대회 – 민턴동" },
      {
        name: "description",
        content: "배드민턴 대회 정보와 참가 신청을 한곳에서 확인할 수 있도록 준비하고 있어요.",
      },
      { property: "og:title", content: "대회 – 민턴동" },
      { property: "og:description", content: "배드민턴 대회 정보와 참가 신청." },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-accent">
          <Trophy className="size-5 text-primary" />
        </span>
        <p className="mt-2.5 text-sm font-extrabold text-foreground">
          배드민턴 대회 정보를 모으고 있어요
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          지역 대회 일정과 참가 신청을 한곳에서 확인할 수 있도록 준비하고 있어요. 그동안은 동호회
          내부 경기로 실력을 점검해 보세요.
        </p>
        <Link
          to="/games"
          className="mt-3 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          동호회 경기 시작하기
        </Link>
      </section>
    </div>
  );
}
