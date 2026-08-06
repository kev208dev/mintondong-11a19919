import { createFileRoute } from "@tanstack/react-router";
import { Camera, Minus, Plus, Sparkles, Timer, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Scoreboard } from "@/components/app/Scoreboard";
import { Button } from "@/components/ui/button";
import { playerName } from "@/lib/badminton/engine";
import { useStore } from "@/lib/badminton/store";
import { LEVEL_LABEL } from "@/lib/badminton/types";
import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "경기 운영 – 코트 배정과 점수판" },
      {
        name: "description",
        content: "코트 수 설정, 대기열 관리, 공정 복식 자동 배정과 21점 듀스 점수판.",
      },
      { property: "og:title", content: "경기 운영 – 민턴동" },
      { property: "og:description", content: "공정한 복식 배정과 점수판을 한 화면에서." },
    ],
  }),
  component: GamesPage,
});

const TARGETS = [21, 15, 11];

function GamesPage() {
  const { club, setCourtCount, setDefaultTarget, startMatch, dequeue, enqueue, can, meMemberId } = useStore();
  const canCourts = can("MANAGE_COURTS");
  const canCreate = can("CREATE_MATCHES");
  const canManageQueue = can("MANAGE_COURTS");
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  // 대기 시간은 하이드레이션 이후에만 계산 (서버/클라이언트 시각 차이로 인한 불일치 방지)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const liveMatches = club.matches.filter((m) => m.status === "LIVE");
  const courts = Array.from({ length: club.courtCount }, (_, i) => ({
    index: i,
    match: liveMatches.find((m) => m.courtIndex === i) ?? null,
  }));
  const openMatch = club.matches.find((m) => m.id === openMatchId) ?? null;
  const playingIds = liveMatches.flatMap((m) => [...m.teamA, ...m.teamB]);
  const benched = [...club.members, ...club.guests].filter(
    (m) =>
      club.checkedIn.includes(m.id) &&
      !club.queue.some((q) => q.id === m.id) &&
      !playingIds.includes(m.id),
  );

  if (!can("VIEW_GAMES")) {
    return (
      <section className="rounded-3xl border border-border bg-card shadow-soft p-6 text-center">
        <p className="text-base font-bold text-foreground">경기 현황을 볼 권한이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">클럽 운영자에게 경기 보기 권한을 요청해 주세요.</p>
      </section>
    );
  }

  return (
    <>
      {canCourts ? (
      <section className="rounded-3xl border border-border bg-card shadow-soft p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">코트 수</p>
            <p className="text-[11px] text-muted-foreground">클럽별로 따로 저장돼요</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="secondary"
              className="size-11 rounded-2xl"
              onClick={() => setCourtCount(club.courtCount - 1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-8 text-center text-2xl font-extrabold tabular-nums">
              {club.courtCount}
            </span>
            <Button
              size="icon"
              variant="secondary"
              className="size-11 rounded-2xl"
              onClick={() => setCourtCount(club.courtCount + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-sm font-bold text-foreground">기본 점수제</p>
          <div className="mt-2 flex gap-2">
            {TARGETS.map((t) => (
              <button
                key={t}
                onClick={() => setDefaultTarget(t)}
                className={`h-11 flex-1 rounded-xl text-sm font-bold ${
                  club.defaultTarget === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t}점
              </button>
            ))}
            <input
              inputMode="numeric"
              placeholder="직접"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                const n = Number(e.target.value);
                if (n >= 5 && n <= 50) setDefaultTarget(n);
              }}
              className="h-11 w-16 rounded-xl bg-secondary text-center text-sm font-bold text-secondary-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>
      ) : null}

      <section className="mt-5 space-y-3">
        <h2 className="text-base font-bold text-foreground">코트 현황</h2>
        {courts.map(({ index, match }) => (
          <div
            key={index}
            className={`rounded-3xl border p-4 ${
              match
                ? "border-primary/35 bg-card card-soft"
                : "border-dashed border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-foreground">{index + 1}번 코트</p>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  match ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {match ? (
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                ) : null}
                {match ? "경기 중" : "비어 있음"}
              </span>
            </div>
            {match ? (
              <>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {match.teamA.map((id) => playerName(club, id)).join(" · ")}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-foreground">
                      {match.teamB.map((id) => playerName(club, id)).join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                    {match.scoreA} : {match.scoreB}
                  </p>
                </div>
                <Button
                  className="mt-3 h-12 w-full rounded-2xl font-bold"
                  onClick={() => setOpenMatchId(match.id)}
                >
                  점수판 열기
                </Button>
              </>
            ) : canCreate ? (
              <Button
                className="mt-3 h-12 w-full rounded-2xl font-bold"
                onClick={() => {
                  const id = startMatch(index);
                  if (!id) toast.error("대기 인원이 4명 이상이어야 배정할 수 있어요.");
                  else {
                    setOpenMatchId(id);
                    toast.success("공정 배정 완료 – 경기수·대기시간·실력 반영");
                  }
                }}
              >
                <Zap className="mr-1 size-4" /> 자동 배정 시작
              </Button>
            ) : (
              <p className="mt-3 rounded-2xl bg-secondary p-3 text-[11px] text-secondary-foreground">
                경기 배정은 운영 권한이 있는 멤버만 할 수 있어요.
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold text-foreground">대기열 {club.queue.length}명</h2>
        <p className="text-[11px] text-muted-foreground">경기 수가 적고 오래 기다린 순서</p>
        <ul className="mt-3 space-y-2">
          {[...club.queue]
            .sort((a, b) => {
              const ga = club.stats[a.id]?.games ?? 0;
              const gb = club.stats[b.id]?.games ?? 0;
              return ga !== gb ? ga - gb : a.since - b.since;
            })
            .map((q, i) => {
              const p = [...club.members, ...club.guests].find((m) => m.id === q.id);
              const wait = now === null ? null : Math.max(0, Math.round((now - q.since) / 60000));
              return (
                <li
                  key={q.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card shadow-soft p-3"
                >
                  <span className="w-5 text-center text-sm font-extrabold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{p?.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Timer className="size-3" /> {wait === null ? "–" : wait}분 대기 · {club.stats[q.id]?.games ?? 0}경기
                      {p ? ` · ${LEVEL_LABEL[p.level]}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => dequeue(q.id)}
                    disabled={q.id !== meMemberId && !canManageQueue}
                    className="h-9 rounded-full bg-secondary px-3 text-xs font-bold text-secondary-foreground disabled:opacity-40"
                  >
                    휴식
                  </button>
                </li>
              );
            })}
          {club.queue.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              대기 중인 인원이 없어요. 오늘 화면에서 체크인해 주세요.
            </li>
          ) : null}
        </ul>
        {benched.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-bold text-muted-foreground">휴식 중 {benched.length}명</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {benched.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => enqueue(b.id)}
                    disabled={b.id !== meMemberId && !canManageQueue}
                    className="rounded-full border border-border bg-card shadow-soft px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    {b.name} 복귀
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {can("VIEW_SMART_COURT") ? <SmartCourt /> : null}
      <Scoreboard match={openMatch} onClose={() => setOpenMatchId(null)} />
    </>
  );
}

const MODES = [
  {
    title: "수동 점수판",
    badge: "사용 가능",
    now: true,
    desc: "화면을 탭해 득점, 되돌리기, 21/15/11점 듀스 규칙까지 지금 바로 사용할 수 있어요.",
  },
  {
    title: "제스처 인식",
    badge: "개발 예정",
    now: false,
    desc: "랠리가 끝난 뒤 이긴 쪽이 손을 들면 카메라가 이를 인식해 득점을 올립니다. 아직 동작하지 않습니다.",
  },
  {
    title: "AI 보조 판정",
    badge: "개발 예정",
    now: false,
    desc: "AI가 랠리 종료 시점을 감지하고, 어느 쪽 득점인지 사용자가 확인만 하면 됩니다. 아직 동작하지 않습니다.",
  },
  {
    title: "완전 자동 AI",
    badge: "향후 계획",
    now: false,
    desc: "코트·선수·셔틀콕을 분석해 자동으로 점수를 기록하는 장기 목표입니다. 아직 동작하지 않습니다.",
  },
];

function SmartCourt() {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <Camera className="size-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">스마트 코트</h2>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        현재는 수동 입력만 동작합니다. 모든 득점은 ScoreEvent(source: MANUAL / GESTURE / AI, 시각,
        신뢰도, 확인·수정 여부)로 저장되어 향후 카메라 연동 시 같은 채점 엔진을 그대로 사용합니다.
      </p>
      <ul className="mt-3 space-y-2">
        {MODES.map((m) => (
          <li
            key={m.title}
            className={`rounded-2xl border p-4 ${
              m.now ? "border-primary bg-accent" : "border-border bg-card opacity-90"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">{m.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  m.now
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.badge}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{m.desc}</p>
            {!m.now ? (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                <Sparkles className="size-3" /> 비활성화 상태
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
