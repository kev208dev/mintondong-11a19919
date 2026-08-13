import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isOnboardingSubflow, resolvePostAuthRedirect } from "../src/lib/auth/onboarding-state.ts";
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
  clubs: "ready" as const,
  activeClubCount: 0,
};

test("신규 이메일 사용자에게 username이 있으면 첫 동호회 온보딩으로 이동한다", () => {
  assert.equal(resolvePostAuthRedirect(readyBase), "/onboarding");
});

test("username이 없는 소셜 신규 사용자는 계정 온보딩으로 이동한다", () => {
  assert.equal(
    resolvePostAuthRedirect({ ...readyBase, username: null, clubs: "idle" }),
    "/onboarding/account",
  );
});

test("profile 또는 clubs가 아직 해결되지 않았으면 redirect하지 않는다", () => {
  assert.equal(resolvePostAuthRedirect({ ...readyBase, profile: "loading" }), null);
  assert.equal(resolvePostAuthRedirect({ ...readyBase, clubs: "loading" }), null);
  assert.equal(resolvePostAuthRedirect({ ...readyBase, clubs: "error" }), null);
});

test("동호회 찾기·생성·상세는 onboarding subflow라 전역 redirect가 가로채지 않는다", () => {
  for (const pathname of ["/onboarding", "/clubs/find", "/clubs/new", "/clubs/club-id"]) {
    assert.equal(isOnboardingSubflow(pathname), true);
    assert.equal(resolvePostAuthRedirect({ ...readyBase, pathname }), null);
  }
});

test("active membership 생성 후 온보딩 redirect가 종료된다", () => {
  assert.equal(resolvePostAuthRedirect({ ...readyBase, activeClubCount: 1 }), null);
});

test("pending membership은 active club로 계산하지 않는다", () => {
  assert.equal(isActiveMembership("pending"), false);
  assert.equal(isActiveMembership("active"), true);
  assert.equal(resolvePostAuthRedirect(readyBase), "/onboarding");
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
