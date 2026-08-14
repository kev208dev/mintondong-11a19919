import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AuthGuardLocation = { href: string };

export async function requireAuthenticated(location: AuthGuardLocation) {
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) return;
  } catch {
    // Supabase 를 사용할 수 없으면 로그인 화면으로 안내한다.
  }
  const next = location.href.startsWith("/auth") ? "/" : location.href;
  throw redirect({ to: "/auth", search: { next }, replace: true });
}

/** 로그인이 필요한 화면 공통 옵션. 비로그인 시 /auth?next=현재경로 로 보낸다. */
export function authGuard() {
  return {
    ssr: false as const,
    beforeLoad: ({ location }: { location: AuthGuardLocation }) => requireAuthenticated(location),
  };
}
