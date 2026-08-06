import { createFileRoute } from "@tanstack/react-router";
import { FinanceSection } from "@/components/app/FinanceSection";

export const Route = createFileRoute("/club/finance")({
  head: () => ({
    meta: [
      { title: "회비 · 재정 – 민턴동 동호회" },
      { name: "description", content: "동호회 월 회비와 수입·지출 내역을 관리해요." },
      { property: "og:title", content: "회비 · 재정 – 민턴동" },
      { property: "og:description", content: "월 회비와 수입·지출 내역 관리." },
    ],
  }),
  component: () => <FinanceSection embedded />,
});
