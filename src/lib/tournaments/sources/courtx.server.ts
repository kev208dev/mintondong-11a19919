import type { SourceCollection } from "../types";
import { COURTX_LIST_URL, parseCourtxTournamentList } from "./courtx";
import { fetchSourceHtml, sourceEnabled, SourceDisabledError } from "./source-utils.server";

export async function syncCourtxSource(): Promise<SourceCollection> {
  if (!sourceEnabled("COURTX")) throw new SourceDisabledError("COURTX");
  // CourtX 현재 SSR 목록은 한 응답에 전체 항목을 렌더링하고 별도 next URL이 없다.
  return { items: parseCourtxTournamentList(await fetchSourceHtml(COURTX_LIST_URL)), pageCount: 1 };
}
