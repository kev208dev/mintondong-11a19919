import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/club/manage_/lessons")({
  beforeLoad: () => {
    throw redirect({ to: "/club" });
  },
  component: () => null,
});
