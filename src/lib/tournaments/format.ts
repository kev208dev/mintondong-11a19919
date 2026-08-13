import { koreaDateOnly } from "./status.ts";
import type { TournamentStatus } from "./types";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  UPCOMING: "예정",
  REGISTERING: "접수중",
  CLOSED: "접수마감",
  ONGOING: "진행중",
  FINISHED: "종료",
};

export function tournamentStatusLabel(status: TournamentStatus) {
  return STATUS_LABELS[status];
}

function parts(date: string) {
  const [year = "", month = "", day = ""] = date.split("-");
  return { year, month, day };
}

export function formatKoreanDate(date: string) {
  const { year, month, day } = parts(date);
  return `${year}. ${month}. ${day}`;
}

export function formatTournamentPeriod(startDate: string, endDate: string) {
  const start = parts(startDate);
  const end = parts(endDate);
  if (startDate === endDate) return `${start.month}.${start.day}`;
  if (start.year === end.year) return `${start.month}.${start.day} ~ ${end.month}.${end.day}`;
  return `${start.year}.${start.month}.${start.day} ~ ${end.year}.${end.month}.${end.day}`;
}

export function registrationDeadlineLabel(endDate: string | null, now = new Date()) {
  if (!endDate) return null;
  const today = koreaDateOnly(now);
  if (endDate < today) return "접수마감";
  const toUtcDay = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year!, month! - 1, day!);
  };
  const days = Math.round((toUtcDay(endDate) - toUtcDay(today)) / 86_400_000);
  return days === 0 ? "접수마감 D-Day" : `접수마감 D-${days}`;
}

export function formatWon(value: number | null) {
  return value == null ? "정보 없음" : `${value.toLocaleString("ko-KR")}원`;
}
