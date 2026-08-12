export const PORTONE_PAYMENT_ID = /^[A-Za-z0-9_-]{16,64}$/;

export type InternalPaymentStatus = "PENDING" | "PAID" | "CANCELLED" | "FAILED";

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
  return (
    input.remote.id === input.paymentId &&
    input.remote.total === input.internalAmount &&
    (input.remote.status !== "PAID" || input.remote.paid === input.internalAmount) &&
    input.remote.currency === "KRW" &&
    input.remote.orderName === input.internalOrderName &&
    input.remote.storeId === input.internalStoreId &&
    input.remote.channelKey === input.internalChannelKey &&
    typeof input.remote.pgProvider === "string" &&
    ["INICIS", "HTML5_INICIS", "INICIS_V2"].includes(input.remote.pgProvider)
  );
}
