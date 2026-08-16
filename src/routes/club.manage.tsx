import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/club/manage")({
  beforeLoad: () => {
    throw redirect({ to: "/club/finance" });
  },
  component: () => null,
});
