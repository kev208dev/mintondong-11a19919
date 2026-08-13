import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  ACCOUNT_DELETION_CODES,
  accountDeletionMessage,
} from "../src/lib/auth/account-deletion-core.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260813035134_account_deletion.sql", import.meta.url),
  "utf8",
);
const serverFunction = readFileSync(
  new URL("../src/lib/auth/account-deletion.functions.ts", import.meta.url),
  "utf8",
);

test("account deletion requires the explicit Korean confirmation phrase", () => {
  assert.equal(ACCOUNT_DELETION_CONFIRMATION, "계정 삭제");
});

test("club owners receive an actionable blocker message", () => {
  assert.match(accountDeletionMessage(ACCOUNT_DELETION_CODES.ownsClub), /고객지원.*소유권 이전/);
});

test("server deletion always uses the authenticated middleware user", () => {
  assert.match(serverFunction, /deleteCurrentAccount\(context\.userId\)/);
  assert.doesNotMatch(serverFunction, /userId:\s*z\./);
});

test("migration blocks owners and anonymizes retained relationships", () => {
  assert.match(migration, /ACCOUNT_OWNS_CLUB/);
  assert.match(migration, /update public\.payments[\s\S]*set user_id = null/);
  assert.match(migration, /update public\.club_members[\s\S]*name = '탈퇴한 회원'/);
  assert.match(migration, /delete from public\.tournament_favorites where user_id = old\.id/);
});

test("account deletion migration is additive and service-role scoped", () => {
  assert.doesNotMatch(migration, /drop\s+table|truncate\s+table/i);
  assert.match(
    migration,
    /grant execute on function public\.account_deletion_preflight\(uuid\) to service_role/,
  );
  assert.match(
    migration,
    /revoke all on function public\.account_deletion_preflight\(uuid\)[\s\S]*authenticated/,
  );
});
