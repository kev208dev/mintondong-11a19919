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
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-3 pt-8 text-center">
        <img src="/mintondong-icon.png" alt="" className="size-16 rounded-[20px]" />
        <h1 className="page-heading">민턴동에 로그인</h1>
        <p className="text-base font-medium text-muted-foreground">
          배드민턴을 더 가볍게 시작하세요.
        </p>
      </header>
      <Outlet />
    </div>
  );
}
