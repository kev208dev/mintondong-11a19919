import { adminClient } from "./account.server";
import {
  AppleNotificationError,
  sha256Hex,
  type VerifiedAppleNotification,
} from "./apple-notifications-core";

export type AppleNotificationProcessingResult = {
  notificationId: string;
  userId: string | null;
  status: "processed" | "review_required" | "unresolved" | "unknown";
  duplicate: boolean;
};

type ProcessingRow = {
  notification_id: string;
  resolved_user_id: string | null;
  result_status: AppleNotificationProcessingResult["status"];
  is_duplicate: boolean;
};

export async function processAppleServerNotification(
  notification: VerifiedAppleNotification,
): Promise<AppleNotificationProcessingResult> {
  const appleSubHash = await sha256Hex(notification.event.sub);
  const { data, error } = await adminClient().rpc("process_apple_auth_notification", {
    p_jti: notification.jti,
    p_event_type: notification.event.type,
    p_apple_sub: notification.event.sub,
    p_apple_sub_hash: appleSubHash,
    p_event_time: new Date(notification.event.eventTime * 1000).toISOString(),
  });
  if (error) {
    console.error("[apple-s2s] durable processing failed", {
      code: error.code,
    });
    throw new AppleNotificationError("APPLE_NOTIFICATION_PROCESSING_FAILED", 500);
  }
  const row = (Array.isArray(data) ? data[0] : data) as ProcessingRow | null;
  if (!row) throw new AppleNotificationError("APPLE_NOTIFICATION_PROCESSING_FAILED", 500);

  return {
    notificationId: row.notification_id,
    userId: row.resolved_user_id,
    status: row.result_status,
    duplicate: row.is_duplicate,
  };
}
