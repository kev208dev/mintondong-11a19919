/**
 * 서버 전용 토스페이먼츠 헬퍼 (테스트 모드 전용)
 *
 * ⚠️ 이 파일은 *.server.ts 이므로 클라이언트 번들에 포함되지 않는다.
 *    TOSS_SECRET_KEY는 오직 여기서만 읽고, 응답으로 절대 반환하지 않는다.
 *
 * NOTE(프로덕션 경계): 지금은 주문/예약이 브라우저 localStorage에 있으므로
 * 주문 무결성을 HMAC 서명 토큰으로 보장한다. 실제 서비스에서는 주문·예약을
 * 서버 DB에 저장하고 DB를 유일한 진실의 원천(source of truth)으로 삼아
 * orderId → 금액/상태를 조회해 검증하고, webhook으로 상태를 동기화해야 한다.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { isTestKey, LIVE_KEY_PREFIX } from "./config";

const TOSS_API = "https://api.tosspayments.com/v1/payments";
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30분

export interface OrderClaims {
  orderId: string;
  bookingId: string;
  clubId: string;
  amount: number;
  exp: number;
}

function signingSecret(): string {
  const s = process.env["ORDER_SIGNING_SECRET"];
  if (!s) throw new Error("ORDER_SIGNING_SECRET_MISSING");
  return s;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 결제 전에 서버가 발급하는 주문 무결성 토큰 (orderId/금액/예약/만료 포함) */
export function signOrderToken(claims: Omit<OrderClaims, "exp">): string {
  const payload: OrderClaims = { ...claims, exp: Date.now() + TOKEN_TTL_MS };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", signingSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyOrderToken(token: string): OrderClaims {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("ORDER_TOKEN_MALFORMED");
  const expected = b64url(createHmac("sha256", signingSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("ORDER_TOKEN_INVALID");
  const claims = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as OrderClaims;
  if (claims.exp < Date.now()) throw new Error("ORDER_TOKEN_EXPIRED");
  return claims;
}

export function readSecretKey(): { ok: true; key: string } | { ok: false; reason: "MISSING_SECRET_KEY" | "LIVE_KEY_BLOCKED" } {
  const key = process.env["TOSS_SECRET_KEY"];
  if (!key) return { ok: false, reason: "MISSING_SECRET_KEY" };
  if (key.startsWith(LIVE_KEY_PREFIX) || !isTestKey(key)) {
    return { ok: false, reason: "LIVE_KEY_BLOCKED" };
  }
  return { ok: true, key };
}

/** Basic base64(`${secretKey}:`) — 토스 공식 인증 방식 */
function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export interface TossSafePayment {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string | null;
  totalAmount: number;
  approvedAt: string | null;
  receiptUrl: string | null;
}

/** 응답에서 재정산/취소에 필요한 안전한 필드만 추린다 (카드 자격정보 저장 금지) */
function pickSafe(json: Record<string, unknown>): TossSafePayment {
  const receipt = json["receipt"] as { url?: string } | undefined;
  return {
    paymentKey: String(json["paymentKey"] ?? ""),
    orderId: String(json["orderId"] ?? ""),
    status: String(json["status"] ?? ""),
    method: (json["method"] as string | undefined) ?? null,
    totalAmount: Number(json["totalAmount"] ?? 0),
    approvedAt: (json["approvedAt"] as string | undefined) ?? null,
    receiptUrl: receipt?.url ?? null,
  };
}

export async function tossConfirm(args: {
  secretKey: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ ok: true; payment: TossSafePayment } | { ok: false; code: string; message: string }> {
  const res = await fetch(`${TOSS_API}/confirm`, {
    method: "POST",
    headers: { Authorization: authHeader(args.secretKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentKey: args.paymentKey,
      orderId: args.orderId,
      amount: args.amount,
    }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      code: String(json["code"] ?? `HTTP_${res.status}`),
      message: String(json["message"] ?? "결제 승인에 실패했습니다."),
    };
  }
  return { ok: true, payment: pickSafe(json) };
}

export async function tossCancel(args: {
  secretKey: string;
  paymentKey: string;
  cancelReason: string;
}): Promise<{ ok: true; payment: TossSafePayment } | { ok: false; code: string; message: string }> {
  const res = await fetch(`${TOSS_API}/${encodeURIComponent(args.paymentKey)}/cancel`, {
    method: "POST",
    headers: { Authorization: authHeader(args.secretKey), "Content-Type": "application/json" },
    body: JSON.stringify({ cancelReason: args.cancelReason }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      code: String(json["code"] ?? `HTTP_${res.status}`),
      message: String(json["message"] ?? "결제 취소에 실패했습니다."),
    };
  }
  return { ok: true, payment: pickSafe(json) };
}
