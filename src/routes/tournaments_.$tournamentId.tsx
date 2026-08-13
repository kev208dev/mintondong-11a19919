import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ExternalLink,
  Heart,
  MapPin,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listTournamentFavoriteIds,
  loadTournament,
  toggleTournamentFavorite,
  tournamentKeys,
} from "@/lib/tournaments/api";
import {
  formatKoreanDate,
  formatTournamentPeriod,
  formatWon,
  tournamentStatusLabel,
} from "@/lib/tournaments/format";

export const Route = createFileRoute("/tournaments_/$tournamentId")({
  head: () => ({
    meta: [
      { title: "배드민턴 대회 상세 – 민턴동" },
      {
        name: "description",
        content: "배드민턴 대회 일정, 장소, 참가비와 접수 링크를 확인하세요.",
      },
    ],
  }),
  component: TournamentDetailPage,
});

function sourceLabel(source: string) {
  return (
    {
      FACECOCK: "Facecock",
      COURTX: "CourtX",
      BKPLAY: "BKPLAY",
      KOC: "스포츠지원포털",
      MANUAL: "민턴동 등록",
    }[source] ?? source
  );
}

function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function TournamentDetailPage() {
  const { tournamentId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tournament = useQuery({
    queryKey: tournamentKeys.detail(tournamentId),
    queryFn: () => loadTournament(tournamentId),
    staleTime: 60_000,
  });
  const favorites = useQuery({
    queryKey: tournamentKeys.favorites(user?.id ?? null),
    queryFn: () => listTournamentFavoriteIds(user?.id ?? null),
    enabled: !!user,
  });
  const isFavorite = favorites.data?.includes(tournamentId) ?? false;
  const toggle = useMutation({
    mutationFn: toggleTournamentFavorite,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tournamentKeys.favorites(user?.id ?? null) }),
    onError: () => toast.error("관심 대회를 저장하지 못했어요."),
  });

  if (tournament.isLoading) return <Skeleton className="h-[32rem] rounded-2xl" />;
  if (tournament.isError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-7 text-center">
        <p className="text-sm font-extrabold">대회 정보를 불러오지 못했어요</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void tournament.refetch()}
        >
          다시 시도
        </Button>
      </div>
    );
  }
  const item = tournament.data;
  if (!item) {
    return (
      <div className="py-16 text-center">
        <Trophy className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-extrabold">대회를 찾을 수 없어요</p>
        <Link to="/tournaments" className="mt-3 inline-block text-xs font-bold text-primary">
          대회 목록으로
        </Link>
      </div>
    );
  }

  const registrationUrl =
    safeUrl(item.registrationUrl) ??
    item.sources.map((s) => safeUrl(s.registrationUrl)).find(Boolean) ??
    null;
  const homepageUrl = item.sources.map((s) => safeUrl(s.sourceUrl)).find(Boolean) ?? null;
  const bracketUrl =
    safeUrl(item.bracketUrl) ??
    item.sources.map((s) => safeUrl(s.bracketUrl)).find(Boolean) ??
    null;
  const resultUrl =
    safeUrl(item.resultUrl) ?? item.sources.map((s) => safeUrl(s.resultUrl)).find(Boolean) ?? null;
  const posterUrl = safeUrl(item.posterUrl);
  const detailRows = [
    ["대회 기간", formatTournamentPeriod(item.startDate, item.endDate), CalendarDays],
    [
      "접수 기간",
      item.registrationStartDate && item.registrationEndDate
        ? `${formatKoreanDate(item.registrationStartDate)} ~ ${formatKoreanDate(item.registrationEndDate)}`
        : "원본 사이트 확인",
      CalendarDays,
    ],
    ["지역", [item.region, item.city].filter(Boolean).join(" ") || "정보 없음", MapPin],
    ["경기장", item.venue ?? "정보 없음", Trophy],
    ["주소", item.venueAddress ?? "정보 없음", MapPin],
    ["주최", item.organizer ?? "정보 없음", Users],
    ["주관", item.host ?? "정보 없음", Users],
    ["참가비", formatWon(item.entryFeeWon), WalletCards],
  ] as const;

  return (
    <div className="space-y-4">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={`${item.title} 포스터`}
          className="max-h-72 w-full rounded-2xl bg-secondary object-contain"
        />
      ) : null}
      <section className="rounded-2xl border border-border bg-card p-4 card-soft">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {item.scope === "NATIONAL" ? "전국대회" : "지역대회"}
              </Badge>
              <Badge className="text-[10px]">{tournamentStatusLabel(item.status)}</Badge>
            </div>
            <h2 className="break-keep text-lg font-extrabold leading-7 text-foreground">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            aria-pressed={isFavorite}
            onClick={() => {
              if (!user) {
                void navigate({ to: "/auth", search: { next: `/tournaments/${tournamentId}` } });
                return;
              }
              toggle.mutate({ userId: user.id, tournamentId, favorite: !isFavorite });
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"
          >
            <Heart
              className={`size-5 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </button>
        </div>

        <dl className="mt-4 divide-y divide-border border-t border-border">
          {detailRows.map(([label, value, Icon]) => (
            <div key={label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 py-2.5 text-xs">
              <dt className="flex items-center gap-1.5 font-bold text-muted-foreground">
                <Icon className="size-3.5" /> {label}
              </dt>
              <dd className="min-w-0 break-words font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {item.description ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-extrabold">대회 설명</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
            {item.description}
          </p>
        </section>
      ) : null}

      <section className="grid gap-2">
        {registrationUrl ? (
          <ExternalButton href={registrationUrl} primary label="참가 신청하기" />
        ) : null}
        {homepageUrl ? <ExternalButton href={homepageUrl} label="대회 홈페이지" /> : null}
        {bracketUrl ? <ExternalButton href={bracketUrl} label="대진표 보기" /> : null}
        {resultUrl ? <ExternalButton href={resultUrl} label="경기 결과 보기" /> : null}
      </section>

      <section className="rounded-2xl bg-secondary/60 p-3.5 text-[10.5px] leading-5 text-muted-foreground">
        <p className="font-bold text-foreground">대회 정보 출처</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {item.sources.map((source) => {
            const sourceUrl = safeUrl(source.sourceUrl);
            return sourceUrl ? (
              <a
                key={`${source.source}-${source.sourceUrl}`}
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-primary"
              >
                {sourceLabel(source.source)} <ExternalLink className="inline size-3" />
              </a>
            ) : (
              <span key={`${source.source}-internal`} className="font-bold text-foreground">
                {sourceLabel(source.source)}
              </span>
            );
          })}
        </div>
        <p className="mt-1">
          {item.sources.every((source) => source.source === "MANUAL")
            ? "운영자가 등록한 정보입니다. 참가 신청 전 주최 측의 최신 안내를 확인해 주세요."
            : "민턴동이 주최하는 대회가 아니며, 신청 전 원본 사이트의 최신 정보를 확인해 주세요."}
        </p>
      </section>
    </div>
  );
}

function ExternalButton({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex h-11 items-center justify-center rounded-xl text-xs font-extrabold ${
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground"
      }`}
    >
      {label} <ExternalLink className="ml-1.5 size-3.5" />
    </a>
  );
}
