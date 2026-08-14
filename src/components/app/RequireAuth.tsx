// 이 경로를 사용 중인 기존 route들의 호환성을 유지한다.
// eslint-disable-next-line react-refresh/only-export-components
export { authGuard } from "@/lib/auth/auth-guard";

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
