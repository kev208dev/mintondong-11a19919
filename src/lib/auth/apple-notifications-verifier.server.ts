import {
  createLocalJWKSet,
  decodeProtectedHeader,
  errors,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";
import {
  APPLE_NOTIFICATION_ISSUER,
  APPLE_NOTIFICATION_JWKS_URL,
  AppleNotificationError,
  parseVerifiedAppleClaims,
  type VerifiedAppleNotification,
} from "./apple-notifications-core.ts";

const JWKS_MAX_BYTES = 64 * 1024;
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;

type JwksCache = { value: JSONWebKeySet; expiresAt: number };

export type AppleNotificationVerifierOptions = {
  audience: string;
  fetchImpl?: typeof fetch;
  jwksUrl?: string;
  now?: () => number;
};

async function readTextLimited(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new AppleNotificationError("APPLE_JWKS_TOO_LARGE", 503);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new AppleNotificationError("APPLE_JWKS_TOO_LARGE", 503);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isJsonWebKeySet(value: unknown): value is JSONWebKeySet {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)["keys"]) &&
    ((value as Record<string, unknown>)["keys"] as unknown[]).length > 0,
  );
}

export function createAppleNotificationVerifier(options: AppleNotificationVerifierOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const jwksUrl = options.jwksUrl ?? APPLE_NOTIFICATION_JWKS_URL;
  const now = options.now ?? Date.now;
  let cache: JwksCache | null = null;

  async function loadJwks(forceRefresh: boolean): Promise<JSONWebKeySet> {
    const currentTime = now();
    if (!forceRefresh && cache && cache.expiresAt > currentTime) return cache.value;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetchImpl(jwksUrl, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new AppleNotificationError("APPLE_JWKS_UNAVAILABLE", 503);
      const parsed: unknown = JSON.parse(await readTextLimited(response, JWKS_MAX_BYTES));
      if (!isJsonWebKeySet(parsed)) {
        throw new AppleNotificationError("APPLE_JWKS_INVALID", 503);
      }
      cache = { value: parsed, expiresAt: currentTime + JWKS_CACHE_MS };
      return parsed;
    } catch (error) {
      if (error instanceof AppleNotificationError) throw error;
      throw new AppleNotificationError("APPLE_JWKS_UNAVAILABLE", 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function verifyWithJwks(payload: string, forceRefresh: boolean) {
    const jwks = createLocalJWKSet(await loadJwks(forceRefresh));
    return jwtVerify(payload, jwks, {
      algorithms: ["RS256"],
      issuer: APPLE_NOTIFICATION_ISSUER,
      audience: options.audience,
      requiredClaims: ["iss", "aud", "iat", "jti", "events"],
    });
  }

  return async (payload: string): Promise<VerifiedAppleNotification> => {
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
      header = decodeProtectedHeader(payload);
    } catch {
      throw new AppleNotificationError("INVALID_NOTIFICATION_JWS", 401);
    }
    if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
      throw new AppleNotificationError("INVALID_NOTIFICATION_JWS_HEADER", 401);
    }

    try {
      let verified;
      try {
        verified = await verifyWithJwks(payload, false);
      } catch (error) {
        if (!(error instanceof errors.JWKSNoMatchingKey)) throw error;
        verified = await verifyWithJwks(payload, true);
      }
      return parseVerifiedAppleClaims(
        verified.payload as Record<string, unknown>,
        options.audience,
        Math.floor(now() / 1000),
      );
    } catch (error) {
      if (error instanceof AppleNotificationError) throw error;
      throw new AppleNotificationError("INVALID_NOTIFICATION_SIGNATURE_OR_CLAIMS", 401);
    }
  };
}

let productionVerifier:
  { audience: string; verify: ReturnType<typeof createAppleNotificationVerifier> } | undefined;

/** Module cache keeps Apple's rotating JWKS across Worker requests for one configured audience. */
export function verifyAppleServerNotification(payload: string, audience: string) {
  if (!productionVerifier || productionVerifier.audience !== audience) {
    productionVerifier = {
      audience,
      verify: createAppleNotificationVerifier({ audience }),
    };
  }
  return productionVerifier.verify(payload);
}
