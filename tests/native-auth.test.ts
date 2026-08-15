import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Apple native auth uses a local Capacitor plugin and id token nonce exchange", () => {
  const providers = readFileSync("src/lib/auth/providers.ts", "utf8");
  const nativeAuth = readFileSync("src/lib/native/native-auth.ts", "utf8");
  const swift = readFileSync("ios/App/App/SceneDelegate.swift", "utf8");

  assert.match(nativeAuth, /registerPlugin<NativeAuthPlugin>\("NativeAuth"\)/);
  assert.match(providers, /NativeAuth\.signInWithApple\(\)/);
  assert.match(providers, /signInWithIdToken/);
  assert.match(providers, /nonce: credential\.nonce/);
  assert.match(swift, /requestedScopes = \[\.fullName, \.email\]/);
  assert.match(swift, /request\.nonce = Self\.sha256\(nonce\)/);
  assert.match(swift, /identityToken/);
});

test("Apple cancellation is not presented as a login failure", () => {
  const auth = readFileSync("src/routes/auth.index.tsx", "utf8");
  assert.match(auth, /APPLE_SIGN_IN_CANCELLED/);
  assert.match(auth, /return;/);
});

test("OAuth callback parser remains shared for token and code callbacks", () => {
  const callback = readFileSync("src/lib/auth/native-callback.ts", "utf8");
  assert.match(callback, /setSession/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /error_description/);
});
