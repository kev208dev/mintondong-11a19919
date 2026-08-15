import { randomUUID } from "node:crypto";
import { PaymentClient, Webhook } from "@portone/server-sdk";
import type { Payment as PortOneSdkPayment } from "@portone/server-sdk/payment";
import type { SupabaseClient } from "@supabase/supabase-js";
import { portOnePublicConfig } from "@/config/portone";
import { adminClient } from "@/lib/auth/account.server";
import { requireServerEnv, serverEnv } from "@/lib/server-env.server";
import { createUserNotification } from "@/lib/notifications/notifications.server";
import {
  cancellationDecision,
  createPortOnePaymentId,
  executeCancellationDecision,
  isSellableLesson,
  mapPortOneStatus,
  PAYMENT_REVIEW_MESSAGE,
  paymentFactsMatch,
  LEGACY_PORTONE_PAYMENT_ID,
  verificationReviewStatus,
} from "./payment-core";

type Row = Record<string, unknown>;

export type CheckoutProduct = {
  clubId: string;
  clubName: string;
  location: string | null;
  lessonId: string;
  coachName: string;
  description: string | null;
  weekdays: number[];
  startHour: number;
  endHour: number;
  durationMin: number;
  priceWon: number;
};

function db(): SupabaseClient {
  return adminClient();
}

function secret(): string {
  try {
    return requireServerEnv("PORTONE_API_SECRET");
  } catch {
    // 서버 환경변수 이름을 브라우저 응답이나 클라이언트 번들에 노출하지 않는다.
    throw new Error("PORTONE_SERVER_NOT_CONFIGURED");
  }
}

function expectedStoreId() {
  return portOnePublicConfig.storeId;
}

function expectedChannelKey() {
  return portOnePublicConfig.channelKey;
}

function portOneEnabled() {
  return portOnePublicConfig.enabled;
}

export async function readCheckoutProduct(
  clubId: string,
  lessonId: string,
): Promise<CheckoutProduct | null> {
  const client = db();
  const { data: club, error: clubError } = await client
    .from("clubs")
    .select("id, name, location, lessons_enabled, is_public")
    .eq("id", clubId)
    .maybeSingle();
  if (clubError) throw clubError;
  const { data: coach, error: coachError } = await client
    .from("coaches")
    .select(
      "id, club_id, name, intro, weekdays, start_hour, end_hour, duration_min, price, is_active",
    )
    .eq("id", lessonId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (coachError) throw coachError;
  if (!club || !coach) return null;
  const c = club as Row;
  const lesson = coach as Row;
  if (
    !isSellableLesson({
      isPublic: c["is_public"],
      lessonsEnabled: c["lessons_enabled"],
      isActive: lesson["is_active"],
      price: lesson["price"],
      durationMin: lesson["duration_min"],
    })
  ) {
    return null;
  }
  return {
    clubId: String(c["id"]),
    clubName: String(c["name"] ?? ""),
    location: (c["location"] as string | null) ?? null,
    lessonId: String(lesson["id"]),
    coachName: String(lesson["name"] ?? ""),
    description: (lesson["intro"] as string | null) ?? null,
    weekdays: Array.isArray(lesson["weekdays"])
      ? lesson["weekdays"].filter((v): v is number => typeof v === "number")
      : [],
    startHour: Number(lesson["start_hour"] ?? 0),
    endHour: Number(lesson["end_hour"] ?? 0),
    durationMin: Number(lesson["duration_min"]),
    priceWon: Number(lesson["price"]),
  };
}

function orderName(product: CheckoutProduct): string {
  const source = `${product.clubName} ${product.coachName} 레슨`;
  let result = "";
  for (const character of source) {
    if (new TextEncoder().encode(result + character).length > 40) break;
    result += character;
  }
  return result || "민턴동 레슨";
}

export async function preparePayment(input: {
  userId: string;
  clubId: string;
  lessonId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}) {
  const product = await readCheckoutProduct(input.clubId, input.lessonId);
  if (!product) throw new Error("LESSON_NOT_SELLABLE");
  const storeId = expectedStoreId();
  const channelKey = expectedChannelKey();
  if (!portOneEnabled() || !storeId || !channelKey) throw new Error("PORTONE_NOT_CONFIGURED");
  // 결제창을 연 뒤 서버 검증이 불가능해지는 상태를 만들지 않는다. Runtime API Secret이
  // 없으면 내부 PENDING 주문 생성 전 fail-closed 하며 브라우저에는 값을 반환하지 않는다.
  secret();
  const { data: reviewOrder, error: reviewError } = await db()
    .from("payments")
    .select("id")
    .eq("provider", "PORTONE")
    .eq("user_id", input.userId)
    .eq("coach_id", product.lessonId)
    .eq("failure_code", "PORTONE_VERIFICATION_MISMATCH")
    .limit(1)
    .maybeSingle();
  if (reviewError) throw reviewError;
  if (reviewOrder) throw new Error("PAYMENT_REVIEW_REQUIRED");
  const paymentId = createPortOnePaymentId(randomUUID());
  const name = orderName(product);
  const { error } = await db().from("payments").insert({
    booking_id: null,
    club_id: product.clubId,
    coach_id: product.lessonId,
    user_id: input.userId,
    amount: product.priceWon,
    method: "CARD",
    status: "PENDING",
    provider: "PORTONE",
    transaction_ref: paymentId,
    order_id: paymentId,
    portone_payment_id: paymentId,
    currency: "KRW",
    order_name: name,
    portone_store_id: storeId,
    portone_channel_key: channelKey,
  });
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204" || error.code === "23502") {
      throw new Error("PORTONE_PAYMENT_MIGRATION_REQUIRED");
    }
    throw error;
  }
  return {
    paymentId,
    amount: product.priceWon,
    orderName: name,
    customer: {
      customerId: input.userId,
      fullName: input.customerName,
      phoneNumber: input.customerPhone,
      email: input.customerEmail || undefined,
    },
  };
}

