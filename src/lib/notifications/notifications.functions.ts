import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await import("./notifications.server")).listNotifications(context.userId),
  );
export const unreadNotificationCountFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await import("./notifications.server")).unreadNotificationCount(context.userId),
  );
export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ context, data }) =>
    (await import("./notifications.server")).markNotificationRead(context.userId, data.id),
  );
export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await import("./notifications.server")).markAllNotificationsRead(context.userId),
  );
