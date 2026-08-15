import type { SourceCollection } from "../types";
import {
  FACECOCK_MAX_PAGES,
  facecockPageUrl,
  parseFacecockPageCount,
  parseFacecockTournamentList,
} from "./facecock";
import { fetchSourceHtml, sourceEnabled, SourceDisabledError } from "./source-utils.server";

export async function syncFacecockSource(): Promise<SourceCollection> {
  if (!sourceEnabled("FACECOCK")) throw new SourceDisabledError("FACECOCK");

  const firstHtml = await fetchSourceHtml(facecockPageUrl(1));
  const pageLimit = Math.min(parseFacecockPageCount(firstHtml), FACECOCK_MAX_PAGES);
  const items = parseFacecockTournamentList(firstHtml);
  let pageCount = 1;

  for (let page = 2; page <= pageLimit; page += 1) {
    const html = await fetchSourceHtml(facecockPageUrl(page));
    pageCount += 1;
    items.push(...parseFacecockTournamentList(html));
  }

  return { items, pageCount };
}
