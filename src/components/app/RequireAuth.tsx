import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

/** 로그인이 필요한 화면 보호막. 비로그인 시 /auth?next=현재경로 로 보낸다. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const href = useRouterState({ select: (s) => s.location.href });
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { next: href }, replace: true });
    }
  }, [loading, user, href, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
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
