import { RequireAuth } from "@/components/app/RequireAuth";
import { createFileRoute } from "@tanstack/react-router";
import { playerName } from "@/lib/badminton/engine";
import { useStore } from "@/lib/badminton/store";
import { LEVEL_LABEL } from "@/lib/badminton/types";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "활동 기록 – 경기 결과와 멤버 활동" },
      {
        name: "description",
        content: "최근 경기 결과와 멤버별 활동 기록을 확인해요. 순위 경쟁보다 참여 기록 중심.",
      },
      { property: "og:title", content: "활동 기록 – 민턴동" },
      { property: "og:description", content: "최근 경기와 멤버별 참여 기록." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RecordsPage />
    </RequireAuth>
  ),
});

function RecordsPage() {
  const { club } = useStore();
  const done = club.matches.filter((m) => m.status === "DONE");
  const people = [...club.members, ...club.guests];
  const totalGames = done.length;

  return (
    <>
      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "완료 경기", value: totalGames },
          { label: "오늘 체크인", value: club.checkedIn.length },
          {
            label: "총 득점",
            value: done.reduce((t, m) => t + m.scoreA + m.scoreB, 0),
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card shadow-soft p-3 text-center">
            <p className="text-2xl font-extrabold tabular-nums text-brand-deep">{s.value}</p>
            <p className="mt-0.5 text-[11.5px] font-semibold text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold text-foreground">최근 경기</h2>
        <ul className="mt-3 space-y-2">
          {done.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              아직 저장된 경기가 없어요. 경기 탭에서 배정하고 점수를 기록해 보세요.
            </li>
          ) : null}
          {done.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border bg-card shadow-soft p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {m.courtIndex + 1}번 코트 · {m.target}점제
                </span>
                <span>
                  {m.endedAt
                    ? new Date(m.endedAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={`truncate text-xs font-bold ${
                      m.winner === "A" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {m.teamA.map((id) => playerName(club, id)).join(" · ")}
                  </p>
                  <p
                    className={`truncate text-xs font-bold ${
                      m.winner === "B" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {m.teamB.map((id) => playerName(club, id)).join(" · ")}
                  </p>
                </div>
                <p className="text-xl font-extrabold tabular-nums text-foreground">
                  {m.scoreA} : {m.scoreB}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold text-foreground">멤버 활동</h2>
        <p className="text-[11px] text-muted-foreground">
          순위보다 얼마나 함께 뛰었는지를 보여줘요.
        </p>
        <ul className="mt-3 space-y-2">
          {people.map((p) => {
            const st = club.stats[p.id] ?? { games: 0, wins: 0 };
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card shadow-soft p-3"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
                  {p.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {LEVEL_LABEL[p.level]}
                    {p.isGuest ? " · 게스트" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold tabular-nums text-foreground">
                    {st.games}경기
                  </p>
                  <p className="text-[11px] text-muted-foreground">{st.wins}승</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
