// 서버 전용 헬퍼 — 브라우저 번들에 포함되지 않는다 (*.server.ts).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  EXTERNAL_SUPABASE_URL,
} from "@/integrations/supabase/client";

function supabaseUrl(): string {
  return process.env["SUPABASE_URL"] || EXTERNAL_SUPABASE_URL;
}

function publishableKey(): string {
  return (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    EXTERNAL_SUPABASE_PUBLISHABLE_KEY
  );
}

function opaqueKeyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** service_role 클라이언트 — 절대 클라이언트로 반환/노출하지 않는다. */
export function adminClient(): SupabaseClient {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) {
    throw new Error("missing_service_role_key");
  }
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: opaqueKeyFetch(key) },
  });
}

/** 세션 발급용 publishable 클라이언트 (요청마다 새로 만든다) */
export function anonAuthClient(): SupabaseClient {
  const key = publishableKey();
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: opaqueKeyFetch(key) },
  });
}

// ---------------------------------------------------------------------------
// 아주 단순한 in-memory rate limit (brute force 완화). 워커 인스턴스 단위.
// ---------------------------------------------------------------------------
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const found = buckets.get(key);
  if (!found || found.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (found.count >= limit) return false;
  found.count += 1;
  return true;
}

export function clientKey(headers: Headers, suffix: string): string {
  const ip =
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `${ip}:${suffix}`;
}
