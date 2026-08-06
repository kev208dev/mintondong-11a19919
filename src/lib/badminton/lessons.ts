import type { Coach, LessonBooking } from "./types";

/** 데모용: 오늘부터 n일간의 날짜 목록 */
export function nextDays(n: number, from = new Date()): Date[] {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function formatDay(d: Date) {
  const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatRange(startAt: number, endAt: number) {
  return `${formatTime(startAt)} – ${formatTime(endAt)}`;
}

export function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 코치의 요일/시간대 설정을 기준으로 해당 날짜의 시작시각 목록을 만든다. */
export function slotsFor(coach: Coach, date: Date): number[] {
  if (!coach.weekdays.includes(date.getDay())) return [];
  const out: number[] = [];
  for (let h = coach.startHour; h + 1 <= coach.endHour; h += 1) {
    out.push(new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0, 0).getTime());
  }
  return out;
}

/** 같은 클럽·같은 코치·같은 시각은 중복 예약 불가 (취소된 예약은 슬롯을 해제) */
export function isSlotTaken(bookings: LessonBooking[], coachId: string, startAt: number) {
  return bookings.some(
    (b) => b.coachId === coachId && b.startAt === startAt && b.status === "BOOKED",
  );
}

export function isPast(startAt: number) {
  return startAt < Date.now();
}
