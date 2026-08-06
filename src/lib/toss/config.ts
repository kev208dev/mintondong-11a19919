/**
 * 토스페이먼츠 연동 설정 (테스트 모드 전용)
 *
 * - 클라이언트 키(VITE_TOSS_CLIENT_KEY)는 브라우저 노출이 허용된 값이다.
 * - 시크릿 키(TOSS_SECRET_KEY)는 절대 클라이언트에서 읽지 않는다. 서버 전용.
 * - 이 프로토타입은 test_* 키만 허용한다. live_* 키는 거부한다.
 */

export const TEST_KEY_PREFIX = "test_";
export const LIVE_KEY_PREFIX = "live_";

export type TossReadyState =
  | { ok: true; clientKey: string }
  | { ok: false; reason: "MISSING_CLIENT_KEY" | "LIVE_KEY_BLOCKED" };

export function isTestKey(key: string | undefined | null): boolean {
  return typeof key === "string" && key.startsWith(TEST_KEY_PREFIX);
}

export function isLiveKey(key: string | undefined | null): boolean {
  return typeof key === "string" && key.startsWith(LIVE_KEY_PREFIX);
}

/** 브라우저에서 확인하는 클라이언트 키 상태 */
export function getTossClientState(): TossReadyState {
  const key = import.meta.env["VITE_TOSS_CLIENT_KEY"] as string | undefined;
  if (!key) return { ok: false, reason: "MISSING_CLIENT_KEY" };
  if (!isTestKey(key)) return { ok: false, reason: "LIVE_KEY_BLOCKED" };
  return { ok: true, clientKey: key };
}

export const TOSS_SETUP_MESSAGE: Record<"MISSING_CLIENT_KEY" | "LIVE_KEY_BLOCKED" | "MISSING_SECRET_KEY", string> = {
  MISSING_CLIENT_KEY:
    "토스페이먼츠 테스트 키가 설정되지 않았습니다. VITE_TOSS_CLIENT_KEY를 등록해 주세요. (TOSS_SETUP.md 참고)",
  MISSING_SECRET_KEY:
    "서버 결제 승인 키(TOSS_SECRET_KEY)가 설정되지 않았습니다. TOSS_SETUP.md의 안내대로 등록해 주세요.",
  LIVE_KEY_BLOCKED: "라이브 결제 비활성화 — 이 앱은 test_ 로 시작하는 테스트 키만 허용합니다.",
};

/** 토스 orderId 규격: 6~64자, 영문/숫자/-/_ 만 사용 */
export function makeOrderId(bookingId: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const base = `lesson-${bookingId}-${Date.now().toString(36)}-${rand}`.replace(
    /[^A-Za-z0-9_-]/g,
    "",
  );
  return base.slice(0, 64).padEnd(6, "0");
}

/** 비식별 · 예측 불가능한 customerKey (카드 정보와 무관, 재사용 목적의 로컬 값) */
export function getOrCreateCustomerKey(): string {
  const KEY = "toss-customer-key-v1";
  if (typeof window === "undefined") return "ANONYMOUS";
  try {
    const found = window.localStorage.getItem(KEY);
    if (found) return found;
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const value = `ck_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
    window.localStorage.setItem(KEY, value);
    return value;
  } catch {
    return "ANONYMOUS";
  }
}
