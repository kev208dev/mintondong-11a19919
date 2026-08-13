export function formatKoreanMobilePhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  // 010은 현재 표준 11자리(3-4-4) 형식을 유지한다.
  // 기존 01x 10자리 번호는 서버의 기존 3-3-4 검증과 호환한다.
  if (digits.length === 10 && !digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 브라우저와 서버 모두 앱이 만든 정규화된 완성형 휴대전화 번호만 허용한다. */
export function isValidKoreanMobilePhone(value: string): boolean {
  return /^01[016789]-\d{3,4}-\d{4}$/.test(value);
}
