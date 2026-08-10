import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** 로그인이 필요한 화면 공통 옵션. 비로그인 시 /auth?next=현재경로 로 보낸다. */
export function authGuard() {
  return {
    ssr: false as const,
    beforeLoad: async ({ location }: { location: { href: string } }) => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) return;
      } catch {
        // Supabase 를 사용할 수 없으면 로그인 화면으로 안내한다.
      }
      const next = location.href.startsWith("/auth") ? "/" : location.href;
      throw redirect({ to: "/auth", search: { next }, replace: true });
    },
  };
}

/** 권한이 없을 때 보여줄 안내 (관리 화면 등) */
export function NoPermission({ message }: { message?: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-sm font-bold text-foreground">접근 권한이 없어요</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {message ?? "동호회 운영진에게 권한을 요청해 주세요."}
      </p>
    </section>
  );
}
