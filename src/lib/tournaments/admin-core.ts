import { z } from "zod";
import type { TournamentSource, TournamentStatus } from "./types";

export type AppRole = "USER" | "ADMIN";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDateOnly(value: string) {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month! - 1 &&
    parsed.getUTCDate() === day
  );
}

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label}을(를) 입력해 주세요.`).max(max, `${label}이(가) 너무 깁니다.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "입력값이 너무 깁니다.")
    .transform((value) => value || null);

const requiredDate = z.string().refine(isRealDateOnly, "날짜를 YYYY-MM-DD 형식으로 입력해 주세요.");

const optionalDate = z
  .string()
  .refine((value) => !value || isRealDateOnly(value), "날짜를 YYYY-MM-DD 형식으로 입력해 주세요.")
  .transform((value) => value || null);

const optionalHttpUrl = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, "http 또는 https URL을 입력해 주세요.")
  .transform((value) => value || null);

export const manualTournamentSchema = z
  .object({
    title: requiredText("대회명", 200),
    startDate: requiredDate,
    endDate: requiredDate,
    registrationStartDate: optionalDate,
    registrationEndDate: optionalDate,
    region: requiredText("지역", 50),
    city: requiredText("도시", 80),
    venue: requiredText("경기장", 200),
    venueAddress: optionalText(300),
    scope: z.enum(["NATIONAL", "LOCAL"], { message: "대회 구분을 선택해 주세요." }),
    organizer: optionalText(200),
    host: optionalText(200),
    entryFeeWon: z
      .number({ message: "참가비는 숫자로 입력해 주세요." })
      .int("참가비는 원 단위 정수로 입력해 주세요.")
      .min(0, "참가비는 0원 이상이어야 합니다.")
      .max(100_000_000, "참가비가 너무 큽니다.")
      .nullable(),
    posterUrl: optionalHttpUrl,
    description: optionalText(5_000),
    registrationUrl: optionalHttpUrl,
    sourceUrl: optionalHttpUrl,
    bracketUrl: optionalHttpUrl,
    resultUrl: optionalHttpUrl,
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "대회 종료일은 시작일보다 빠를 수 없습니다.",
      });
    }
    if (
      value.registrationStartDate &&
      value.registrationEndDate &&
      value.registrationEndDate < value.registrationStartDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["registrationEndDate"],
        message: "접수 종료일은 접수 시작일보다 빠를 수 없습니다.",
      });
    }
  });

export type ManualTournamentInput = z.infer<typeof manualTournamentSchema>;

export type AdminTournament = ManualTournamentInput & {
  id: string;
  isActive: boolean;
  status: TournamentStatus;
  source: TournamentSource;
  updatedAt: string;
};

export type ManualTournamentFieldErrors = Partial<Record<keyof ManualTournamentInput, string>>;

export function validateManualTournamentInput(
  value: unknown,
):
  | { ok: true; value: ManualTournamentInput; errors: ManualTournamentFieldErrors }
  | { ok: false; errors: ManualTournamentFieldErrors } {
  const checked = manualTournamentSchema.safeParse(value);
  if (checked.success) return { ok: true, value: checked.data, errors: {} };
  const errors: ManualTournamentFieldErrors = {};
  for (const issue of checked.error.issues) {
    const field = issue.path[0] as keyof ManualTournamentInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

export function parseManualTournamentInput(value: unknown): ManualTournamentInput {
  return manualTournamentSchema.parse(value);
}

export class TournamentAdminAuthorizationError extends Error {
  readonly code = "TOURNAMENT_ADMIN_FORBIDDEN";
  readonly statusCode = 403;

  constructor() {
    super("관리자 권한이 필요합니다.");
    this.name = "TournamentAdminAuthorizationError";
  }
}

export function assertTournamentAdmin(role: unknown): asserts role is "ADMIN" {
  if (role !== "ADMIN") throw new TournamentAdminAuthorizationError();
}

export async function withTournamentAdmin<T>(input: {
  loadRole: () => Promise<unknown>;
  action: () => Promise<T>;
}): Promise<T> {
  const role = await input.loadRole();
  assertTournamentAdmin(role);
  return input.action();
}
