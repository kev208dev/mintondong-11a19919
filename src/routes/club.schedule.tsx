import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/club/schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/club/attendance", search: { date: undefined } });
  },
  head: () => ({
    meta: [
      { title: "동호회 출석 – 민턴동" },
      { name: "description", content: "동호회 출석을 확인해요." },
      { property: "og:title", content: "동호회 출석 – 민턴동" },
      { property: "og:description", content: "동호회 출석 확인." },
    ],
  }),
  component: () => null,
});
