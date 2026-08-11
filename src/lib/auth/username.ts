/** 로그인 아이디(username) 규칙 — 서버/클라이언트 공용 */

export const USERNAME_MIN = 4;
export const USERNAME_MAX = 20;

const RESERVED = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "mintondong",
  "support",
  "help",
  "api",
]);

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** 문제가 없으면 null, 있으면 사용자용 한국어 메시지 */
export function validateUsername(raw: string): string | null {
  const v = normalizeUsername(raw);
  if (!v) return "아이디를 입력해 주세요.";
  if (v.length < USERNAME_MIN || v.length > USERNAME_MAX)
    return `아이디는 ${USERNAME_MIN}~${USERNAME_MAX}자로 입력해 주세요.`;
  if (!/^[a-z0-9_]+$/.test(v)) return "아이디는 영문 소문자, 숫자, _ 만 사용할 수 있어요.";
  if (RESERVED.has(v)) return "이미 사용 중이거나 사용할 수 없는 아이디예요.";
  return null;
}

const WEAK = [
  "password",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "11111111",
  "00000000",
  "iloveyou",
  "mintondong",
  "badminton",
];

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상으로 만들어 주세요.";
  const lower = password.toLowerCase();
  if (WEAK.includes(lower)) return "너무 쉬운 비밀번호예요. 다른 비밀번호를 사용해 주세요.";
  if (/^(.)\1+$/.test(password)) return "같은 문자만으로는 만들 수 없어요.";
  if (/^\d+$/.test(password)) return "숫자만으로는 만들 수 없어요. 영문을 섞어 주세요.";
  return null;
}

export function validateDisplayName(name: string): string | null {
  const v = name.trim();
  if (v.length < 2 || v.length > 20) return "닉네임은 2~20자로 입력해 주세요.";
  return null;
}

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "이메일 형식을 확인해 주세요.";
  return null;
}

/** next 는 내부 상대 경로만 허용 (open redirect 방지) */
export function safeNextPath(next?: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/auth") || next.startsWith("/onboarding")) return "/";
  return next;
}
