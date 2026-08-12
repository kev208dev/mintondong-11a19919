export const PORTONE_PAYMENT_ID = /^[A-Za-z0-9_-]{16,64}$/;

export type InternalPaymentStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED" | "FAILED";

export const PAYMENT_REVIEW_MESSAGE =
  "결제 확인이 필요합니다. 실제 결제가 되었을 수 있으니 다시 결제하지 말고 고객센터에 문의하세요.";

export const CANCELLABLE_PORTONE_STATUSES = ["PAID", "PARTIAL_CANCELLED"] as const;

export function mapPortOneStatus(status: string, paid: number, cancelled: number) {
  if (status === "PAID") return "PAID" as const;
  if (status === "CANCELLED") return "CANCELLED" as const;
  if (status === "PARTIAL_CANCELLED") {
    return cancelled >= paid && paid > 0 ? ("CANCELLED" as const) : ("PAID" as const);
  }
  if (status === "FAILED") return "FAILED" as const;
  return "PENDING" as const;
}

export function isSellableLesson(input: {
  isPublic: unknown;
  lessonsEnabled: unknown;
  price: unknown;
  durationMin: unknown;
}) {
  return (
    input.isPublic === true &&
    input.lessonsEnabled === true &&
    Number.isInteger(Number(input.price)) &&
    Number(input.price) > 0 &&
    Number.isInteger(Number(input.durationMin)) &&
    Number(input.durationMin) > 0
  );
}

export function paymentFactsMatch(input: {
  paymentId: string;
  internalAmount: number;
  internalOrderName: string;
  internalStoreId: string;
  internalChannelKey: string;
  remote: {
    status: string;
    id: string | undefined;
    total: number;
    paid: number;
    currency: string | undefined;
    orderName: string | undefined;
    storeId: string | undefined;
    channelKey: string | undefined;
    pgProvider: string | undefined;
  };
}) {
  const requiresSettledChannel = ["PAID", "PARTIAL_CANCELLED", "CANCELLED"].includes(
    input.remote.status,
  );
  return (
    input.remote.id === input.paymentId &&
    input.remote.total === input.internalAmount &&
    (input.remote.status !== "PAID" || input.remote.paid === input.internalAmount) &&
    input.remote.currency === "KRW" &&
    input.remote.orderName === input.internalOrderName &&
    input.remote.storeId === input.internalStoreId &&
    (!requiresSettledChannel ||
      (input.remote.channelKey === input.internalChannelKey &&
        typeof input.remote.pgProvider === "string" &&
        ["INICIS", "HTML5_INICIS", "INICIS_V2"].includes(input.remote.pgProvider)))
  );
}

export function verificationReviewStatus(currentStatus: unknown): InternalPaymentStatus {
  return currentStatus === "PAID" || currentStatus === "CANCELLED" || currentStatus === "REFUNDED"
    ? currentStatus
    : "PENDING";
}

export type CancellationDecision =
  | { kind: "REQUEST"; amount: number }
  | { kind: "ALREADY_CANCELLED" }
  | { kind: "REJECT"; code: "PAYMENT_VERIFICATION_MISMATCH" | "PAYMENT_NOT_CANCELLABLE" };

export function cancellationDecision(input: {
  factsMatch: boolean;
  remoteStatus: string;
  total: number;
  cancelled: number;
}): CancellationDecision {
  if (!input.factsMatch) return { kind: "REJECT", code: "PAYMENT_VERIFICATION_MISMATCH" };
  if (input.remoteStatus === "CANCELLED" && input.cancelled >= input.total) {
    return { kind: "ALREADY_CANCELLED" };
  }
  if (!(CANCELLABLE_PORTONE_STATUSES as readonly string[]).includes(input.remoteStatus)) {
    return { kind: "REJECT", code: "PAYMENT_NOT_CANCELLABLE" };
  }
  const amount = input.total - input.cancelled;
  if (!Number.isInteger(amount) || amount <= 0) return { kind: "ALREADY_CANCELLED" };
  return { kind: "REQUEST", amount };
}

/** REJECT/중복 취소에서는 callback 자체를 실행하지 않아 외부 취소 API 호출을 막는다. */
export async function executeCancellationDecision<T>(
  decision: CancellationDecision,
  requestCancellation: (amount: number) => Promise<T>,
): Promise<{ called: false } | { called: true; response: T }> {
  if (decision.kind === "REJECT") throw new Error(decision.code);
  if (decision.kind === "ALREADY_CANCELLED") return { called: false };
  return { called: true, response: await requestCancellation(decision.amount) };
}

export type CheckoutPaymentAccess =
  "LOGIN_REQUIRED" | "PORTONE_DISABLED" | "REFUND_MISSING" | "READY";

export function checkoutPaymentAccess(input: {
  authenticated: boolean;
  integrationReady: boolean;
  refundPolicyReady: boolean;
}): CheckoutPaymentAccess {
  if (!input.authenticated) return "LOGIN_REQUIRED";
  if (!input.integrationReady) return "PORTONE_DISABLED";
  if (!input.refundPolicyReady) return "REFUND_MISSING";
  return "READY";
}
