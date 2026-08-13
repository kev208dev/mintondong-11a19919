import type { TournamentStatus } from "./types";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function koreaDateOnly(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function validDate(value: string | null | undefined): value is string {
  return typeof value === "string" && DATE_ONLY.test(value);
}

export function calculateTournamentStatus(input: {
  today?: string;
  startDate: string;
  endDate: string;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
}): TournamentStatus {
  const today = validDate(input.today) ? input.today : koreaDateOnly();
  const endDate = validDate(input.endDate) ? input.endDate : input.startDate;

  if (today > endDate) return "FINISHED";
  if (today >= input.startDate && today <= endDate) return "ONGOING";

  if (
    validDate(input.registrationStartDate) &&
    validDate(input.registrationEndDate) &&
    today >= input.registrationStartDate &&
    today <= input.registrationEndDate
  ) {
    return "REGISTERING";
  }

  if (validDate(input.registrationEndDate) && today > input.registrationEndDate) {
    return "CLOSED";
  }
  return "UPCOMING";
}

export function tournamentSortValue(status: TournamentStatus): number {
  return { REGISTERING: 0, UPCOMING: 1, ONGOING: 2, CLOSED: 3, FINISHED: 4 }[status];
}
