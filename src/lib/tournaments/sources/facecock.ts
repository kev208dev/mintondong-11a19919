import { load } from "cheerio";
import type { CollectedTournament } from "../types.ts";
import { htmlText, parseDateRange } from "./source-parser.ts";

const ORIGIN = "https://facecock.co.kr";
export const FACECOCK_LIST_URL = `${ORIGIN}/page/?pid=game`;
export const FACECOCK_MAX_PAGES = 5;

export function facecockPageUrl(page: number) {
  if (page <= 1) return FACECOCK_LIST_URL;
  return `${FACECOCK_LIST_URL}&page=${page}`;
}

export function parseFacecockPageCount(html: string): number {
  const pages = [...html.matchAll(/[?&]page=(\d+)/g)].map((match) => Number(match[1]));
  return Math.max(1, ...pages.filter((page) => Number.isFinite(page)));
}

export function parseFacecockTournamentList(html: string): CollectedTournament[] {
  const $ = load(html);
  const rows: CollectedTournament[] = [];
  $(".multi-item").each((_index, element) => {
    try {
      const item = $(element);
      const detail = item.find('a[href*="pid=game_view"][href*="ga_id="]').first();
      const href = detail.attr("href");
      const id = href?.match(/[?&]ga_id=(\d+)/)?.[1];
      const title = htmlText(detail.text());
      const body = htmlText(item.find(".multi-cont").text());
      const range = parseDateRange(body);
      if (!href || !id || !title || !range) return;
      const locationLine = body.split(/\ub300\ud68c\uae30\uac04\s*:/)[0]?.trim() ?? "";
      const locationMatch = locationLine.match(/^\[([^\]-]+)(?:-([^\]]+))?\](.*)$/);
      const image = item.find(".multi-img img").attr("src");
      const absolute = (path: string) => new URL(path, ORIGIN).toString();
      rows.push({
        source: "FACECOCK",
        externalId: id,
        sourceUrl: absolute(href),
        title,
        ...range,
        region: locationMatch?.[1]?.trim() ?? null,
        city: locationMatch?.[2]?.trim() ?? null,
        venue: locationMatch?.[3]?.trim() || null,
        scope: item.find(".multi-city").text().includes("\uc804\uad6d") ? "NATIONAL" : "LOCAL",
        posterUrl: image ? absolute(image) : null,
        registrationUrl: absolute(`/page/index.php?pid=game_regist&ga_id=${id}`),
        bracketUrl: absolute(`/page/index.php?pid=game_schedule&ga_id=${id}`),
        resultUrl: absolute(`/page/index.php?pid=game_result&ga_id=${id}`),
        rawData: { listText: body },
      });
    } catch {
      // 한 항목의 DOM 변경이 전체 목록 수집을 중단하지 않게 한다.
    }
  });
  return rows;
}

export function parseFacecockTournamentDetail(html: string): Partial<CollectedTournament> {
  const $ = load(html);
  const description = htmlText($(".game-view, .view-content, .board-view").first().text());
  return { description: description || null };
}
