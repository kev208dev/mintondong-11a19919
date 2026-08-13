import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getTournament, getTournaments } from "./tournaments.functions";
import type { TournamentFilters } from "./types";

const db = supabase as unknown as SupabaseClient;

export const tournamentKeys = {
  all: (filters: TournamentFilters) => ["tournaments", filters] as const,
  detail: (id: string) => ["tournaments", "detail", id] as const,
  favorites: (userId: string | null) => ["tournaments", "favorites", userId] as const,
};

export async function listTournaments(filters: TournamentFilters) {
  return getTournaments({ data: filters });
}

export async function loadTournament(tournamentId: string) {
  return getTournament({ data: { tournamentId } });
}

export async function listTournamentFavoriteIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await db
    .from("tournament_favorites")
    .select("tournament_id")
    .eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => String(row["tournament_id"]));
}

export async function toggleTournamentFavorite(input: {
  userId: string;
  tournamentId: string;
  favorite: boolean;
}) {
  if (input.favorite) {
    const { error } = await db
      .from("tournament_favorites")
      .upsert(
        { user_id: input.userId, tournament_id: input.tournamentId },
        { onConflict: "user_id,tournament_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await db
      .from("tournament_favorites")
      .delete()
      .eq("user_id", input.userId)
      .eq("tournament_id", input.tournamentId);
    if (error) throw error;
  }
}
