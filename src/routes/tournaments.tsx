import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listTournamentFavoriteIds,
  listTournaments,
  toggleTournamentFavorite,
  tournamentKeys,
} from "@/lib/tournaments/api";

const STATUS_FILTERS = [
  ["ALL", "전체"],
  ["REGISTERING", "접수중"],
  ["UPCOMING", "예정"],
  ["ONGOING", "진행중"],
  ["FINISHED", "종료"],
] as const;

const REGIONS = [
  "ALL",
  "서울",
  "경기",
  "인천",
  "강원",
  "충북",
  "충남",
  "대전",
  "세종",
  "전북",
  "전남",
  "광주",
  "경북",
  "경남",
  "대구",
  "부산",
  "울산",
  "제주",
] as const;

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "전국 배드민턴 대회 – 민턴동" },
      {
        name: "description",
        content: "전국과 지역 배드민턴 대회의 일정, 접수 기간, 장소와 참가 정보를 확인하세요.",
      },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number][0]>("ALL");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("ALL");

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [input]);

  const filters = useMemo(() => ({ query, status, region, limit: 200 }), [query, status, region]);
  const tournaments = useQuery({
    queryKey: tournamentKeys.all(filters),
    queryFn: () => listTournaments(filters),
    staleTime: 60_000,
    retry: 0,
    retryDelay: 250,
  });
  const favorites = useQuery({
    queryKey: tournamentKeys.favorites(user?.id ?? null),
    queryFn: () => listTournamentFavoriteIds(user?.id ?? null),
    enabled: !!user,
    staleTime: 30_000,
  });
  const favoriteSet = new Set(favorites.data ?? []);

  const toggle = useMutation({
    mutationFn: toggleTournamentFavorite,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tournamentKeys.favorites(user?.id ?? null) }),
    onError: () => toast.error("관심 대회를 저장하지 못했어요."),
  });

  const onFavorite = (tournamentId: string) => {
    if (!user) {
      void navigate({ to: "/auth", search: { next: `/tournaments/${tournamentId}` } });
      return;
    }
    toggle.mutate({ userId: user.id, tournamentId, favorite: !favoriteSet.has(tournamentId) });
  };

  return (
    <div className="space-y-6">
      <section className="pt-3">
        <h1 className="page-heading">대회</h1>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="대회명, 지역, 경기장 검색"
          aria-label="대회 검색"
          className="h-13 rounded-2xl border-0 bg-secondary pl-10 text-base shadow-none"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2 pb-1">
          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`h-10 rounded-full px-4 text-xs font-bold ${
                status === value ? "bg-foreground text-background" : "bg-secondary text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex h-13 items-center justify-between rounded-2xl bg-secondary px-4 text-base font-bold">
        지역
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value as (typeof REGIONS)[number])}
          className="bg-transparent text-right outline-none"
        >
          {REGIONS.map((value) => (
            <option key={value} value={value}>
              {value === "ALL" ? "전국" : value}
            </option>
          ))}
        </select>
      </label>

      {tournaments.isLoading ? (
        <div className="space-y-3" aria-label="대회 목록을 불러오는 중">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : tournaments.isError ? (
        <section className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-extrabold text-foreground">대회 정보를 불러오지 못했어요</p>
          <p className="mt-1 text-xs text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => void tournaments.refetch()}
            className="mt-3 h-9 rounded-xl bg-secondary px-4 text-xs font-bold"
          >
            다시 시도
          </button>
        </section>
      ) : tournaments.data?.length ? (
        <div className="space-y-3">
          {tournaments.data.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              favorite={favoriteSet.has(tournament.id)}
              onFavorite={() => onFavorite(tournament.id)}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-7 text-center">
          <Trophy className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-extrabold text-foreground">
            조건에 맞는 대회가 없습니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">지역이나 상태 필터를 변경해보세요.</p>
        </section>
      )}
    </div>
  );
}
