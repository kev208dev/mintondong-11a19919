import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : undefined,
  }),
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="space-y-3">
      <header className="flex flex-col items-center gap-1.5 text-center">
        <img src="/mintondong-icon.png" alt="" className="size-12 rounded-2xl" />
        <h1 className="text-[17px] font-extrabold text-foreground">민턴동에 로그인</h1>
        <p className="text-xs text-muted-foreground">
          동호회 출석·경기 기록을 여러 기기에서 이어서 사용할 수 있어요.
        </p>
      </header>
      <Outlet />
    </div>
  );
}
