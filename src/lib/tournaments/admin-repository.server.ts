import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/auth/account.server";
import { normalizeTournamentTitle } from "./normalize";
import { calculateTournamentStatus } from "./status";
import {
  parseManualTournamentInput,
  withTournamentAdmin,
  type AdminTournament,
  type ManualTournamentInput,
} from "./admin-core";
import type { TournamentSource } from "./types";

const ADMIN_TOURNAMENT_COLUMNS =
  "id, title, start_date, end_date, registration_start_date, registration_end_date, region, city, venue, venue_address, scope, organizer, host, entry_fee, poster_url, description, registration_url, bracket_url, result_url, is_active, updated_at";

function db(): SupabaseClient {
  return adminClient() as unknown as SupabaseClient;
}

async function profileRole(client: SupabaseClient, userId: string) {
  const result = await client.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (result.error) throw result.error;
  return (result.data as Record<string, unknown> | null)?.["role"];
}

async function runAdminAction<T>(
  userId: string,
  action: (client: SupabaseClient) => Promise<T>,
): Promise<T> {
  const client = db();
  return withTournamentAdmin({
    loadRole: () => profileRole(client, userId),
    action: () => action(client),
  });
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function rowToAdminTournament(
  row: Record<string, unknown>,
  source: TournamentSource,
  sourceUrl: string | null,
): AdminTournament {
  const startDate = String(row["start_date"]);
  const endDate = String(row["end_date"]);
  const registrationStartDate = nullableString(row["registration_start_date"]);
  const registrationEndDate = nullableString(row["registration_end_date"]);
  return {
    id: String(row["id"]),
    title: String(row["title"] ?? ""),
    startDate,
    endDate,
    registrationStartDate,
    registrationEndDate,
    region: String(row["region"] ?? ""),
    city: String(row["city"] ?? ""),
    venue: String(row["venue"] ?? ""),
    venueAddress: nullableString(row["venue_address"]),
    scope: row["scope"] === "NATIONAL" ? "NATIONAL" : "LOCAL",
    organizer: nullableString(row["organizer"]),
    host: nullableString(row["host"]),
    entryFeeWon: row["entry_fee"] == null ? null : Number(row["entry_fee"]),
    posterUrl: nullableString(row["poster_url"]),
    description: nullableString(row["description"]),
    registrationUrl: nullableString(row["registration_url"]),
    sourceUrl,
    bracketUrl: nullableString(row["bracket_url"]),
    resultUrl: nullableString(row["result_url"]),
    isActive: row["is_active"] === true,
    status: calculateTournamentStatus({
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
    }),
    source,
    updatedAt: String(row["updated_at"] ?? ""),
  };
}

function manualRpcPayload(input: ManualTournamentInput) {
  return {
    p_title: input.title,
    p_normalized_title: normalizeTournamentTitle(input.title),
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_registration_start_date: input.registrationStartDate,
    p_registration_end_date: input.registrationEndDate,
    p_region: input.region,
    p_city: input.city,
    p_venue: input.venue,
    p_venue_address: input.venueAddress,
    p_scope: input.scope,
    p_organizer: input.organizer,
    p_host: input.host,
    p_entry_fee: input.entryFeeWon,
    p_poster_url: input.posterUrl,
    p_description: input.description,
    p_registration_url: input.registrationUrl,
    p_source_url: input.sourceUrl,
    p_bracket_url: input.bracketUrl,
    p_result_url: input.resultUrl,
  };
}

export async function listAdminTournaments(userId: string): Promise<AdminTournament[]> {
  return runAdminAction(userId, async (client) => {
    const [tournaments, sources] = await Promise.all([
      client
        .from("tournaments")
        .select(ADMIN_TOURNAMENT_COLUMNS)
        .order("start_date", { ascending: false })
        .limit(500),
      client.from("tournament_sources").select("tournament_id, source, source_url").limit(1_000),
    ]);
    if (tournaments.error) throw tournaments.error;
    if (sources.error) throw sources.error;

    const sourceRows = (sources.data ?? []) as Record<string, unknown>[];
    return ((tournaments.data ?? []) as Record<string, unknown>[]).map((row) => {
      const tournamentId = String(row["id"]);
      const matches = sourceRows.filter((item) => item["tournament_id"] === tournamentId);
      const primary = matches.find((item) => item["source"] === "MANUAL") ?? matches[0];
      return rowToAdminTournament(
        row,
        (primary?.["source"] as TournamentSource | undefined) ?? "MANUAL",
        nullableString(primary?.["source_url"]),
      );
    });
  });
}

export async function createManualTournament(
  userId: string,
  untrustedInput: unknown,
): Promise<{ id: string }> {
  return runAdminAction(userId, async (client) => {
    const input = parseManualTournamentInput(untrustedInput);
    const result = await client.rpc("create_manual_tournament", manualRpcPayload(input));
    if (result.error) throw result.error;
    return { id: String(result.data) };
  });
}

export async function updateManualTournament(
  userId: string,
  tournamentId: string,
  untrustedInput: unknown,
): Promise<{ id: string }> {
  return runAdminAction(userId, async (client) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        tournamentId,
      )
    ) {
      throw new Error("INVALID_TOURNAMENT_ID");
    }
    const input = parseManualTournamentInput(untrustedInput);
    const result = await client.rpc("update_manual_tournament", {
      p_tournament_id: tournamentId,
      ...manualRpcPayload(input),
    });
    if (result.error) throw result.error;
    return { id: String(result.data) };
  });
}

export async function setManualTournamentActive(
  userId: string,
  tournamentId: string,
  isActive: boolean,
): Promise<{ id: string; isActive: boolean }> {
  return runAdminAction(userId, async (client) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        tournamentId,
      )
    ) {
      throw new Error("INVALID_TOURNAMENT_ID");
    }
    if (typeof isActive !== "boolean") throw new Error("INVALID_ACTIVE_STATE");
    const result = await client.rpc("set_manual_tournament_active", {
      p_tournament_id: tournamentId,
      p_is_active: isActive,
    });
    if (result.error) throw result.error;
    return { id: String(result.data), isActive };
  });
}
