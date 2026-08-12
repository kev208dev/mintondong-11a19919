import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, MapPin, Search, Users } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { clubKeys, searchPublicClubs, type ClubRow } from "@/lib/clubs/api";

export const Route = createFileRoute("/clubs/find")({
  head: () => ({
    meta: [
      { title: "동호회 찾기 – 민턴동" },
      { name: "description", content: "지역·이름으로 공개 배드민턴 동호회를 검색해요." },
      { property: "og:title", content: "동호회 찾기 – 민턴동" },
      { property: "og:description", content: "공개 배드민턴 동호회 검색." },
    ],
  }),
  component: FindClubPage,
});

export function ClubAvatar({ club, size = 44 }: { club: ClubRow; size?: number }) {
  return club.profile_image_url ? (
    <img
      src={club.profile_image_url}
      alt={`${club.name} 프로필 이미지`}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-xl object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-secondary text-sm font-extrabold text-secondary-foreground"
      style={{ width: size, height: size }}
    >
      {club.name.slice(0, 1)}
    </span>
  );
}

function FindClubPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: clubKeys.search(q.trim()),
    queryFn: () => searchPublicClubs(q),
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="동호회 이름 검색"
          className="h-11 rounded-xl pl-9"
        />
      </div>

      <Link
        to="/clubs/new"
        className="flex h-10 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground"
      >
        + 동호회 만들기
      </Link>

      {isLoading ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </ul>
      ) : error ? (
        <p className="px-1 py-6 text-center text-xs text-muted-foreground">
          동호회 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="px-1 py-8 text-center text-xs text-muted-foreground">
          {q.trim() ? "검색 결과가 없어요." : "아직 공개된 동호회가 없어요."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data!.map((club) => (
            <li key={club.id} className="flex min-w-0 items-center gap-2 py-3">
              <Link
                to="/clubs/$clubId"
                params={{ clubId: club.id }}
                className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
              >
                <ClubAvatar club={club} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {club.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{club.region ?? "지역 미등록"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Users className="size-3" />
                      {club.member_count}
                    </span>
                  </span>
                </span>
              </Link>
              <Link
                to="/clubs/$clubId/lessons"
                params={{ clubId: club.id }}
                aria-label={`${club.name} 공개 레슨 보기`}
                className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-secondary px-2.5 text-[10px] font-bold text-secondary-foreground active:bg-accent"
              >
                <GraduationCap className="size-3.5" /> 레슨
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
