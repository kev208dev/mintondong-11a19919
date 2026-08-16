import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clubs/$clubId/lessons")({
  beforeLoad: () => {
    throw redirect({ to: "/guest" });
  },
  component: () => null,
});
