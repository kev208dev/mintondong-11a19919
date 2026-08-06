import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/clubs/find")({
  head: () => ({
    meta: [
      { title: "동호회 찾기 – 민턴동" },
      { name: "description", content: "지역·이름으로 배드민턴 동호회를 검색해요 (준비 중)." },
      { property: "og:title", content: "동호회 찾기 – 민턴동" },
      { property: "og:description", content: "지역·이름으로 배드민턴 동호회 검색." },
    ],
  }),
  component: FindClubPage,
});

function FindClubPage() {
  const [q, setQ] = useState("");

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="동호회 이름 또는 지역 검색"
          className="h-11 rounded-xl pl-9"
        />
      </div>

      <section className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm font-bold text-foreground">공개 동호회 검색 준비 중</p>
        <p className="mt-1 text-xs text-muted-foreground">
          공개 여부·가입 정책 데이터가 아직 없어 검색 결과를 제공할 수 없어요. 현재는 초대 코드로만
          가입할 수 있습니다.
        </p>
        <Link
          to="/club/manage"
          className="mt-3 inline-flex h-9 items-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          초대 코드로 가입하기
        </Link>
      </section>
    </div>
  );
}
