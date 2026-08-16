import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clubs/$clubId/schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/club/attendance", search: { date: undefined } });
  },
  component: () => null,
});
