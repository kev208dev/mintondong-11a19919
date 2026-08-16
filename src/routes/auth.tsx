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
    <div className="auth-flow space-y-4">
      <header className="flex flex-col items-center gap-2 pt-3 text-center">
        <img src="/mintondong-icon.png" alt="" className="size-14 rounded-[18px]" />
        <h1 className="page-heading">민턴동에 로그인</h1>
      </header>
      <Outlet />
    </div>
  );
}
