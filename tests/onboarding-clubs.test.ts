import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isOnboardingSubflow,
  normalizeRoutePathname,
  resolvePostAuthRedirect,
} from "../src/lib/auth/onboarding-state.ts";
import {
  clubMutationErrorMessage,
  isActiveMembership,
  validateCreateClubInput,
} from "../src/lib/clubs/club-core.ts";

const readyBase = {
  authenticated: true,
  pathname: "/",
  profile: "ready" as const,
  username: "new_member",
  onboardingCompletedAt: null,
};

test("신규 이메일 사용자에게 username이 있으면 첫 동호회 온보딩으로 이동한다", () => {
  assert.equal(resolvePostAuthRedirect(readyBase), "/onboarding");
});

test("username이 없는 소셜 신규 사용자는 계정 온보딩으로 이동한다", () => {
  assert.equal(resolvePostAuthRedirect({ ...readyBase, username: null }), "/onboarding/account");
});

test("profile이 ready가 아니면 신규 사용자로 추정하지 않고 redirect하지 않는다", () => {
  assert.equal(resolvePostAuthRedirect({ ...readyBase, profile: "loading" }), null);
  assert.equal(resolvePostAuthRedirect({ ...readyBase, profile: "missing" }), null);
  assert.equal(resolvePostAuthRedirect({ ...readyBase, profile: "error" }), null);
});

test("동호회 찾기·생성·상세와 trailing slash는 onboarding subflow로 유지된다", () => {
  for (const pathname of [
    "/onboarding",
    "/clubs/find",
    "/clubs/find/",
    "/clubs/new",
    "/clubs/new/",
    "/clubs/club-id",
  ]) {
    assert.equal(isOnboardingSubflow(pathname), true);
    assert.equal(resolvePostAuthRedirect({ ...readyBase, pathname }), null);
  }
  assert.equal(normalizeRoutePathname("/clubs/find/?q=seoul#results"), "/clubs/find");
  assert.equal(normalizeRoutePathname("/clubs/new/#form"), "/clubs/new");
});

test("DB onboarding 완료 상태인 기존 계정은 club 수와 무관하게 온보딩하지 않는다", () => {
  const completed = { ...readyBase, onboardingCompletedAt: "2026-08-13T12:00:00Z" };
  assert.equal(resolvePostAuthRedirect(completed), null);
  assert.equal(resolvePostAuthRedirect({ ...completed, username: null }), null);
  assert.equal(resolvePostAuthRedirect({ ...completed, pathname: "/onboarding" }), "/");
  assert.equal(
    resolvePostAuthRedirect({ ...completed, username: null, pathname: "/onboarding/account" }),
    "/",
  );
});

test("신규 미완료 계정만 username 설정을 먼저 거친다", () => {
  assert.equal(resolvePostAuthRedirect({ ...readyBase, username: null }), "/onboarding/account");
  assert.equal(
    resolvePostAuthRedirect({ ...readyBase, username: null, pathname: "/onboarding/account" }),
    null,
  );
  assert.equal(resolvePostAuthRedirect(readyBase), "/onboarding");
  assert.equal(resolvePostAuthRedirect({ ...readyBase, pathname: "/onboarding" }), null);
  assert.equal(resolvePostAuthRedirect({ ...readyBase, pathname: "/clubs/find" }), null);
  assert.equal(resolvePostAuthRedirect({ ...readyBase, pathname: "/clubs/new" }), null);
  assert.equal(
    resolvePostAuthRedirect({ ...readyBase, pathname: "/onboarding/account" }),
    "/onboarding",
  );
});

test("pending membership은 active club로 계산하지 않는다", () => {
  assert.equal(isActiveMembership("pending"), false);
  assert.equal(isActiveMembership("active"), true);
  assert.equal(resolvePostAuthRedirect(readyBase), "/onboarding");
});

test("onboarding 완료 여부는 active club count가 아닌 계정 profile만 사용한다", () => {
  const state = readFileSync(
    new URL("../src/lib/auth/onboarding-state.ts", import.meta.url),
    "utf8",
  );
  assert.match(state, /onboardingCompletedAt/);
  assert.doesNotMatch(state, /activeClubCount|ClubsResolution/);
});

test("온보딩 index는 club query redirect 없이 두 SPA 경로를 유지한다", () => {
  const page = readFileSync(new URL("../src/routes/onboarding.index.tsx", import.meta.url), "utf8");
  assert.match(page, /to="\/clubs\/find"/);
  assert.match(page, /to="\/clubs\/new"/);
  assert.match(page, /logOnboardingNavigation\("\/onboarding", "\/clubs\/find"\)/);
  assert.match(page, /logOnboardingNavigation\("\/onboarding", "\/clubs\/new"\)/);
  assert.doesNotMatch(page, /listMyClubs|clubKeys\.mine|clubs\.data|NEXT_STORAGE_KEY/);
});

