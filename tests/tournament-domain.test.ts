import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isHighConfidenceDuplicate } from "../src/lib/tournaments/deduplicate.ts";
import { normalizeTournamentTitle } from "../src/lib/tournaments/normalize.ts";
import { calculateTournamentStatus } from "../src/lib/tournaments/status.ts";
import { getTournamentDDay, registrationDeadlineLabel } from "../src/lib/tournaments/format.ts";
import { parseCourtxTournamentList } from "../src/lib/tournaments/sources/courtx.ts";
import {
  facecockPageUrl,
  parseFacecockPageCount,
  parseFacecockTournamentList,
} from "../src/lib/tournaments/sources/facecock.ts";

const dates = {
  startDate: "2026-09-05",
  endDate: "2026-09-06",
  registrationStartDate: "2026-08-01",
  registrationEndDate: "2026-08-31",
};

test("대회 상태를 한국 date-only 경계 기준으로 계산한다", () => {
  assert.equal(calculateTournamentStatus({ ...dates, today: "2026-07-31" }), "UPCOMING");
  assert.equal(calculateTournamentStatus({ ...dates, today: "2026-08-13" }), "REGISTERING");
  assert.equal(calculateTournamentStatus({ ...dates, today: "2026-09-01" }), "CLOSED");
  assert.equal(calculateTournamentStatus({ ...dates, today: "2026-09-05" }), "ONGOING");
  assert.equal(calculateTournamentStatus({ ...dates, today: "2026-09-07" }), "FINISHED");
});

test("접수 D-Day는 음수가 되지 않고 지난 날짜를 접수마감으로 표시한다", () => {
  const now = new Date("2026-08-13T03:00:00.000Z");
  assert.equal(registrationDeadlineLabel("2026-08-21", now), "접수마감 D-8");
  assert.equal(registrationDeadlineLabel("2026-08-12", now), "접수마감");
});

test("대회 시작 D-Day는 한국 date-only 기준으로 표시한다", () => {
  const now = new Date("2026-08-12T12:00:00.000Z");
  assert.equal(getTournamentDDay("2026-08-24", "2026-08-25", now), "D-12");
  assert.equal(getTournamentDDay("2026-08-13", "2026-08-14", now), "D-1");
  assert.equal(
    getTournamentDDay("2026-08-13", "2026-08-14", new Date("2026-08-13T01:00:00.000Z")),
    "D-DAY",
  );
  assert.equal(
    getTournamentDDay("2026-08-12", "2026-08-14", new Date("2026-08-13T12:00:00.000Z")),
    "진행중",
  );
  assert.equal(getTournamentDDay("2026-08-01", "2026-08-05", now), "종료");
  assert.equal(
    getTournamentDDay("2027-01-01", "2027-01-02", new Date("2026-12-31T05:00:00.000Z")),
    "D-1",
  );
});

test("Facecock pagination은 링크를 감지하되 상한을 둔 URL을 사용한다", () => {
  assert.equal(
    parseFacecockPageCount('<a href="?pid=game&page=2">2</a><a href="?pid=game&page=3">3</a>'),
    3,
  );
  assert.match(facecockPageUrl(2), /page=2/);
  assert.equal(facecockPageUrl(1), "https://facecock.co.kr/page/?pid=game");
});

test("홈 대회 미리보기는 3개로 고정하지 않고 최대 8개를 요청한다", () => {
  const home = readFileSync("src/components/tournaments/HomeTournamentSection.tsx", "utf8");
  assert.match(home, /status: "REGISTERING"[\s\S]*limit: 8/);
  assert.match(home, /overflow-x-auto/);
  assert.match(home, /대회 정보를 불러오지 못했어요/);
  assert.match(home, /tournaments\.refetch/);
  assert.match(home, /retry: 0/);
});

test("공개 대회 목록은 service role 없이 publishable RLS client를 사용한다", () => {
  const functions = readFileSync("src/lib/tournaments/tournaments.functions.ts", "utf8");
  assert.match(functions, /async function publicDb[\s\S]*publicClient\(\)/);
  assert.match(functions, /async function sourceDb[\s\S]*adminClient\(\)/);
});

test("대회 목록 실패는 기본 retry로 10초 지연되지 않는다", () => {
  const route = readFileSync("src/routes/tournaments.tsx", "utf8");
  assert.match(route, /retry: 0/);
  assert.match(route, /retryDelay: 250/);
});

