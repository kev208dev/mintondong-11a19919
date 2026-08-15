export type TournamentStatus = "UPCOMING" | "REGISTERING" | "CLOSED" | "ONGOING" | "FINISHED";

export type TournamentScope = "NATIONAL" | "LOCAL";

export type TournamentSource = "FACECOCK" | "COURTX" | "BKPLAY" | "KOC" | "MANUAL";

export type TournamentSourceLink = {
  source: TournamentSource;
  sourceUrl: string | null;
  registrationUrl: string | null;
  bracketUrl: string | null;
  resultUrl: string | null;
};

export type Tournament = {
  id: string;
  title: string;
  normalizedTitle: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  region: string | null;
  city: string | null;
  venue: string | null;
  venueAddress: string | null;
  scope: TournamentScope;
  status: TournamentStatus;
  organizer: string | null;
  host: string | null;
  entryFeeWon: number | null;
  posterUrl: string | null;
  description: string | null;
  registrationUrl: string | null;
  bracketUrl: string | null;
  resultUrl: string | null;
  sources: TournamentSourceLink[];
  isFavorite: boolean;
  lastSyncedAt: string | null;
};

export type TournamentFilters = {
  query?: string;
  status?: "ALL" | "REGISTERING" | "UPCOMING" | "ONGOING" | "FINISHED";
  region?: string;
  limit?: number;
};

/** Source adapter가 반환하는 정규화 전 공통 계약. UI에는 직접 노출하지 않는다. */
export type CollectedTournament = {
  source: TournamentSource;
  externalId: string;
  sourceUrl: string;
  title: string;
  startDate: string;
  endDate: string;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  region?: string | null;
  city?: string | null;
  venue?: string | null;
  venueAddress?: string | null;
  scope?: TournamentScope;
  organizer?: string | null;
  host?: string | null;
  entryFeeWon?: number | null;
  posterUrl?: string | null;
  description?: string | null;
  registrationUrl?: string | null;
  bracketUrl?: string | null;
  resultUrl?: string | null;
  rawData?: Record<string, unknown>;
};

export type SourceCollection = {
  items: CollectedTournament[];
  pageCount: number;
};

export type NormalizedTournament = Omit<CollectedTournament, "title" | "endDate"> & {
  title: string;
  normalizedTitle: string;
  endDate: string;
  region: string | null;
  city: string | null;
  venue: string | null;
  venueAddress: string | null;
  scope: TournamentScope;
  organizer: string | null;
  host: string | null;
  entryFeeWon: number | null;
  posterUrl: string | null;
  description: string | null;
  registrationUrl: string | null;
  bracketUrl: string | null;
  resultUrl: string | null;
};
