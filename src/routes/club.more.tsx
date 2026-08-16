import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/club/more")({
  beforeLoad: () => {
    throw redirect({ to: "/club" });
  },
  component: () => null,
});
