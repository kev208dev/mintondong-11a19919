import { createFileRoute, Outlet } from "@tanstack/react-router";
import { authGuard } from "@/components/app/RequireAuth";

export const Route = createFileRoute("/club")({
  ...authGuard(),
  component: () => <Outlet />,
});
