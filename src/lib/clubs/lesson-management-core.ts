export const LESSON_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type LessonSaleInput = {
  name: string;
  intro: string;
  specialties: string[];
  levelLabel: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
  durationMin: number;
  priceWon: number;
  isActive: boolean;
};

export type LessonValidation =
  { ok: true; value: LessonSaleInput } | { ok: false; errors: string[] };

export function canManageLessons(
  role: "owner" | "admin" | "member" | null,
  status: "active" | "pending" | null,
) {
  return status === "active" && (role === "owner" || role === "admin");
}

export function validateLessonSale(input: LessonSaleInput): LessonValidation {
  const value: LessonSaleInput = {
    ...input,
    name: input.name.trim(),
    intro: input.intro.trim(),
    levelLabel: input.levelLabel.trim(),
    specialties: [...new Set(input.specialties.map((item) => item.trim()).filter(Boolean))],
    weekdays: [...new Set(input.weekdays)].sort((a, b) => a - b),
  };
  const errors: string[] = [];
  if (!value.name) errors.push("코치명을 입력해 주세요.");
  if (!Number.isInteger(value.priceWon) || value.priceWon <= 0) {
    errors.push("1회 가격은 0보다 큰 원 단위 정수여야 합니다.");
  }
  if (!Number.isInteger(value.durationMin) || value.durationMin <= 0) {
    errors.push("1회 수업 시간은 0보다 큰 분 단위 정수여야 합니다.");
  }
  if (
    !Number.isInteger(value.startHour) ||
    !Number.isInteger(value.endHour) ||
    value.startHour < 0 ||
    value.endHour > 24 ||
    value.startHour >= value.endHour
  ) {
    errors.push("운영 시작 시간은 종료 시간보다 빨라야 합니다.");
  }
  if (
    !value.weekdays.length ||
    value.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    errors.push("레슨 요일을 하나 이상 선택해 주세요.");
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}
