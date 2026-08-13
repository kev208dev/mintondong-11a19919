import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isCompleteKoreanMobilePhone } from "./checkout-input";

const ids = z.object({
  clubId: z.string().uuid(),
  lessonId: z.string().uuid(),
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
        customerPhone: z.string().trim().refine(isCompleteKoreanMobilePhone),
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

export const completePortOnePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z.object({ paymentId: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/) }).parse(value),
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
        paymentId: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
        reason: z.string().trim().min(2).max(200),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const { cancelPayment } = await import("./portone.server");
    return cancelPayment({ ...data, userId: context.userId });
  });
