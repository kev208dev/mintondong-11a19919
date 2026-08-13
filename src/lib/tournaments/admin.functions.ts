import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ManualTournamentInput } from "./admin-core";

export const getAdminTournaments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAdminTournaments } = await import("./admin-repository.server");
    return listAdminTournaments(context.userId);
  });

export const createAdminTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: ManualTournamentInput) => value)
  .handler(async ({ data, context }) => {
    const { createManualTournament } = await import("./admin-repository.server");
    return createManualTournament(context.userId, data);
  });

export const updateAdminTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: { tournamentId: string; tournament: ManualTournamentInput }) => value)
  .handler(async ({ data, context }) => {
    const { updateManualTournament } = await import("./admin-repository.server");
    return updateManualTournament(context.userId, data.tournamentId, data.tournament);
  });

export const setAdminTournamentActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: { tournamentId: string; isActive: boolean }) => value)
  .handler(async ({ data, context }) => {
    const { setManualTournamentActive } = await import("./admin-repository.server");
    return setManualTournamentActive(context.userId, data.tournamentId, data.isActive);
  });
