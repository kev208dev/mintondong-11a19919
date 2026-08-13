import type { CollectedTournament } from "../types";
import { FACECOCK_LIST_URL, parseFacecockTournamentList } from "./facecock";
import { fetchSourceHtml, sourceEnabled, SourceDisabledError } from "./source-utils.server";

export async function syncFacecockSource(): Promise<CollectedTournament[]> {
  if (!sourceEnabled("FACECOCK")) throw new SourceDisabledError("FACECOCK");
  return parseFacecockTournamentList(await fetchSourceHtml(FACECOCK_LIST_URL));
}
