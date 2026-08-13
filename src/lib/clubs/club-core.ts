export type ClubCreateFields = { name: string; region: string };

export function validateCreateClubInput(input: ClubCreateFields): string | null {
  if (!input.name.trim()) return "동호회 이름을 입력해 주세요.";
  if (!input.region.trim()) return "지역을 입력해 주세요.";
  return null;
}

export function clubMutationErrorMessage(action: "create" | "join", error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  if (/authentication required|jwt|session|not authenticated/i.test(message)) {
    return "로그인 정보가 만료됐어요. 다시 로그인해 주세요.";
  }
  if (/club name is required/i.test(message)) return "동호회 이름을 입력해 주세요.";
  if (/location|region/i.test(message)) return "지역을 입력해 주세요.";
  if (/duplicate|unique|already/i.test(message)) {
    return action === "join"
      ? "이미 가입했거나 승인 대기 중인 동호회예요."
      : "이미 사용 중인 동호회 정보예요.";
  }
  if (/permission|row-level security|not allowed|denied/i.test(message)) {
    return "이 작업을 수행할 권한이 없어요. 로그인 상태를 확인해 주세요.";
  }
  return action === "join"
    ? "가입에 실패했어요. 잠시 후 다시 시도해 주세요."
    : "동호회 생성에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

export function isActiveMembership(status: string | null | undefined): boolean {
  return status === "active";
}
