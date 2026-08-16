import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  ACCOUNT_DELETION_CODES,
  accountDeletionMessage,
} from "../src/lib/auth/account-deletion-core.ts";
import { hasAppleIdentity } from "../src/lib/auth/apple-provider-token.ts";
import {
  createAppleClientSecret,
  revokeAppleProviderToken,
} from "../src/lib/auth/apple-revocation.server.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260813050946_account_deletion.sql", import.meta.url),
  "utf8",
);
const serverFunction = readFileSync(
  new URL("../src/lib/auth/account-deletion.functions.ts", import.meta.url),
  "utf8",
);
const nativeBridge = readFileSync(
  new URL("../src/components/native/NativeRuntimeBridge.tsx", import.meta.url),
  "utf8",
);

test("account deletion requires the explicit Korean confirmation phrase", () => {
  assert.equal(ACCOUNT_DELETION_CONFIRMATION, "계정 삭제");
});

test("club owners receive an actionable blocker message", () => {
  assert.match(accountDeletionMessage(ACCOUNT_DELETION_CODES.ownsClub), /고객지원.*소유권 이전/);
});

test("server deletion always uses the authenticated middleware user", () => {
  assert.match(serverFunction, /deleteCurrentAccount\(context\.userId, data\.appleProviderToken\)/);
  assert.doesNotMatch(serverFunction, /userId:\s*z\./);
});

test("migration blocks owners and anonymizes retained relationships", () => {
  assert.match(migration, /ACCOUNT_OWNS_CLUB/);
  assert.match(migration, /update public\.payments[\s\S]*set user_id = null/);
  assert.match(migration, /update public\.payments[\s\S]*depositor_name = null/);
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

test("only accounts linked to Apple require provider token revocation", () => {
  assert.equal(
    hasAppleIdentity({ app_metadata: { provider: "apple" }, identities: [] } as never),
    true,
  );
  assert.equal(
    hasAppleIdentity({ app_metadata: { providers: ["email", "apple"] }, identities: [] } as never),
    true,
  );
  assert.equal(
    hasAppleIdentity({ app_metadata: { provider: "email" }, identities: [] } as never),
    false,
  );
});

test("Apple client secret is a short-lived ES256 JWT and revocation uses the token endpoint", async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const key = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(key).toString("base64")}\n-----END PRIVATE KEY-----`;
  const credentials = {
    teamId: "TEAM123456",
    keyId: "KEY1234567",
    clientId: "com.mintondong.web",
    privateKey,
  };
  const secret = await createAppleClientSecret(credentials, 1_800_000_000);
  const [, encodedPayload] = secret.split(".");
  const payload = JSON.parse(Buffer.from(encodedPayload!, "base64url").toString("utf8"));
  assert.equal(payload.iss, credentials.teamId);
  assert.equal(payload.sub, credentials.clientId);
  assert.equal(payload.exp - payload.iat, 300);

  let requestBody: URLSearchParams | null = null;
  await revokeAppleProviderToken("apple-access-token-for-test", credentials, (async (
    input,
    init,
  ) => {
    assert.equal(input, "https://appleid.apple.com/auth/revoke");
    requestBody = init?.body as URLSearchParams;
    return new Response(null, { status: 200 });
  }) as typeof fetch);
  assert.equal(requestBody?.get("client_id"), credentials.clientId);
  assert.equal(requestBody?.get("token"), "apple-access-token-for-test");
  assert.equal(requestBody?.get("token_type_hint"), "access_token");
});

test("native auth callback is deduplicated before exchanging the one-time code", () => {
  assert.match(nativeBridge, /authCallbackUrls\.current\.has\(url\)/);
  assert.match(nativeBridge, /authCallbackUrls\.current\.add\(url\)/);
  assert.match(nativeBridge, /mintondong:\/\/auth\/callback/);
});
