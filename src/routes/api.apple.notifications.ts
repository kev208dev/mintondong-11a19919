import { createFileRoute } from "@tanstack/react-router";
import {
  APPLE_NOTIFICATION_MAX_BODY_BYTES,
  AppleNotificationError,
  isKnownAppleNotificationEvent,
  parseAppleNotificationEnvelope,
  safeAppleNotificationId,
} from "@/lib/auth/apple-notifications-core";

async function readRequestTextLimited(request: Request, maxBytes: number): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new AppleNotificationError("NOTIFICATION_BODY_TOO_LARGE", 413);
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new AppleNotificationError("NOTIFICATION_BODY_TOO_LARGE", 413);
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

function methodNotAllowed() {
  return Response.json(
    { ok: false },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}

export const Route = createFileRoute("/api/apple/notifications")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") ?? "";
          if (!contentType.toLowerCase().includes("application/json")) {
            throw new AppleNotificationError("INVALID_NOTIFICATION_CONTENT_TYPE", 400);
          }
          const rawBody = await readRequestTextLimited(request, APPLE_NOTIFICATION_MAX_BODY_BYTES);
          let envelope: unknown;
          try {
            envelope = JSON.parse(rawBody);
          } catch {
            throw new AppleNotificationError("INVALID_NOTIFICATION_JSON", 400);
          }
          const payload = parseAppleNotificationEnvelope(envelope);

          const [
            { serverEnv },
            { verifyAppleServerNotification },
            { processAppleServerNotification },
          ] = await Promise.all([
            import("@/lib/server-env.server"),
            import("@/lib/auth/apple-notifications-verifier.server"),
            import("@/lib/auth/apple-notifications.server"),
          ]);
          const audience = serverEnv("APPLE_NOTIFICATION_AUDIENCE");
          if (!audience) throw new AppleNotificationError("APPLE_NOTIFICATION_NOT_CONFIGURED", 503);

          const notification = await verifyAppleServerNotification(payload, audience);
          const result = await processAppleServerNotification(notification);

          if (!isKnownAppleNotificationEvent(notification.event.type)) {
            console.warn("[apple-s2s] signed unknown event recorded", {
              type: notification.event.type,
              jti: safeAppleNotificationId(notification.jti),
              resolved: Boolean(result.userId),
            });
          } else {
            console.info("[apple-s2s] event processed", {
              type: notification.event.type,
              jti: safeAppleNotificationId(notification.jti),
              resolved: Boolean(result.userId),
              duplicate: result.duplicate,
              status: result.status,
            });
          }
          return Response.json(
            { ok: true },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          const failure =
            error instanceof AppleNotificationError
              ? error
              : new AppleNotificationError("APPLE_NOTIFICATION_INTERNAL_ERROR", 500);
          console.error("[apple-s2s] request rejected", {
            code: failure.message,
            status: failure.httpStatus,
          });
          return Response.json(
            { ok: false },
            { status: failure.httpStatus, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
