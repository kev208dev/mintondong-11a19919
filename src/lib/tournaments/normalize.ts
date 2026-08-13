import type { CollectedTournament, NormalizedTournament, TournamentScope } from "./types";

const REGION_NAMES = [
  "서울",
  "경기",
  "인천",
  "강원",
  "충북",
  "충남",
  "대전",
  "세종",
  "전북",
  "전남",
  "광주",
  "경북",
  "경남",
  "대구",
  "부산",
  "울산",
  "제주",
] as const;

export function normalizeTournamentTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[[\]{}<>《》「」『』“”‘’"'`~!@#$%^&*_=+|\\/:;,.?·ㆍ—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRegion(value?: string | null): string | null {
  if (!value) return null;
  const compact = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  const match = REGION_NAMES.find((region) => compact.startsWith(region));
  return match ?? compact.split(" ")[0] ?? null;
}

function clean(value?: string | null): string | null {
  const text = value?.normalize("NFKC").replace(/\s+/g, " ").trim();
  return text || null;
}

function safeHttpUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function inferScope(title: string, scope?: TournamentScope): TournamentScope {
  if (scope) return scope;
  return /(전국|오픈|open)/i.test(title) ? "NATIONAL" : "LOCAL";
}

export function normalizeCollectedTournament(input: CollectedTournament): NormalizedTournament {
  const title = clean(input.title) ?? "";
  return {
    ...input,
    externalId: input.externalId.trim(),
    title,
    normalizedTitle: normalizeTournamentTitle(title),
    endDate: input.endDate || input.startDate,
    region: normalizeRegion(input.region),
    city: clean(input.city),
    venue: clean(input.venue),
    venueAddress: clean(input.venueAddress),
    scope: inferScope(title, input.scope),
    organizer: clean(input.organizer),
    host: clean(input.host),
    entryFeeWon:
      Number.isInteger(input.entryFeeWon) && Number(input.entryFeeWon) >= 0
        ? Number(input.entryFeeWon)
        : null,
    posterUrl: safeHttpUrl(input.posterUrl),
    description: clean(input.description),
    sourceUrl: safeHttpUrl(input.sourceUrl) ?? "",
    registrationUrl: safeHttpUrl(input.registrationUrl),
    bracketUrl: safeHttpUrl(input.bracketUrl),
    resultUrl: safeHttpUrl(input.resultUrl),
  };
}

export function validCollectedTournament(value: NormalizedTournament): boolean {
  return (
    value.title.length >= 2 &&
    value.normalizedTitle.length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.endDate) &&
    value.startDate <= value.endDate &&
    value.externalId.length > 0 &&
    value.sourceUrl.length > 0
  );
}
