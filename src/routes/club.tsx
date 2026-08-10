import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/app/RequireAuth";

export const Route = createFileRoute("/club")({
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
});
