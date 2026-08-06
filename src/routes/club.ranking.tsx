import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useStore } from "@/lib/badminton/store";

export const Route = createFileRoute("/club/ranking")({
  head: () => ({
    meta: [
      { title: "동호회 랭킹 – 민턴동" },
      { name: "description", content: "동호회 내 참여·승패 기반 랭킹 화면 (준비 중)." },
      { property: "og:title", content: "동호회 랭킹 – 민턴동" },
      { property: "og:description", content: "참여·승패 기반 동호회 랭킹." },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
  const { club } = useStore();
  const people = [...club.members, ...club.guests];
  const rows = people
    .map((p) => ({ p, st: club.stats[p.id] ?? { games: 0, wins: 0 } }))
    .filter((r) => r.st.games > 0)
    .sort((a, b) => b.st.wins - a.st.wins || b.st.games - a.st.games);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-bold text-foreground">아직 랭킹 데이터가 없어요</p>
          <p className="mt-1 text-xs text-muted-foreground">
            정식 랭킹 산정 방식(시즌·점수제)은 준비 중이에요. 경기를 기록하면 임시 참여 순위가
            표시됩니다.
          </p>
          <Link
            to="/games"
            className="mt-3 inline-flex h-9 items-center rounded-xl bg-secondary px-4 text-xs font-bold text-secondary-foreground"
          >
            경기 기록하러 가기
          </Link>
        </section>
      ) : (
        <>
          <p className="px-1 text-[11px] text-muted-foreground">
            임시 순위 · 승수 기준 (정식 랭킹 산정은 준비 중)
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {rows.map((r, i) => (
              <li key={r.p.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="w-5 text-center text-sm font-extrabold tabular-nums text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                  {r.p.name}
                </span>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {r.st.wins}승 / {r.st.games}경기
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link
        to="/records"
        className="flex h-10 items-center justify-center rounded-xl bg-secondary text-xs font-bold text-secondary-foreground"
      >
        <ClipboardList className="mr-1 size-4" /> 전체 활동 기록 보기
      </Link>
    </div>
  );
}
