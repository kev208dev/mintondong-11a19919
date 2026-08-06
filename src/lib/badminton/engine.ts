import type { ClubState, Match, ScoreEvent, ScoreSource } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function capForTarget(target: number) {
  if (target >= 21) return target + 9;
  if (target >= 15) return target + 6;
  return target + 4;
}

/** 배드민턴 듀스 규칙: target-1 동점이면 2점 차, 캡 도달 시 즉시 승리 */
export function evaluateWinner(
  scoreA: number,
  scoreB: number,
  target: number,
): "A" | "B" | null {
  const cap = capForTarget(target);
  const hi = Math.max(scoreA, scoreB);
  const lo = Math.min(scoreA, scoreB);
  const leader = scoreA > scoreB ? "A" : "B";
  if (scoreA === scoreB) return null;
  if (hi >= cap) return leader;
  if (hi >= target && hi - lo >= 2) return leader;
  return null;
}

export function makeScoreEvent(
  matchId: string,
  side: "A" | "B",
  source: ScoreSource = "MANUAL",
): ScoreEvent {
  return {
    id: uid(),
    matchId,
    side,
    source,
    timestamp: Date.now(),
    confidence: source === "MANUAL" ? null : 0,
    confirmed: source === "MANUAL",
    corrected: false,
  };
}

export function applyPoint(match: Match, side: "A" | "B", source: ScoreSource = "MANUAL"): Match {
  if (match.status === "DONE") return match;
  const event = makeScoreEvent(match.id, side, source);
  const scoreA = match.scoreA + (side === "A" ? 1 : 0);
  const scoreB = match.scoreB + (side === "B" ? 1 : 0);
  const winner = evaluateWinner(scoreA, scoreB, match.target);
  return { ...match, scoreA, scoreB, events: [...match.events, event], winner };
}

export function undoPoint(match: Match): Match {
  if (!match.events.length || match.status === "DONE") return match;
  const events = match.events.slice(0, -1);
  const last = match.events[match.events.length - 1]!;
  const scoreA = match.scoreA - (last.side === "A" ? 1 : 0);
  const scoreB = match.scoreB - (last.side === "B" ? 1 : 0);
  return {
    ...match,
    events,
    scoreA,
    scoreB,
    winner: evaluateWinner(scoreA, scoreB, match.target),
  };
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

/** 과거에 같은 팀이었던 횟수 */
function partnerCount(state: ClubState, a: string, b: string) {
  let n = 0;
  for (const m of state.matches) {
    for (const team of [m.teamA, m.teamB]) {
      if (team.includes(a) && team.includes(b)) n += 1;
    }
  }
  return n;
}

export function playerLevel(state: ClubState, id: string) {
  const p = [...state.members, ...state.guests].find((m) => m.id === id);
  return p?.level ?? 3;
}

export function playerName(state: ClubState, id: string) {
  const p = [...state.members, ...state.guests].find((m) => m.id === id);
  return p?.name ?? "알 수 없음";
}

export interface Assignment {
  teamA: string[];
  teamB: string[];
}

/**
 * 공정 배정: 경기수 적은 사람 → 오래 기다린 사람 우선으로 4명을 뽑고,
 * 실력 균형이 좋고 최근 파트너 중복이 적은 조합으로 팀을 나눈다.
 */
export function autoAssign(state: ClubState): Assignment | null {
  const queue = [...state.queue].sort((x, y) => {
    const gx = state.stats[x.id]?.games ?? 0;
    const gy = state.stats[y.id]?.games ?? 0;
    if (gx !== gy) return gx - gy;
    return x.since - y.since;
  });
  if (queue.length < 4) return null;

  const pool = queue.slice(0, Math.min(6, queue.length)).map((q) => q.id);
  const four = queue.slice(0, 4).map((q) => q.id);

  // 후보 풀에서 4명 조합을 모두 검토 (우선순위 상위 4명은 반드시 포함되도록 가중)
  let best: { score: number; assignment: Assignment } | null = null;
  const combos: string[][] = [];
  for (let a = 0; a < pool.length; a++)
    for (let b = a + 1; b < pool.length; b++)
      for (let c = b + 1; c < pool.length; c++)
        for (let d = c + 1; d < pool.length; d++) combos.push([pool[a]!, pool[b]!, pool[c]!, pool[d]!]);

  for (const combo of combos) {
    const priorityPenalty = four.filter((id) => !combo.includes(id)).length * 6;
    const splits: Assignment[] = [
      { teamA: [combo[0]!, combo[1]!], teamB: [combo[2]!, combo[3]!] },
      { teamA: [combo[0]!, combo[2]!], teamB: [combo[1]!, combo[3]!] },
      { teamA: [combo[0]!, combo[3]!], teamB: [combo[1]!, combo[2]!] },
    ];
    for (const s of splits) {
      const sumA = s.teamA.reduce((t, id) => t + playerLevel(state, id), 0);
      const sumB = s.teamB.reduce((t, id) => t + playerLevel(state, id), 0);
      const balance = Math.abs(sumA - sumB) * 2;
      const repeat =
        partnerCount(state, s.teamA[0]!, s.teamA[1]!) + partnerCount(state, s.teamB[0]!, s.teamB[1]!);
      const score = priorityPenalty + balance + repeat * 3;
      if (!best || score < best.score) best = { score, assignment: s };
    }
  }
  return best?.assignment ?? { teamA: [four[0]!, four[1]!], teamB: [four[2]!, four[3]!] };
}

export { pairKey };
