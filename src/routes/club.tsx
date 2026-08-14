import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthenticated } from "@/lib/auth/auth-guard";
import { requiresClubAuthentication } from "@/lib/auth/club-route-access";

export const Route = createFileRoute("/club")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (!requiresClubAuthentication(location.pathname)) return;
    await requireAuthenticated(location);
  },
  component: () => <Outlet />,
});
