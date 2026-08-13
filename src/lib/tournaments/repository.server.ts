import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/auth/account.server";
import { deduplicateCollected, isHighConfidenceDuplicate } from "./deduplicate";
import { normalizeCollectedTournament, validCollectedTournament } from "./normalize";
import { syncCourtxSource } from "./sources/courtx.server";
import { syncFacecockSource } from "./sources/facecock.server";
import { SourceDisabledError } from "./sources/source-utils.server";
import type { CollectedTournament, NormalizedTournament, TournamentSource } from "./types";

type SourceSyncResult = {
  success: boolean;
  fetched: number;
  imported: number;
  error?: string;
};

export type TournamentSyncResult = {
  facecock: SourceSyncResult;
  courtx: SourceSyncResult;
};

const db = () => adminClient() as unknown as SupabaseClient;

function canonicalPayload(item: NormalizedTournament) {
  return {
    title: item.title,
    normalized_title: item.normalizedTitle,
    start_date: item.startDate,
    end_date: item.endDate,
    registration_start_date: item.registrationStartDate ?? null,
    registration_end_date: item.registrationEndDate ?? null,
    region: item.region,
    city: item.city,
    venue: item.venue,
    venue_address: item.venueAddress,
    scope: item.scope,
    organizer: item.organizer,
    host: item.host,
    entry_fee: item.entryFeeWon,
    poster_url: item.posterUrl,
    description: item.description,
    registration_url: item.registrationUrl,
    bracket_url: item.bracketUrl,
    result_url: item.resultUrl,
    last_synced_at: new Date().toISOString(),
  };
}

function canonicalUpdatePayload(item: NormalizedTournament) {
  // 새 source의 null 값이 먼저 수집된 source의 포스터/장소/접수 링크를 지우지 않게 한다.
  return Object.fromEntries(
    Object.entries(canonicalPayload(item)).filter(([, value]) => value !== null),
  );
}

function sourcePayload(item: NormalizedTournament, tournamentId: string) {
  return {
    tournament_id: tournamentId,
    source: item.source,
    external_id: item.externalId,
    source_url: item.sourceUrl,
    registration_url: item.registrationUrl,
    bracket_url: item.bracketUrl,
    result_url: item.resultUrl,
    raw_data: item.rawData ?? {},
    last_synced_at: new Date().toISOString(),
  };
}

async function existingTournamentId(client: SupabaseClient, item: NormalizedTournament) {
  const source = await client
    .from("tournament_sources")
    .select("tournament_id")
    .eq("source", item.source)
    .eq("external_id", item.externalId)
    .maybeSingle();
  if (source.error) throw source.error;
  if (source.data) return String(source.data["tournament_id"]);

  const candidates = await client
    .from("tournaments")
    .select("id, normalized_title, start_date, region, city")
    .eq("normalized_title", item.normalizedTitle)
    .eq("start_date", item.startDate)
    .limit(10);
  if (candidates.error) throw candidates.error;
  const match = ((candidates.data ?? []) as Record<string, unknown>[]).find((row) =>
    isHighConfidenceDuplicate(item, {
      normalizedTitle: String(row["normalized_title"]),
      startDate: String(row["start_date"]),
      region: (row["region"] as string | null) ?? null,
      city: (row["city"] as string | null) ?? null,
    }),
  );
  return match ? String(match["id"]) : null;
}

async function persistGroup(client: SupabaseClient, group: NormalizedTournament[]) {
  const primary = group[0];
  if (!primary) return 0;
  let tournamentId = await existingTournamentId(client, primary);
  if (!tournamentId) {
    const inserted = await client
      .from("tournaments")
      .insert(canonicalPayload(primary))
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    tournamentId = String(inserted.data["id"]);
  } else {
    const manual = await client
      .from("tournament_sources")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("source", "MANUAL")
      .maybeSingle();
    if (manual.error) throw manual.error;
    // 운영자가 직접 관리하는 canonical 값은 향후 외부 sync가 덮어쓰지 않는다.
    if (!manual.data) {
      const updated = await client
        .from("tournaments")
        .update(canonicalUpdatePayload(primary))
        .eq("id", tournamentId);
      if (updated.error) throw updated.error;
    }
  }

  for (const item of group) {
    const source = await client
      .from("tournament_sources")
      .upsert(sourcePayload(item, tournamentId), { onConflict: "source,external_id" });
    if (source.error) throw source.error;
  }
  return group.length;
}

async function recordRun(
  client: SupabaseClient,
  source: TournamentSource,
  startedAt: string,
  result: SourceSyncResult,
) {
  const { error } = await client.from("tournament_sync_runs").insert({
    source,
    success: result.success,
    fetched_count: result.fetched,
    imported_count: result.imported,
    error_code: result.error?.slice(0, 160) ?? null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });
  if (error) console.error(`[tournament-sync] failed to record ${source} run`, error.code);
}

async function runSource(
  source: TournamentSource,
  collect: () => Promise<CollectedTournament[]>,
): Promise<SourceSyncResult> {
  const startedAt = new Date().toISOString();
  const client = db();
  try {
    const collected = await collect();
    const normalized = collected.map(normalizeCollectedTournament).filter(validCollectedTournament);
    let imported = 0;
    for (const group of deduplicateCollected(normalized))
      imported += await persistGroup(client, group);
    const result = { success: true, fetched: collected.length, imported };
    await recordRun(client, source, startedAt, result);
    return result;
  } catch (error) {
    const code = error instanceof Error ? error.message : "SOURCE_FAILED";
    const result = {
      success: false,
      fetched: 0,
      imported: 0,
      error: error instanceof SourceDisabledError ? "SOURCE_DISABLED_PENDING_PERMISSION" : code,
    };
    await recordRun(client, source, startedAt, result);
    return result;
  }
}

export async function syncAllTournaments(): Promise<TournamentSyncResult> {
  // 같은 대회가 두 source에 동시에 나타날 때 canonical INSERT race를 피하도록 순차 저장한다.
  // 외부 요청은 source당 목록 1회뿐이며 한 source 실패는 다음 source 실행을 막지 않는다.
  const facecock = await runSource("FACECOCK", syncFacecockSource);
  const courtx = await runSource("COURTX", syncCourtxSource);
  return { facecock, courtx };
}
