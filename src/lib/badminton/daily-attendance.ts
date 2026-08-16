const SEOUL_TIME_ZONE = "Asia/Seoul";

export function formatDailyAttendanceDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

export function formatDailyAttendanceCompactDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function shiftDailyAttendanceDate(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day!, 12));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