test("대회 상세는 목록 fallback을 가진 inline back 버튼을 먼저 제공한다", () => {
  const detail = readFileSync("src/routes/tournaments_.$tournamentId.tsx", "utf8");
  assert.match(detail, /InlineBackButton/);
  assert.match(detail, /fallback="\/tournaments"/);
});

test("대회명 normalization은 회차를 유지하고 공백/표기만 안정화한다", () => {
  assert.equal(
    normalizeTournamentTitle("  제17회   남원춘향배—전국배드민턴대회  "),
    "제17회 남원춘향배 전국배드민턴대회",
  );
});

test("동일 제목·날짜·지역인 고신뢰 대회만 중복으로 판정한다", () => {
  const base = {
    normalizedTitle: "제17회 남원춘향배 전국배드민턴대회",
    startDate: "2026-09-05",
    region: "전북",
    city: "남원",
  };
  assert.equal(isHighConfidenceDuplicate(base, { ...base }), true);
  assert.equal(isHighConfidenceDuplicate(base, { ...base, startDate: "2026-09-06" }), false);
  assert.equal(isHighConfidenceDuplicate(base, { ...base, city: "전주" }), false);
  assert.equal(
    isHighConfidenceDuplicate(base, {
      ...base,
      normalizedTitle: "제18회 남원춘향배 전국배드민턴대회",
    }),
    false,
  );
});

test("migration은 public read와 자기 favorite만 허용하고 source raw data는 보호한다", () => {
  const sql = readFileSync("supabase/migrations/20260812235109_tournament_directory.sql", "utf8");
  assert.match(sql, /public reads tournaments[\s\S]*to anon, authenticated[\s\S]*using \(true\)/i);
  assert.match(sql, /auth\.uid\(\)\) = user_id/i);
  assert.match(
    sql,
    /revoke all on table public\.tournament_sources from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant select, insert, delete on table public\.tournament_favorites to authenticated/i,
  );
  assert.doesNotMatch(sql, /grant (insert|update|delete).*tournaments to (anon|authenticated)/i);
  assert.doesNotMatch(sql, /drop\s+table|delete\s+from|truncate/i);
});

test("source sync audit는 bounded page와 실패 row 수를 기록한다", () => {
  const sql = readFileSync(
    "supabase/migrations/20260815090000_tournament_sync_page_count.sql",
    "utf8",
  );
  assert.match(sql, /page_count integer not null default 0/);
  assert.match(sql, /failed_count integer not null default 0/);
});

test("sync endpoint와 source adapter는 secret 및 명시 활성화 없이 fail closed 한다", () => {
  const endpoint = readFileSync("src/routes/api.tournaments.sync.ts", "utf8");
  const source = readFileSync("src/lib/tournaments/sources/source-utils.server.ts", "utf8");
  assert.match(endpoint, /TOURNAMENT_SYNC_SECRET/);
  assert.match(endpoint, /status: 503/);
  assert.match(endpoint, /status: 401/);
  assert.match(source, /TOURNAMENT_\$\{name\}_ENABLED/);
  assert.match(source, /SOURCE_AUTOMATION_CHALLENGE/);
});

test("source별 row 오류를 건너뛰고 유효한 date-only 목록 항목을 파싱한다", () => {
  const facecock = parseFacecockTournamentList(`
    <div class="multi-item"><div class="multi-desc">
      <h7><a href="/page/index.php?pid=game_view&ga_id=42"><strong>제17회 테스트배</strong></a></h7>
      <p class="multi-cont">[전북-남원시]테스트체육관<br>대회기간: 2026년 9월 5일~6일</p>
      <div class="multi-city">전국</div>
    </div></div><div class="multi-item">깨진 항목</div>
  `);
  assert.equal(facecock.length, 1);
  assert.deepEqual([facecock[0]?.startDate, facecock[0]?.endDate], ["2026-09-05", "2026-09-06"]);

  const courtx = parseCourtxTournamentList(`
    <article class="ssr-tournament-item">
      <h2><a href="/Tournament/Details/77">테스트 지역 배드민턴대회</a></h2>
      <div class="ssr-tournament-meta"><span>일시: 2026년 9월 5일 - 2026년 9월 6일</span><span> · 지역: 경기 수원시</span></div>
    </article>
  `);
  assert.equal(courtx.length, 1);
  assert.deepEqual([courtx[0]?.startDate, courtx[0]?.endDate], ["2026-09-05", "2026-09-06"]);
});
