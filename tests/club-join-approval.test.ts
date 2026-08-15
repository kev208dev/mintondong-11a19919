import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260816120000_club_join_requests_approval.sql", import.meta.url),
  "utf8",
);

test("가입 신청은 pending unique request와 self RLS를 사용한다", () => {
  assert.match(migration, /create table if not exists public\.club_join_requests/);
  assert.match(migration, /club_join_requests_pending_unique_idx/);
  assert.match(migration, /status = 'pending'/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /request_club_join\(p_club_id uuid, p_message text/);
});

test("승인은 MANAGE_MEMBERS 권한 확인과 membership/request/notification을 한 RPC에서 처리한다", () => {
  assert.match(migration, /club_has_permission\(request_row\.club_id, 'MANAGE_MEMBERS'/);
  assert.match(migration, /review_club_join_request/);
  assert.match(migration, /mintondong\.approved_membership_change/);
  assert.match(migration, /insert into public\.club_members/);
  assert.match(migration, /update public\.club_join_requests/);
  assert.match(migration, /insert into public\.user_notifications/);
  assert.match(migration, /on conflict \(user_id, dedupe_key\) do nothing/);
});

test("초대 코드도 승인 RPC를 우회하지 않는다", () => {
  assert.match(migration, /request_club_join_by_code/);
  assert.match(migration, /return public\.request_club_join\(target_club, p_message\)/);
});
