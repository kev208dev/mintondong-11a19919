export function htmlText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseKoreanDate(value: string): string | null {
  const match = value.match(/(20\d{2})\s*[.\-/\ub144]\s*(\d{1,2})\s*[.\-/\uc6d4]\s*(\d{1,2})/);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

export function parseDateRange(value: string): { startDate: string; endDate: string } | null {
  const dates = [
    ...value.matchAll(/(20\d{2})\s*[.\-/\ub144]\s*(\d{1,2})\s*[.\-/\uc6d4]\s*(\d{1,2})/g),
  ].map((match) => `${match[1]}-${match[2]?.padStart(2, "0")}-${match[3]?.padStart(2, "0")}`);
  if (dates.length >= 2) return { startDate: dates[0]!, endDate: dates[1]! };

  // Facecock의 "2026년 8월 15일~16일"처럼 종료일에 연/월이 생략된 형식.
  const compact = value.match(
    /(20\d{2})\s*\ub144\s*(\d{1,2})\s*\uc6d4\s*(\d{1,2})\s*\uc77c?\s*[~-]\s*(?!20\d{2}\s*\ub144)(\d{1,2})\s*\uc77c?/,
  );
  if (compact?.[1] && compact[2] && compact[3] && compact[4]) {
    const prefix = `${compact[1]}-${compact[2].padStart(2, "0")}-`;
    return {
      startDate: `${prefix}${compact[3].padStart(2, "0")}`,
      endDate: `${prefix}${compact[4].padStart(2, "0")}`,
    };
  }

  return dates[0] ? { startDate: dates[0], endDate: dates[1] ?? dates[0] } : null;
}