function guestOrderName(clubName: string, title: string) {
  const source = `${clubName} ${title} 게스트`;
  let result = "";
  for (const character of source) {
    if (new TextEncoder().encode(result + character).length > 40) break;
    result += character;
  }
  return result || "민턴동 게스트";
}

export async function prepareGuestPayment(input: {
  userId: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}) {
  const storeId = expectedStoreId();
  const channelKey = expectedChannelKey();
  if (!portOneEnabled() || !storeId || !channelKey) throw new Error("PORTONE_NOT_CONFIGURED");
  secret();
  const { data, error } = await db()
    .from("guest_bookings")
    .select(
      "id,user_id,total_amount,status,payment_id,offer_id,guest_offers(title,club_id,clubs(name))",
    )
    .eq("id", input.bookingId)
    .maybeSingle();
  if (error) throw error;
  if (!data || String((data as Row)["user_id"]) !== input.userId)
    throw new Error("GUEST_BOOKING_FORBIDDEN");
  if (!["pending", "payment_pending"].includes(String((data as Row)["status"])))
    throw new Error("GUEST_BOOKING_NOT_PAYABLE");
  const row = data as Row;
  const offer = row["guest_offers"] as Row | null;
  const club = offer?.["clubs"] as Row | null;
  const existingPaymentId = row["payment_id"] ? String(row["payment_id"]) : null;
  if (existingPaymentId) {
    const { data: existingPayment, error: existingError } = await db()
      .from("payments")
      .select("amount,order_name")
      .eq("portone_payment_id", existingPaymentId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingPayment) {
      return {
        paymentId: existingPaymentId,
        amount: Number((existingPayment as Row)["amount"]),
        orderName: String((existingPayment as Row)["order_name"]),
        customer: {
          customerId: input.userId,
          fullName: input.customerName,
          phoneNumber: input.customerPhone,
          email: input.customerEmail || undefined,
        },
      };
    }
  }
  const paymentId = createPortOnePaymentId(randomUUID());
  const orderName = guestOrderName(
    String(club?.["name"] ?? "민턴동"),
    String(offer?.["title"] ?? "게스트 운동"),
  );
  const { error: paymentError } = await db()
    .from("payments")
    .insert({
      booking_id: null,
      guest_booking_id: input.bookingId,
      reference_type: "guest_booking",
      reference_id: input.bookingId,
      purpose: "GUEST_BOOKING",
      club_id: String(offer?.["club_id"] ?? ""),
      coach_id: null,
      user_id: input.userId,
      amount: Number(row["total_amount"]),
      method: "CARD",
      status: "PENDING",
      provider: "PORTONE",
      transaction_ref: paymentId,
      order_id: paymentId,
      portone_payment_id: paymentId,
      currency: "KRW",
      order_name: orderName,
      portone_store_id: storeId,
      portone_channel_key: channelKey,
    });
  if (paymentError) throw paymentError;
  const { error: bookingError } = await db()
    .from("guest_bookings")
    .update({
      payment_id: paymentId,
      status: "payment_pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId)
    .eq("user_id", input.userId);
  if (bookingError) throw bookingError;
  return {
    paymentId,
    amount: Number(row["total_amount"]),
    orderName,
    customer: {
      customerId: input.userId,
      fullName: input.customerName,
      phoneNumber: input.customerPhone,
      email: input.customerEmail || undefined,
    },
  };
}

type PortOnePayment = {
  status: string;
  id: string;
  transactionId: string;
  storeId: string;
  channel: { key: string | undefined; pgProvider: string } | undefined;
  amount: { total: number; paid: number; cancelled: number };
  currency: string;
  orderName: string;
  paidAt: string | undefined;
  statusChangedAt: string;
  receiptUrl: string | undefined;
  failureCode: string | undefined;
  failureMessage: string | undefined;
};

async function getPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const payment = await PaymentClient({ secret: secret() }).getPayment({ paymentId });
  return normalizePortOnePayment(payment);
}

function normalizePortOnePayment(payment: PortOneSdkPayment): PortOnePayment {
  if (!("id" in payment) || !("amount" in payment)) {
    throw new Error("PORTONE_UNRECOGNIZED_PAYMENT_STATUS");
  }
  const failure = payment.status === "FAILED" ? payment.failure : undefined;
  return {
    status: String(payment.status),
    id: payment.id,
    transactionId: payment.transactionId,
    storeId: payment.storeId,
    channel: payment.channel
      ? { key: payment.channel.key, pgProvider: payment.channel.pgProvider }
      : undefined,
    amount: {
      total: payment.amount.total,
      paid: payment.amount.paid,
      cancelled: payment.amount.cancelled,
    },
    currency: payment.currency,
    orderName: payment.orderName,
    paidAt: "paidAt" in payment ? payment.paidAt : undefined,
    statusChangedAt: payment.statusChangedAt,
    receiptUrl: "receiptUrl" in payment ? payment.receiptUrl : undefined,
    failureCode: failure?.pgCode,
    failureMessage: failure?.pgMessage ?? failure?.reason,
  };
}

async function internalPayment(paymentId: string) {
  const { data, error } = await db()
    .from("payments")
    .select(
      "id, user_id, club_id, coach_id, guest_booking_id, reference_type, reference_id, amount, currency, order_name, status, provider, portone_payment_id, portone_store_id, portone_channel_key, cancel_idempotency_key",
    )
    .eq("portone_payment_id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

function factsMatch(paymentId: string, internal: Row, remote: PortOnePayment) {
  return paymentFactsMatch({
    paymentId,
    internalAmount: Number(internal["amount"]),
    internalOrderName: String(internal["order_name"]),
    internalStoreId: String(internal["portone_store_id"]),
    internalChannelKey: String(internal["portone_channel_key"]),
    remote: {
      status: remote.status,
      id: remote.id,
      total: remote.amount.total,
      paid: remote.amount.paid,
      currency: remote.currency,
      orderName: remote.orderName,
      storeId: remote.storeId,
      channelKey: remote.channel?.key,
      pgProvider: remote.channel?.pgProvider,
    },
  });
}

async function markVerificationReview(internal: Row, remoteStatus: string) {
  const { error } = await db()
    .from("payments")
    .update({
      status: verificationReviewStatus(internal["status"]),
      portone_status: remoteStatus,
      failure_code: "PORTONE_VERIFICATION_MISMATCH",
      failure_message: PAYMENT_REVIEW_MESSAGE,
      verified_at: new Date().toISOString(),
    })
    .eq("id", internal["id"]);
  if (error) throw error;
}

export async function synchronizePayment(paymentId: string, userId?: string) {
  if (!LEGACY_PORTONE_PAYMENT_ID.test(paymentId)) throw new Error("INVALID_PAYMENT_ID");
  const internal = await internalPayment(paymentId);
  if (!internal || internal["provider"] !== "PORTONE") throw new Error("ORDER_NOT_FOUND");
  if (userId && internal["user_id"] !== userId) throw new Error("ORDER_FORBIDDEN");
  const remote = await getPortOnePayment(paymentId);
  const { total, paid, cancelled } = remote.amount;
  if (!factsMatch(paymentId, internal, remote)) {
    await markVerificationReview(internal, remote.status);
    throw new Error("PAYMENT_VERIFICATION_MISMATCH");
  }
  const status = mapPortOneStatus(remote.status, paid, cancelled);
  const update: Row = {
    status,
    portone_status: remote.status,
    portone_transaction_id: remote.transactionId ?? null,
    transaction_ref: remote.transactionId ?? paymentId,
    payment_key: remote.transactionId ?? null,
    receipt_url: remote.receiptUrl ?? null,
    cancelled_amount: cancelled,
    verified_at: new Date().toISOString(),
    failure_code: remote.status === "FAILED" ? (remote.failureCode ?? "PORTONE_FAILED") : null,
    failure_message: remote.status === "FAILED" ? (remote.failureMessage ?? "결제 실패") : null,
  };
  if (status === "PAID" && remote.paidAt) update["paid_at"] = remote.paidAt;
  if (status === "CANCELLED")
    update["cancelled_at"] = remote.statusChangedAt ?? new Date().toISOString();
  const { error } = await db().from("payments").update(update).eq("id", internal["id"]);
  if (error) throw error;
  const guestBookingId = internal["guest_booking_id"] ? String(internal["guest_booking_id"]) : null;
  if (guestBookingId) {
    const bookingStatus =
      status === "PAID"
        ? "confirmed"
        : status === "CANCELLED"
          ? "cancelled"
          : status === "FAILED"
            ? "failed"
            : undefined;
    if (bookingStatus) {
      const { error: bookingError } = await db()
        .from("guest_bookings")
        .update({
          status: bookingStatus,
          updated_at: new Date().toISOString(),
          ...(bookingStatus === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
        })
        .eq("id", guestBookingId);
      if (bookingError) throw bookingError;
      if (internal["user_id"]) {
        const notification =
          bookingStatus === "confirmed"
            ? {
                type: "guest_booking_confirmed",
                title: "예약이 확정됐어요",
                body: "게스트 운동 예약과 결제가 확인됐어요.",
              }
            : bookingStatus === "cancelled"
              ? {
                  type: "guest_booking_cancelled",
                  title: "게스트 예약이 취소됐어요",
                  body: "결제가 취소되었거나 예약이 취소됐어요.",
                }
              : {
                  type: "guest_booking_failed",
                  title: "게스트 예약 결제를 확인하지 못했어요",
                  body: "결제가 완료되지 않았어요. 예약 상태를 다시 확인해 주세요.",
                };
        await createUserNotification({
          userId: String(internal["user_id"]),
          ...notification,
          deepLink: "/me",
          dedupeKey: `guest-booking:${guestBookingId}:${bookingStatus}`,
        });
      }
    }
  }
  return { paymentId, status, portoneStatus: remote.status, amount: Number(internal["amount"]) };
}

export async function cancelPayment(input: { paymentId: string; userId: string; reason: string }) {
  const internal = await internalPayment(input.paymentId);
  if (!internal || internal["provider"] !== "PORTONE" || internal["user_id"] !== input.userId) {
    throw new Error("ORDER_NOT_FOUND");
  }
  const before = await getPortOnePayment(input.paymentId);
  const decision = cancellationDecision({
    factsMatch: factsMatch(input.paymentId, internal, before),
    remoteStatus: before.status,
    total: before.amount.total,
    cancelled: before.amount.cancelled,
  });
  if (decision.kind === "REJECT" && decision.code === "PAYMENT_VERIFICATION_MISMATCH") {
    await markVerificationReview(internal, before.status);
  }
  const key = `cancel_${input.paymentId}_${String(internal["id"]).replaceAll("-", "")}`.slice(
    0,
    128,
  );
  await executeCancellationDecision(decision, async (cancellable) => {
    await db()
      .from("payments")
      .update({ cancel_idempotency_key: key, cancel_requested_at: new Date().toISOString() })
      .eq("id", internal["id"]);
    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(input.paymentId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret()}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `"${key}"`,
        },
        body: JSON.stringify({
          reason: input.reason,
          amount: cancellable,
          currentCancellableAmount: cancellable,
          requester: "CUSTOMER",
        }),
      },
    );
    if (!response.ok) throw new Error(`PORTONE_CANCEL_FAILED:${response.status}`);
  });
  return synchronizePayment(input.paymentId, input.userId);
}

export async function webhookPaymentId(rawBody: string, headers: Headers) {
  const webhookSecret = serverEnv("PORTONE_WEBHOOK_SECRET");
  let payload: unknown;
  if (webhookSecret) {
    payload = await Webhook.verify(webhookSecret, rawBody, Object.fromEntries(headers.entries()));
  } else {
    // 서명 secret 미설정 시 payload는 paymentId 후보 추출에만 사용하고 상태/금액은 절대 신뢰하지 않는다.
    payload = JSON.parse(rawBody) as unknown;
  }
  if (!payload || typeof payload !== "object") throw new Error("INVALID_WEBHOOK");
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") throw new Error("INVALID_WEBHOOK");
  const paymentId = (data as { paymentId?: unknown }).paymentId;
  if (typeof paymentId !== "string" || !LEGACY_PORTONE_PAYMENT_ID.test(paymentId)) {
    throw new Error("INVALID_WEBHOOK_PAYMENT_ID");
  }
  return paymentId;
}
