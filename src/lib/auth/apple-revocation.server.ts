export type AppleRevocationCredentials = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
};

const APPLE_AUDIENCE = "https://appleid.apple.com";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function jsonPart(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function privateKeyBytes(pem: string): ArrayBuffer {
  const normalized = pem.replaceAll("\\n", "\n").trim();
  const encoded = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  if (!encoded) throw new Error("APPLE_PRIVATE_KEY_INVALID");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

export async function createAppleClientSecret(
  credentials: AppleRevocationCredentials,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = jsonPart({ alg: "ES256", kid: credentials.keyId });
  const payload = jsonPart({
    iss: credentials.teamId,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    aud: APPLE_AUDIENCE,
    sub: credentials.clientId,
  });
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes(credentials.privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

export async function revokeAppleProviderToken(
  token: string,
  credentials: AppleRevocationCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const clientSecret = await createAppleClientSecret(credentials);
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: clientSecret,
    token,
    token_type_hint: "access_token",
  });
  const response = await fetchImpl(APPLE_REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    console.error("[apple-revocation] token revocation failed", {
      status: response.status,
    });
    throw new Error("APPLE_REVOCATION_FAILED");
  }
}
