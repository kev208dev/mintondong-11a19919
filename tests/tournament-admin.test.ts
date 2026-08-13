import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateManualTournamentInput,
  withTournamentAdmin,
} from "../src/lib/tournaments/admin-core.ts";
import { calculateTournamentStatus } from "../src/lib/tournaments/status.ts";

const validTournament = {
  title: "2026 테스트 전국 배드민턴대회",
  startDate: "2026-09-05",
  endDate: "2026-09-06",
  registrationStartDate: "2026-08-01",
  registrationEndDate: "2026-08-31",
  region: "서울",
  city: "송파구",
  venue: "테스트체육관",
  venueAddress: "서울시 송파구 테스트로 1",
  scope: "NATIONAL",
  organizer: "테스트 주최",
  host: "테스트 주관",
  entryFeeWon: 30_000,
  posterUrl: "https://example.com/poster.png",
  description: "개발 DB에서만 사용하는 테스트 입력",
  registrationUrl: "https://example.com/register",
  sourceUrl: "https://example.com/tournament",
  bracketUrl: "https://example.com/bracket",
  resultUrl: "https://example.com/result",
};

for (const actionName of ["create", "update", "deactivate"] as const) {
  test(`일반 사용자의 admin ${actionName} 작업을 거부한다`, async () => {
    let called = false;
    await assert.rejects(
      withTournamentAdmin({
        loadRole: async () => "USER",
        action: async () => {
          called = true;
          return true;
        },
      }),
      /관리자 권한/,
    );
    assert.equal(called, false);
  });
}

test("ADMIN은 대회 생성 작업을 실행할 수 있다", async () => {
  const result = await withTournamentAdmin({
    loadRole: async () => "ADMIN",
    action: async () => "created",
  });
  assert.equal(result, "created");
});

test("일반 사용자 권한 오류는 403으로 구분된다", async () => {
  await assert.rejects(
    withTournamentAdmin({ loadRole: async () => "USER", action: async () => true }),
    (error: unknown) =>
      error instanceof Error &&
      "statusCode" in error &&
      (error as { statusCode: unknown }).statusCode === 403,
  );
});

test("필수 대회명, 날짜 순서와 URL을 form 단계에서 검증한다", () => {
  const missingTitle = validateManualTournamentInput({ ...validTournament, title: "" });
  assert.equal(missingTitle.ok, false);
  if (!missingTitle.ok) assert.match(missingTitle.errors.title ?? "", /대회명/);

  const reversedDates = validateManualTournamentInput({
    ...validTournament,
    endDate: "2026-09-04",
  });
  assert.equal(reversedDates.ok, false);
  if (!reversedDates.ok) assert.match(reversedDates.errors.endDate ?? "", /시작일/);

  const reversedRegistration = validateManualTournamentInput({
    ...validTournament,
    registrationEndDate: "2026-07-31",
  });
  assert.equal(reversedRegistration.ok, false);
  if (!reversedRegistration.ok) {
    assert.match(reversedRegistration.errors.registrationEndDate ?? "", /접수 시작일/);
  }

  const invalidUrl = validateManualTournamentInput({
    ...validTournament,
    registrationUrl: "javascript:alert(1)",
  });
  assert.equal(invalidUrl.ok, false);
  if (!invalidUrl.ok) assert.match(invalidUrl.errors.registrationUrl ?? "", /http/);
});

test("수동 등록 대회도 기존 날짜 기반 상태 계산을 사용한다", () => {
  const checked = validateManualTournamentInput(validTournament);
  assert.equal(checked.ok, true);
  assert.equal(
    calculateTournamentStatus({ ...validTournament, today: "2026-08-13" }),
    "REGISTERING",
  );
});

test("migration은 canonical과 MANUAL source를 원자적으로 만들고 soft delete한다", () => {
  const sql = readFileSync(
    "supabase/migrations/20260813022012_tournament_manual_admin.sql",
    "utf8",
  );
  assert.match(
    sql,
    /create_manual_tournament[\s\S]*insert into public\.tournaments[\s\S]*insert into public\.tournament_sources/i,
  );
  assert.match(sql, /v_tournament_id, 'MANUAL', v_tournament_id::text/i);
  assert.match(sql, /add column if not exists is_active boolean not null default true/i);
  assert.match(sql, /public reads active tournaments[\s\S]*using \(is_active = true\)/i);
  assert.doesNotMatch(sql, /drop\s+table|truncate|delete\s+from/i);
});

test("role은 self-service write에서 제외되고 DB 함수는 service_role 전용이다", () => {
  const migration = readFileSync(
    "supabase/migrations/20260813022012_tournament_manual_admin.sql",
    "utf8",
  );
  assert.match(migration, /role in \('USER', 'ADMIN'\)/i);
  assert.match(migration, /revoke insert, update on table public\.profiles from authenticated/i);
  assert.doesNotMatch(
    migration,
    /grant (insert|update) \([^)]*role[^)]*\)[\s\S]*to authenticated/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.create_manual_tournament[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.create_manual_tournament[\s\S]*to service_role/i,
  );
});

test("admin server functions는 검증된 세션 middleware를 모두 사용한다", () => {
  const functions = readFileSync("src/lib/tournaments/admin.functions.ts", "utf8");
  const uses = functions.match(/\.middleware\(\[requireSupabaseAuth\]\)/g) ?? [];
  assert.equal(uses.length, 4);
  assert.doesNotMatch(functions, /isAdmin\s*[:=]/);
});

test("collector는 MANUAL canonical을 덮어쓰지 않는다", () => {
  const repository = readFileSync("src/lib/tournaments/repository.server.ts", "utf8");
  assert.match(repository, /\.eq\("source", "MANUAL"\)/);
  assert.match(repository, /if \(!manual\.data\)[\s\S]*canonicalUpdatePayload/);
});
