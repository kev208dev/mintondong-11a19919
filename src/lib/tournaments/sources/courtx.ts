import { load } from "cheerio";
import type { CollectedTournament } from "../types.ts";
import { htmlText, parseDateRange } from "./source-parser.ts";

const ORIGIN = "https://www.courtx.co.kr";
export const COURTX_LIST_URL = `${ORIGIN}/Tournament/List`;

export function parseCourtxTournamentList(html: string): CollectedTournament[] {
  const $ = load(html);
  const rows: CollectedTournament[] = [];
  $(".ssr-tournament-item").each((_index, element) => {
    try {
      const item = $(element);
      const link = item.find('a[href*="/Tournament/Details/"]').first();
      const href = link.attr("href");
      const id = href?.match(/\/Tournament\/Details\/(\d+)/i)?.[1];
      const title = htmlText(link.text());
      const metadata = htmlText(item.find(".ssr-tournament-meta").text());
      const range = parseDateRange(metadata);
      if (!href || !id || !title || !range) return;
      const regionText =
        metadata.match(/\uc9c0\uc5ed\s*:\s*([^\u00b7]+?)(?=\s*\u00b7|$)/)?.[1]?.trim() ?? null;
      const hostText = metadata.match(/\uc8fc\ucd5c\s*:\s*(.+)$/)?.[1]?.trim() ?? null;
      const locationParts = regionText?.split(/\s+/) ?? [];
      rows.push({
        source: "COURTX",
        externalId: id,
        sourceUrl: new URL(href, ORIGIN).toString(),
        title,
        ...range,
        region: locationParts[0] ?? null,
        city: locationParts.slice(1).join(" ") || null,
        scope: /(\uc804\uad6d|\uc624\ud508|open)/i.test(title) ? "NATIONAL" : "LOCAL",
        organizer: hostText?.replace(/^\uc8fc\ucd5c\s*:\s*/, "") ?? null,
        rawData: { listText: metadata },
      });
    } catch {
      // 부분적인 markup 오류는 건너뛴다.
    }
  });
  return rows;
}

export function parseCourtxTournamentDetail(html: string): Partial<CollectedTournament> {
  const $ = load(html);
  const description = htmlText(
    $(".tournament-description, .tournament-detail-content, .detail-content").first().text(),
  );
  const registrationHref = $('a[href*="Register"], a:contains("\ucc38\uac00 \uc2e0\uccad")')
    .first()
    .attr("href");
  return {
    description: description || null,
    registrationUrl: registrationHref ? new URL(registrationHref, ORIGIN).toString() : null,
  };
}
