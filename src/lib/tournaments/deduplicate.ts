import type { NormalizedTournament } from "./types";

function normalizedLocation(item: Pick<NormalizedTournament, "region" | "city">): string {
  return [item.region, item.city]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("ko-KR");
}

/** 제목·시작일·지역이 모두 정확히 일치할 때만 합치는 보수적인 고신뢰 매칭. */
export function isHighConfidenceDuplicate(
  left: Pick<NormalizedTournament, "normalizedTitle" | "startDate" | "region" | "city">,
  right: Pick<NormalizedTournament, "normalizedTitle" | "startDate" | "region" | "city">,
): boolean {
  const leftLocation = normalizedLocation(left);
  const rightLocation = normalizedLocation(right);
  return (
    left.normalizedTitle === right.normalizedTitle &&
    left.startDate === right.startDate &&
    leftLocation.length > 0 &&
    leftLocation === rightLocation
  );
}

export function deduplicateCollected(items: NormalizedTournament[]): NormalizedTournament[][] {
  const groups: NormalizedTournament[][] = [];
  for (const item of items) {
    const found = groups.find((group) => {
      const first = group[0];
      return first ? isHighConfidenceDuplicate(first, item) : false;
    });
    if (found) found.push(item);
    else groups.push([item]);
  }
  return groups;
}
