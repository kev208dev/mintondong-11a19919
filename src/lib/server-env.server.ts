import { env as cloudflareEnv } from "cloudflare:workers";

/**
 * Cloudflare Workers에서는 런타임 binding을 우선 읽고,
 * 로컬/Node 환경에서는 process.env로 fallback한다.
 * 이 파일은 서버 전용으로만 import한다.
 */
export function serverEnv(name: string): string | undefined {
  const binding = cloudflareEnv[name];
  if (typeof binding === "string" && binding.trim()) return binding.trim();

  return process.env[name]?.trim() || undefined;
}

export function requireServerEnv(name: string): string {
  const value = serverEnv(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}
