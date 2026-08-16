import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clubs/$clubId/lessons_/$lessonId/checkout")({
  beforeLoad: () => {
    throw redirect({ to: "/guest" });
  },
  component: () => null,
});
