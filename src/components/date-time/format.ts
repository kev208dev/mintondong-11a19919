const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
}

export function dateOnlyParts(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY.exec(value);
  if (!match || !isDateOnly(value)) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

export function dateOnlyFromDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatKoreanDate(value: string, now = new Date()): string {
  const parts = dateOnlyParts(value);
  if (!parts) return "날짜 선택";
  const date = new Date(parts.year, parts.month, parts.day);
  const prefix = parts.year === now.getFullYear() ? "" : `${parts.year}년 `;
  return `${prefix}${parts.month + 1}월 ${parts.day}일 ${["일", "월", "화", "수", "목", "금", "토"][date.getDay()]}요일`;
}

export function formatCompactKoreanDate(value: string): string {
  const parts = dateOnlyParts(value);
  if (!parts) return "날짜 선택";
  const date = new Date(parts.year, parts.month, parts.day);
  return `${parts.month + 1}.${parts.day} ${["일", "월", "화", "수", "목", "금", "토"][date.getDay()]}`;
}

export function formatKoreanTime(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return "시간 선택";
  return `${match[1]}:${match[2]}`;
}

export function combineLocalDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

export function localDateTimeToIso(value: string): string {
  if (!LOCAL_DATE_TIME.test(value)) throw new Error("INVALID_LOCAL_DATETIME");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_LOCAL_DATETIME");
  return date.toISOString();
}

export function localDateTimeParts(value: string) {
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match) return null;
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` };
}
