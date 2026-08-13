import type { CollectedTournament } from "../types";
import { COURTX_LIST_URL, parseCourtxTournamentList } from "./courtx";
import { fetchSourceHtml, sourceEnabled, SourceDisabledError } from "./source-utils.server";

export async function syncCourtxSource(): Promise<CollectedTournament[]> {
  if (!sourceEnabled("COURTX")) throw new SourceDisabledError("COURTX");
  return parseCourtxTournamentList(await fetchSourceHtml(COURTX_LIST_URL));
}
