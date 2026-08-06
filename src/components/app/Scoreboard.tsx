import { RotateCcw, X } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { playerName } from "@/lib/badminton/engine";
import { useStore } from "@/lib/badminton/store";
import type { Match } from "@/lib/badminton/types";

export function Scoreboard({
  match,
  onClose,
}: {
  match: Match | null;
  onClose: () => void;
}) {
  const { club, addPoint, undo, finishMatch, cancelMatch, can } = useStore();
  const canScore = can("EDIT_SCORES");
  const canFinish = can("FINISH_MATCHES");
  const canCancel = can("CREATE_MATCHES");
  if (!match) return null;

  const names = (ids: string[]) => ids.map((id) => playerName(club, id)).join(" · ");
  const done = match.winner !== null;
  const deuce = match.scoreA >= match.target - 1 && match.scoreB >= match.target - 1;

  return (
    <Drawer open={!!match} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-sm font-bold text-foreground">
            {match.courtIndex + 1}번 코트 · {match.target}점
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-9 rounded-full font-bold"
              onClick={() => undo(match.id)}
              disabled={!match.events.length || !canScore}
            >
              <RotateCcw className="mr-1 size-4" /> 되돌리기
            </Button>
            <button onClick={onClose} aria-label="닫기" className="p-2 text-muted-foreground">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {deuce && !done ? (
          <p className="px-4 pt-2 text-xs font-bold text-primary">
            듀스 · 2점 차로 앞서야 승리 (최대 {match.target >= 21 ? match.target + 9 : match.target + 6}점)
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 p-4">
          {(["A", "B"] as const).map((side) => {
            const score = side === "A" ? match.scoreA : match.scoreB;
            const team = side === "A" ? match.teamA : match.teamB;
            return (
              <button
                key={side}
                onClick={() => addPoint(match.id, side, "MANUAL")}
                disabled={done || !canScore}
                className={`flex h-56 flex-col items-center justify-center rounded-3xl transition-transform active:scale-[0.98] disabled:opacity-60 ${
                  side === "A"
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground text-background"
                }`}
              >
                <span className="text-xs font-bold opacity-70">
                  {side === "A" ? "A팀" : "B팀"}
                </span>
                <span className="text-7xl font-extrabold tabular-nums">{score}</span>
                <span className="mt-1 px-3 text-center text-[11px] font-semibold opacity-80">
                  {names(team)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 px-4 pb-6">
          {done ? (
            <p className="text-center text-sm font-extrabold text-primary">
              {match.winner === "A" ? "A팀" : "B팀"} 승리! ({match.scoreA} : {match.scoreB})
            </p>
          ) : null}
          {canFinish ? (
            <Button
              className="h-14 w-full rounded-2xl text-base font-extrabold"
              onClick={() => {
                finishMatch(match.id);
                onClose();
              }}
            >
              결과 저장하고 대기열 복귀
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="ghost"
              className="h-11 w-full rounded-2xl text-sm font-bold text-muted-foreground"
              onClick={() => {
                cancelMatch(match.id);
                onClose();
              }}
            >
              경기 취소
            </Button>
          ) : null}
          {!canScore ? (
            <p className="rounded-2xl bg-secondary p-3 text-center text-[11px] text-secondary-foreground">
              점수 입력 권한이 없어 관전 모드로 표시돼요.
            </p>
          ) : null}
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            모든 득점은 ScoreEvent(source: MANUAL)로 기록됩니다 · {match.events.length}건
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
