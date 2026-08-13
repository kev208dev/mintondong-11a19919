import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from "jose";
import {
  APPLE_NOTIFICATION_EVENT_TYPES,
  APPLE_NOTIFICATION_ISSUER,
  AppleNotificationError,
  isKnownAppleNotificationEvent,
  parseAppleNotificationEnvelope,
  parseVerifiedAppleClaims,
} from "../src/lib/auth/apple-notifications-core.ts";
import { createAppleNotificationVerifier } from "../src/lib/auth/apple-notifications-verifier.server.ts";

const audience = "com.mintondong.app";
const nowSeconds = 1_800_000_000;

async function signingKey(kid: string) {
  const pair = await generateKeyPair("RS256", { extractable: true });
  const jwk = await exportJWK(pair.publicKey);
  return {
    privateKey: pair.privateKey as CryptoKey,
    publicJwk: { ...jwk, kid, alg: "RS256", use: "sig" } as JWK,
    kid,
  };
}

async function signedNotification(
  key: Awaited<ReturnType<typeof signingKey>>,
  overrides: {
    issuer?: string;
    audience?: string;
    eventType?: string;
    jti?: string;
  } = {},
) {
  return new SignJWT({
    events: {
      type: overrides.eventType ?? "email-enabled",
      sub: "apple-provider-subject-for-test",
      event_time: nowSeconds,
    },
  })
    .setProtectedHeader({ alg: "RS256", kid: key.kid })
    .setIssuer(overrides.issuer ?? APPLE_NOTIFICATION_ISSUER)
    .setAudience(overrides.audience ?? audience)
    .setIssuedAt(nowSeconds)
    .setJti(overrides.jti ?? "apple-notification-jti-1")
    .sign(key.privateKey);
}

function jwksFetch(keys: JWK[], calls?: { count: number }): typeof fetch {
  return (async () => {
    if (calls) calls.count += 1;
    return Response.json({ keys });
  }) as typeof fetch;
}

test("valid Apple RS256 notification verifies issuer, audience and event claims", async () => {
  const key = await signingKey("apple-key-1");
  const verify = createAppleNotificationVerifier({
    audience,
    fetchImpl: jwksFetch([key.publicJwk]),
    now: () => nowSeconds * 1000,
  });
  const verified = await verify(await signedNotification(key));
  assert.equal(verified.issuer, APPLE_NOTIFICATION_ISSUER);
  assert.equal(verified.audience, audience);
  assert.equal(verified.event.type, "email-enabled");
});

test("invalid signature is rejected", async () => {
  const trusted = await signingKey("same-kid");
  const attacker = await signingKey("same-kid");
  const verify = createAppleNotificationVerifier({
    audience,
    fetchImpl: jwksFetch([trusted.publicJwk]),
    now: () => nowSeconds * 1000,
  });
  await assert.rejects(verify(await signedNotification(attacker)), AppleNotificationError);
});

test("wrong issuer and audience are rejected", async () => {
  const key = await signingKey("apple-key-claims");
  const verify = createAppleNotificationVerifier({
    audience,
    fetchImpl: jwksFetch([key.publicJwk]),
    now: () => nowSeconds * 1000,
  });
  await assert.rejects(
    verify(await signedNotification(key, { issuer: "https://attacker.example" })),
    /INVALID_NOTIFICATION_SIGNATURE_OR_CLAIMS/,
  );
  await assert.rejects(
    verify(await signedNotification(key, { audience: "wrong.app" })),
    /INVALID_NOTIFICATION_SIGNATURE_OR_CLAIMS/,
  );
});

test("unknown kid refreshes the cached JWKS once", async () => {
  const oldKey = await signingKey("old-key");
  const rotatedKey = await signingKey("rotated-key");
  const calls = { count: 0 };
  const fetchImpl = (async () => {
    calls.count += 1;
    return Response.json({ keys: [calls.count === 1 ? oldKey.publicJwk : rotatedKey.publicJwk] });
  }) as typeof fetch;
  const verify = createAppleNotificationVerifier({
    audience,
    fetchImpl,
    now: () => nowSeconds * 1000,
  });
  const verified = await verify(await signedNotification(rotatedKey));
  assert.equal(verified.event.type, "email-enabled");
  assert.equal(calls.count, 2);
});

test("missing payload and malformed JWS are rejected", async () => {
  assert.throws(() => parseAppleNotificationEnvelope({}), /INVALID_NOTIFICATION_PAYLOAD/);
  assert.throws(() => parseAppleNotificationEnvelope(null), /INVALID_NOTIFICATION_BODY/);

  const verify = createAppleNotificationVerifier({
    audience,
    fetchImpl: jwksFetch([]),
    now: () => nowSeconds * 1000,
  });
  await assert.rejects(verify("not-a-jws"), /INVALID_NOTIFICATION_JWS/);
});

test("all documented events and signed unknown events retain their type", () => {
  for (const type of [...APPLE_NOTIFICATION_EVENT_TYPES, "future-apple-event"]) {
    const parsed = parseVerifiedAppleClaims(
      {
        iss: APPLE_NOTIFICATION_ISSUER,
        aud: audience,
        iat: nowSeconds,
        jti: `jti-${type}`,
        events: { type, sub: "apple-sub", event_time: nowSeconds },
      },
      audience,
      nowSeconds,
    );
    assert.equal(parsed.event.type, type);
    assert.equal(isKnownAppleNotificationEvent(type), type !== "future-apple-event");
  }
});

test("migration maps provider subject atomically and keeps audit server-only", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260813112445_apple_auth_notifications.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /auth\.identities[\s\S]*provider_id = p_apple_sub/);
  assert.match(migration, /on conflict \(jti\) do nothing/);
  assert.match(migration, /return query[\s\S]*existing\.jti = p_jti/);
  assert.match(migration, /resolved_id is null then 'unresolved'/);
  assert.match(migration, /account-deleted'[\s\S]*'review_required'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.apple_auth_notifications/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /drop\s+table|truncate\s+table|delete\s+from/i);
  assert.doesNotMatch(migration, /raw_jws|raw_payload|apple_email/);
});

test("route rejects GET and has bounded JSON POST processing without CORS", () => {
  const route = readFileSync("src/routes/api.apple.notifications.ts", "utf8");
  assert.match(route, /createFileRoute\("\/api\/apple\/notifications"\)/);
  assert.match(route, /GET: methodNotAllowed/);
  assert.match(route, /status: 405/);
  assert.match(route, /APPLE_NOTIFICATION_MAX_BODY_BYTES/);
  assert.doesNotMatch(route, /Access-Control-Allow-Origin/i);
  assert.doesNotMatch(route, /console\.(?:log|info|warn|error)\([^)]*payload/);
});
