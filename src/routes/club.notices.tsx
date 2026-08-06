import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/club/notices")({
  head: () => ({
    meta: [
      { title: "동호회 공지 – 민턴동" },
      { name: "description", content: "동호회 공지사항 화면 (준비 중)." },
      { property: "og:title", content: "동호회 공지 – 민턴동" },
      { property: "og:description", content: "동호회 공지사항." },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-dashed border-border p-6 text-center">
        <Megaphone className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">등록된 공지가 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          공지 작성·고정 기능은 준비 중이에요. 지금은 동호회 관리에서 기본 정보를 안내할 수 있어요.
        </p>
        <Link
          to="/club/manage"
          className="mt-3 inline-flex h-9 items-center rounded-xl bg-secondary px-4 text-xs font-bold text-secondary-foreground"
        >
          동호회 관리로 가기
        </Link>
      </section>
    </div>
  );
}
