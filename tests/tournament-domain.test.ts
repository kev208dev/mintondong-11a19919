import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isHighConfidenceDuplicate } from "../src/lib/tournaments/deduplicate.ts";
import { normalizeTournamentTitle } from "../src/lib/tournaments/normalize.ts";
import { calculateTournamentStatus } from "../src/lib/tournaments/status.ts";
import { registrationDeadlineLabel } from "../src/lib/tournaments/format.ts";
import { parseCourtxTournamentList } from "../src/lib/tournaments/sources/courtx.ts";
import { parseFacecockTournamentList } from "../src/lib/tournaments/sources/facecock.ts";

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
