/**
 * 토스페이먼츠 서버 함수 (테스트 모드 전용)
 * 브라우저는 절대 토스 API를 직접 호출하지 않는다. 항상 이 서버 함수를 경유한다.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getTossServerStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { readSecretKey } = await import("./toss.server");
  const secret = readSecretKey();
  const signingReady = Boolean(process.env["ORDER_SIGNING_SECRET"]);
  return secret.ok
    ? { ok: signingReady as boolean, reason: signingReady ? null : "MISSING_SIGNING_SECRET" }
    : { ok: false, reason: secret.reason };
});

/** 결제창을 열기 전에 서버가 주문 무결성 토큰을 발급한다. */
export const createOrderToken = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        orderId: z.string().min(6).max(64).regex(/^[A-Za-z0-9_-]+$/),
        bookingId: z.string().min(1).max(64),
        clubId: z.string().min(1).max(64),
        amount: z.number().int().positive().max(10_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { readSecretKey, signOrderToken } = await import("./toss.server");
    const secret = readSecretKey();
    if (!secret.ok) return { ok: false as const, reason: secret.reason };
    return { ok: true as const, orderToken: signOrderToken(data) };
  });

/** 성공 리다이렉트 후 결제 승인. successUrl의 amount는 단독으로 신뢰하지 않는다. */
export const confirmTossPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        paymentKey: z.string().min(1).max(200),
        orderId: z.string().min(6).max(64),
        amount: z.number().int().positive().max(10_000_000),
        orderToken: z.string().min(10).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { readSecretKey, tossConfirm, verifyOrderToken } = await import("./toss.server");
    const secret = readSecretKey();
    if (!secret.ok) {
      return { ok: false as const, code: secret.reason, message: "결제 승인 키 설정이 필요합니다." };
    }

    let claims;
    try {
      claims = verifyOrderToken(data.orderToken);
    } catch (e) {
      return {
        ok: false as const,
        code: (e as Error).message,
        message: "주문 정보를 검증할 수 없습니다. 다시 시도해 주세요.",
      };
    }
    // 서명된 주문 정보와 리다이렉트 파라미터가 완전히 일치해야만 승인한다.
    if (claims.orderId !== data.orderId || claims.amount !== data.amount) {
      return { ok: false as const, code: "ORDER_MISMATCH", message: "주문 금액이 일치하지 않습니다." };
    }

    const result = await tossConfirm({
      secretKey: secret.key,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: claims.amount,
    });
    if (!result.ok) return { ok: false as const, code: result.code, message: result.message };
    return {
      ok: true as const,
      bookingId: claims.bookingId,
      clubId: claims.clubId,
      payment: result.payment,
    };
  });

/** 테스트 결제 취소(환불). 반드시 서버에서만 토스 취소 API를 호출한다. */
export const cancelTossPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        paymentKey: z.string().min(1).max(200),
        cancelReason: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { readSecretKey, tossCancel } = await import("./toss.server");
    const secret = readSecretKey();
    if (!secret.ok) {
      return { ok: false as const, code: secret.reason, message: "결제 취소 키 설정이 필요합니다." };
    }
    const result = await tossCancel({
      secretKey: secret.key,
      paymentKey: data.paymentKey,
      cancelReason: data.cancelReason,
    });
    if (!result.ok) return { ok: false as const, code: result.code, message: result.message };
    return { ok: true as const, payment: result.payment };
  });
