import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidKoreanMobilePhone } from "./checkout-input";
import { LEGACY_PORTONE_PAYMENT_ID } from "./payment-core";

const ids = z.object({
  clubId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

const guestPayment = z.object({
  bookingId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(50),
  customerPhone: z.string().trim().refine(isValidKoreanMobilePhone),
});

export const getCheckoutLesson = createServerFn({ method: "GET" })
  .validator((value) => ids.parse(value))
  .handler(async ({ data }) => {
    const { readCheckoutProduct } = await import("./portone.server");
    return readCheckoutProduct(data.clubId, data.lessonId);
  });

export const preparePortOnePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    ids
      .extend({
        customerName: z.string().trim().min(1).max(50),
        customerPhone: z.string().trim().refine(isValidKoreanMobilePhone),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const { preparePayment } = await import("./portone.server");
    const email = typeof context.claims["email"] === "string" ? context.claims["email"] : undefined;
    return preparePayment({
      ...data,
      userId: context.userId,
      ...(email ? { customerEmail: email } : {}),
    });
  });

export const prepareGuestPortOnePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) => guestPayment.parse(value))
  .handler(async ({ data, context }) => {
    const { prepareGuestPayment } = await import("./portone.server");
    const email = typeof context.claims["email"] === "string" ? context.claims["email"] : undefined;
    return prepareGuestPayment({
      ...data,
      userId: context.userId,
      ...(email ? { customerEmail: email } : {}),
    });
  });

export const completePortOnePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z.object({ paymentId: z.string().regex(LEGACY_PORTONE_PAYMENT_ID) }).parse(value),
  )
  .handler(async ({ data, context }) => {
    const { synchronizePayment } = await import("./portone.server");
    return synchronizePayment(data.paymentId, context.userId);
  });

export const requestPortOneCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        paymentId: z.string().regex(LEGACY_PORTONE_PAYMENT_ID),
        reason: z.string().trim().min(2).max(200),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const { cancelPayment } = await import("./portone.server");
    return cancelPayment({ ...data, userId: context.userId });
  });
