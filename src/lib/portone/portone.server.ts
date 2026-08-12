import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Webhook } from "@portone/server-sdk";
import { adminClient } from "@/lib/auth/account.server";
import {
  isSellableLesson,
  mapPortOneStatus,
  paymentFactsMatch,
  PORTONE_PAYMENT_ID,
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
  const value = process.env["PORTONE_API_SECRET"]?.trim();
  if (!value) throw new Error("PORTONE_API_SECRET_MISSING");
  return value;
}

function expectedStoreId() {
  return (
    process.env["VITE_PORTONE_STORE_ID"]?.trim() ||
    import.meta.env["VITE_PORTONE_STORE_ID"]?.trim() ||
    null
  );
}

function expectedChannelKey() {
  return (
    process.env["VITE_PORTONE_CHANNEL_KEY"]?.trim() ||
    import.meta.env["VITE_PORTONE_CHANNEL_KEY"]?.trim() ||
    null
  );
}

function portOneEnabled() {
  return (
    (process.env["VITE_PORTONE_ENABLED"] || import.meta.env["VITE_PORTONE_ENABLED"]) === "true"
  );
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
    .select("id, club_id, name, intro, weekdays, start_hour, end_hour, duration_min, price")
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
  const paymentId = `md_${Date.now().toString(36)}_${randomUUID().replaceAll("-", "")}`;
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

type PortOnePayment = {
  status: string;
  id?: string;
  transactionId?: string;
  storeId?: string;
  channel?: { key?: string; pgProvider?: string };
  amount?: { total?: number; paid?: number; cancelled?: number };
  currency?: string;
  orderName?: string;
  paidAt?: string;
  statusChangedAt?: string;
  receiptUrl?: string;
  code?: string;
  message?: string;
};

async function getPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${secret()}` },
  });
  const body = (await response.json().catch(() => ({}))) as PortOnePayment;
  if (!response.ok) throw new Error(`PORTONE_LOOKUP_FAILED:${response.status}`);
  return body;
}

async function internalPayment(paymentId: string) {
  const { data, error } = await db()
    .from("payments")
    .select(
      "id, user_id, club_id, coach_id, amount, currency, order_name, status, provider, portone_payment_id, portone_store_id, portone_channel_key, cancel_idempotency_key",
    )
    .eq("portone_payment_id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

export async function synchronizePayment(paymentId: string, userId?: string) {
  if (!PORTONE_PAYMENT_ID.test(paymentId)) throw new Error("INVALID_PAYMENT_ID");
  const internal = await internalPayment(paymentId);
  if (!internal || internal["provider"] !== "PORTONE") throw new Error("ORDER_NOT_FOUND");
  if (userId && internal["user_id"] !== userId) throw new Error("ORDER_FORBIDDEN");
  const remote = await getPortOnePayment(paymentId);
  const total = Number(remote.amount?.total ?? -1);
  const paid = Number(remote.amount?.paid ?? 0);
  const cancelled = Number(remote.amount?.cancelled ?? 0);
  const verified = paymentFactsMatch({
    paymentId,
    internalAmount: Number(internal["amount"]),
    internalOrderName: String(internal["order_name"]),
    internalStoreId: String(internal["portone_store_id"]),
    internalChannelKey: String(internal["portone_channel_key"]),
    remote: {
      status: remote.status,
      id: remote.id,
      total,
      paid,
      currency: remote.currency,
      orderName: remote.orderName,
      storeId: remote.storeId,
      channelKey: remote.channel?.key,
      pgProvider: remote.channel?.pgProvider,
    },
  });
  if (!verified) {
    await db()
      .from("payments")
      .update({
        status: "FAILED",
        failure_code: "PORTONE_VERIFICATION_MISMATCH",
        failure_message: "PortOne 결제 검증 정보가 내부 주문과 일치하지 않습니다.",
        verified_at: new Date().toISOString(),
      })
      .eq("id", internal["id"]);
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
    failure_code: remote.status === "FAILED" ? (remote.code ?? "PORTONE_FAILED") : null,
    failure_message: remote.status === "FAILED" ? (remote.message ?? "결제 실패") : null,
  };
  if (status === "PAID" && remote.paidAt) update["paid_at"] = remote.paidAt;
  if (status === "CANCELLED")
    update["cancelled_at"] = remote.statusChangedAt ?? new Date().toISOString();
  const { error } = await db().from("payments").update(update).eq("id", internal["id"]);
  if (error) throw error;
  return { paymentId, status, portoneStatus: remote.status, amount: Number(internal["amount"]) };
}

export async function cancelPayment(input: { paymentId: string; userId: string; reason: string }) {
  const internal = await internalPayment(input.paymentId);
  if (!internal || internal["user_id"] !== input.userId) throw new Error("ORDER_NOT_FOUND");
  const before = await getPortOnePayment(input.paymentId);
  const total = Number(before.amount?.total ?? -1);
  const cancelled = Number(before.amount?.cancelled ?? 0);
  if (total !== Number(internal["amount"])) throw new Error("PAYMENT_VERIFICATION_MISMATCH");
  const cancellable = total - cancelled;
  if (cancellable <= 0) return synchronizePayment(input.paymentId, input.userId);
  const key = `cancel_${input.paymentId}_${String(internal["id"]).replaceAll("-", "")}`.slice(
    0,
    128,
  );
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
  return synchronizePayment(input.paymentId, input.userId);
}

export async function webhookPaymentId(rawBody: string, headers: Headers) {
  const webhookSecret = process.env["PORTONE_WEBHOOK_SECRET"]?.trim();
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
  if (typeof paymentId !== "string" || !PORTONE_PAYMENT_ID.test(paymentId)) {
    throw new Error("INVALID_WEBHOOK_PAYMENT_ID");
  }
  return paymentId;
}