test("production generated profiles 타입은 실제 onboarding 필드를 포함한다", () => {
  const generated = readFileSync(
    new URL("../src/integrations/supabase/types.ts", import.meta.url),
    "utf8",
  );
  const profileBlock = generated.match(/\n\s+profiles: \{[\s\S]*?\n\s+Relationships: \[\]/)?.[0];
  assert.ok(profileBlock);
  assert.match(profileBlock, /username: string \| null/);
  assert.match(profileBlock, /role: string/);
  assert.match(profileBlock, /onboarding_completed_at: string \| null/);
});

test("profile schema 오류를 nullable onboarding으로 바꾸는 legacy fallback이 없다", () => {
  const auth = readFileSync(new URL("../src/lib/auth/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(auth, /username, role, onboarding_completed_at/);
  assert.doesNotMatch(auth, /PGRST204|42703|const legacy|onboarding_completed_at: null/);
});

test("native onboarding diagnostic은 opt-in이고 개인정보를 기록하지 않는다", () => {
  const debug = readFileSync(
    new URL("../src/lib/auth/onboarding-debug.ts", import.meta.url),
    "utf8",
  );
  assert.match(debug, /\[onboarding-debug\]/);
  assert.match(debug, /onboardingDebug/);
  assert.doesNotMatch(debug, /access_token|refresh_token|email|userId|user_id/);
});

test("native production document는 최신 Worker version을 식별하고 재사용하지 않는다", () => {
  const start = readFileSync(new URL("../src/start.ts", import.meta.url), "utf8");
  const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(start, /nativeReleaseMiddleware/);
  assert.match(start, /Cache-Control", "no-store"/);
  assert.match(start, /X-Mintondong-Worker-Version/);
  assert.match(start, /requestMiddleware: \[nativeReleaseMiddleware/);
  assert.match(wrangler, /"version_metadata": \{ "binding": "CF_VERSION_METADATA" \}/);
});

test("migration은 기존 profile만 backfill하고 active membership에서만 완료한다", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260813132809_one_time_club_onboarding.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /add column if not exists onboarding_completed_at timestamptz/);
  assert.match(
    migration,
    /update public\.profiles[\s\S]*coalesce\(onboarding_completed_at, now\(\)\)/,
  );
  assert.match(migration, /new\.status = 'active'/);
  assert.match(migration, /after insert or update of status on public\.club_members/);
  assert.match(migration, /ONBOARDING_COMPLETION_SERVER_CONTROLLED/);
  assert.doesNotMatch(migration, /delete\s+from|drop\s+table|truncate/i);
});

test("동호회 생성은 이름과 지역을 모두 검증한다", () => {
  assert.equal(
    validateCreateClubInput({ name: "", region: "서울" }),
    "동호회 이름을 입력해 주세요.",
  );
  assert.equal(validateCreateClubInput({ name: "민턴동", region: "" }), "지역을 입력해 주세요.");
  assert.equal(validateCreateClubInput({ name: "민턴동", region: "서울" }), null);
});

test("가입 중복과 인증 만료 오류를 사용자 메시지로 정규화한다", () => {
  assert.match(clubMutationErrorMessage("join", new Error("duplicate key")), /이미 가입/);
  assert.match(clubMutationErrorMessage("create", new Error("authentication required")), /만료/);
});

test("Club API는 active membership만 조회하고 RPC 입력을 서버 결정값으로 제한한다", () => {
  const api = readFileSync(new URL("../src/lib/clubs/api.ts", import.meta.url), "utf8");
  assert.match(api, /\.eq\("status", "active"\)/);
  assert.match(api, /rpc\("create_club_with_owner"/);
  assert.match(api, /rpc\("request_club_join", \{ p_club_id: clubId \}\)/);
  assert.doesNotMatch(api, /request_club_join[\s\S]{0,120}(user_id|role|status):/);
});

test("회원가입은 세션과 profile을 확정한 뒤 onboarding으로 이동한다", () => {
  const signup = readFileSync(new URL("../src/routes/auth.signup.tsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../src/lib/auth/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(signup, /await establishSession\(tokens\)/);
  assert.match(auth, /if \(data\.session\) await loadProfile\(data\.session\.user\.id\)/);
});

test("로그아웃은 계정별 query cache와 profile 상태를 함께 비운다", () => {
  const auth = readFileSync(new URL("../src/lib/auth/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(auth, /currentUserId\.current !== nextUserId/);
  assert.match(auth, /await queryClient\.cancelQueries\(\)[\s\S]*queryClient\.clear\(\)/);
  assert.match(auth, /setProfile\(null\)/);
  assert.match(auth, /onboarding_completed_at/);
});

test("생성·가입 화면은 auth와 membership 로딩 완료 전 잘못된 CTA를 노출하지 않는다", () => {
  const createRoute = readFileSync(new URL("../src/routes/clubs.new.tsx", import.meta.url), "utf8");
  const detailRoute = readFileSync(
    new URL("../src/routes/clubs.$clubId.tsx", import.meta.url),
    "utf8",
  );
  assert.match(createRoute, /loading \|\| profileLoading \|\| profileStatus !== "ready"/);
  assert.match(detailRoute, /user && membershipQuery\.isLoading/);
  assert.match(detailRoute, /user && membershipQuery\.isError/);
  assert.match(detailRoute, /setQueryData\(clubKeys\.membership/);
  assert.match(createRoute, /refreshProfile\(\)/);
  assert.match(detailRoute, /nextMembership\.status === "active"[\s\S]*refreshProfile\(\)/);
});

test("헤더 동호회 선택은 seed store가 아닌 Supabase active club 목록을 사용한다", () => {
  const switcher = readFileSync(
    new URL("../src/components/app/ClubSwitcher.tsx", import.meta.url),
    "utf8",
  );
  assert.match(switcher, /listMyClubs/);
  assert.match(switcher, /동호회 없음/);
  assert.doesNotMatch(switcher, /useStore|SEED_STATE/);
});
