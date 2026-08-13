import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateTournamentStatus, tournamentSortValue } from "./status";
import type {
  Tournament,
  TournamentFilters,
  TournamentScope,
  TournamentSource,
  TournamentSourceLink,
} from "./types";

const TOURNAMENT_COLUMNS =
  "id, title, normalized_title, start_date, end_date, registration_start_date, registration_end_date, region, city, venue, venue_address, scope, organizer, host, entry_fee, poster_url, description, registration_url, bracket_url, result_url, last_synced_at";

function rowToTournament(
  row: Record<string, unknown>,
  sources: TournamentSourceLink[] = [],
): Tournament {
  const startDate = String(row["start_date"]);
  const endDate = String(row["end_date"]);
  const registrationStartDate = (row["registration_start_date"] as string | null) ?? null;
  const registrationEndDate = (row["registration_end_date"] as string | null) ?? null;
  return {
    id: String(row["id"]),
    title: String(row["title"]),
    normalizedTitle: String(row["normalized_title"]),
    startDate,
    endDate,
    registrationStartDate,
    registrationEndDate,
    region: (row["region"] as string | null) ?? null,
    city: (row["city"] as string | null) ?? null,
    venue: (row["venue"] as string | null) ?? null,
    venueAddress: (row["venue_address"] as string | null) ?? null,
    scope: row["scope"] as TournamentScope,
    status: calculateTournamentStatus({
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
    }),
    organizer: (row["organizer"] as string | null) ?? null,
    host: (row["host"] as string | null) ?? null,
    entryFeeWon: row["entry_fee"] == null ? null : Number(row["entry_fee"]),
    posterUrl: (row["poster_url"] as string | null) ?? null,
    description: (row["description"] as string | null) ?? null,
    registrationUrl: (row["registration_url"] as string | null) ?? null,
    bracketUrl: (row["bracket_url"] as string | null) ?? null,
    resultUrl: (row["result_url"] as string | null) ?? null,
    sources,
    isFavorite: false,
    lastSyncedAt: (row["last_synced_at"] as string | null) ?? null,
  };
}

function matchesFilters(item: Tournament, filters: TournamentFilters): boolean {
  if (filters.region && filters.region !== "ALL" && item.region !== filters.region) return false;
  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "UPCOMING") {
      if (item.status !== "UPCOMING" && item.status !== "CLOSED") return false;
    } else if (item.status !== filters.status) return false;
  }
  const query = filters.query?.trim().toLocaleLowerCase("ko-KR");
  if (!query) return true;
  return [item.title, item.venue, item.city, item.region, item.organizer]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase("ko-KR").includes(query));
}

async function publicDb(): Promise<SupabaseClient> {
  const { adminClient } = await import("@/lib/auth/account.server");
  return adminClient() as unknown as SupabaseClient;
}

export const getTournaments = createServerFn({ method: "GET" })
  .validator((input: TournamentFilters) => input)
  .handler(async ({ data }): Promise<Tournament[]> => {
    const { clientKey, rateLimit } = await import("@/lib/auth/account.server");
    if (!rateLimit(clientKey(getRequest().headers, "tournaments"), 120, 60_000)) {
      throw new Error("too_many_requests");
    }
    const client = await publicDb();
    const result = await client
      .from("tournaments")
      .select(TOURNAMENT_COLUMNS)
      .eq("is_active", true)
      .order("start_date", { ascending: true })
      .limit(300);
    if (result.error) throw result.error;
    const limit = Math.min(Math.max(data.limit ?? 100, 1), 300);
    return ((result.data ?? []) as Record<string, unknown>[])
      .map((row) => rowToTournament(row))
      .filter((item) => matchesFilters(item, data))
      .sort(
        (left, right) =>
          tournamentSortValue(left.status) - tournamentSortValue(right.status) ||
          left.startDate.localeCompare(right.startDate),
      )
      .slice(0, limit);
  });

export const getTournament = createServerFn({ method: "GET" })
  .validator((input: { tournamentId: string }) => input)
  .handler(async ({ data }): Promise<Tournament | null> => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        data.tournamentId,
      )
    ) {
      return null;
    }
    const client = await publicDb();
    const [tournament, sourceResult] = await Promise.all([
      client
        .from("tournaments")
        .select(TOURNAMENT_COLUMNS)
        .eq("id", data.tournamentId)
        .eq("is_active", true)
        .maybeSingle(),
      client
        .from("tournament_sources")
        .select("source, source_url, registration_url, bracket_url, result_url")
        .eq("tournament_id", data.tournamentId),
    ]);
    if (tournament.error) throw tournament.error;
    if (sourceResult.error) throw sourceResult.error;
    if (!tournament.data) return null;
    const sources = ((sourceResult.data ?? []) as Record<string, unknown>[]).map(
      (row): TournamentSourceLink => ({
        source: row["source"] as TournamentSource,
        sourceUrl: (row["source_url"] as string | null) ?? null,
        registrationUrl: (row["registration_url"] as string | null) ?? null,
        bracketUrl: (row["bracket_url"] as string | null) ?? null,
        resultUrl: (row["result_url"] as string | null) ?? null,
      }),
    );
    return rowToTournament(tournament.data as Record<string, unknown>, sources);
  });
