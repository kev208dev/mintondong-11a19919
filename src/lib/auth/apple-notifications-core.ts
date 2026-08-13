export const APPLE_NOTIFICATION_ISSUER = "https://appleid.apple.com";
export const APPLE_NOTIFICATION_JWKS_URL = "https://appleid.apple.com/auth/keys";
export const APPLE_NOTIFICATION_MAX_BODY_BYTES = 32 * 1024;

export const APPLE_NOTIFICATION_EVENT_TYPES = [
  "email-enabled",
  "email-disabled",
  "consent-revoked",
  "account-deleted",
] as const;

export type AppleNotificationEventType = (typeof APPLE_NOTIFICATION_EVENT_TYPES)[number];

export type VerifiedAppleNotification = {
  issuer: typeof APPLE_NOTIFICATION_ISSUER;
  audience: string;
  issuedAt: number;
  jti: string;
  event: {
    type: string;
    sub: string;
    eventTime: number;
  };
};

export class AppleNotificationError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "AppleNotificationError";
    this.httpStatus = httpStatus;
  }
}

export function isKnownAppleNotificationEvent(value: string): value is AppleNotificationEventType {
  return (APPLE_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(value);
}

export function parseAppleNotificationEnvelope(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_BODY", 400);
  }
  const payload = (value as Record<string, unknown>)["payload"];
  if (typeof payload !== "string" || !payload.trim() || payload.length > 24 * 1024) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_PAYLOAD", 400);
  }
  return payload;
}

export function parseVerifiedAppleClaims(
  value: Record<string, unknown>,
  expectedAudience: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedAppleNotification {
  const issuer = value["iss"];
  const audience = value["aud"];
  const issuedAt = value["iat"];
  const jti = value["jti"];
  const events = value["events"];

  if (issuer !== APPLE_NOTIFICATION_ISSUER || audience !== expectedAudience) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_CLAIMS", 401);
  }
  if (!Number.isInteger(issuedAt) || (issuedAt as number) <= 0) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_IAT", 401);
  }
  if ((issuedAt as number) > nowSeconds + 300) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_IAT", 401);
  }
  if (typeof jti !== "string" || jti.length < 1 || jti.length > 255) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_JTI", 401);
  }
  if (!events || typeof events !== "object" || Array.isArray(events)) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_EVENTS", 401);
  }

  const event = events as Record<string, unknown>;
  const type = event["type"];
  const sub = event["sub"];
  const eventTime = event["event_time"];
  if (typeof type !== "string" || type.length < 1 || type.length > 64) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_EVENT_TYPE", 401);
  }
  if (typeof sub !== "string" || sub.length < 1 || sub.length > 512) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_SUBJECT", 401);
  }
  if (!Number.isInteger(eventTime) || (eventTime as number) <= 0) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_EVENT_TIME", 401);
  }
  if ((eventTime as number) > nowSeconds + 300) {
    throw new AppleNotificationError("INVALID_NOTIFICATION_EVENT_TIME", 401);
  }

  return {
    issuer: APPLE_NOTIFICATION_ISSUER,
    audience: expectedAudience,
    issuedAt: issuedAt as number,
    jti,
    event: { type, sub, eventTime: eventTime as number },
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safeAppleNotificationId(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}
