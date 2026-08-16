import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/club/notices")({
  head: () => ({
    meta: [
      { title: "동호회 공지 – 민턴동" },
      { name: "description", content: "동호회 공지사항을 확인해요." },
      { property: "og:title", content: "동호회 공지 – 민턴동" },
      { property: "og:description", content: "동호회 공지사항." },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  return (
    <div className="space-y-3">
      <section className="rounded-3xl bg-muted/30 p-6 text-center">
        <Megaphone className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">등록된 공지가 없어요</p>
      </section>
    </div>
  );
}
