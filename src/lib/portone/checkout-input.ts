const KOREAN_MOBILE_DIGITS = /^010\d{8}$/;

export function formatKoreanMobilePhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 브라우저와 서버 모두 앱이 만든 정규화된 완성형 휴대전화 번호만 허용한다. */
export function isCompleteKoreanMobilePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return KOREAN_MOBILE_DIGITS.test(digits) && formatKoreanMobilePhone(value) === value;
}
