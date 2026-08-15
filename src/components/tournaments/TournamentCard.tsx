import { Link } from "@tanstack/react-router";
import { CalendarDays, Heart, MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatTournamentPeriod,
  getTournamentDDay,
  registrationDeadlineLabel,
  tournamentStatusLabel,
} from "@/lib/tournaments/format";
import type { Tournament } from "@/lib/tournaments/types";

export function TournamentCard({
  tournament,
  favorite,
  onFavorite,
}: {
  tournament: Tournament;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const deadline = registrationDeadlineLabel(tournament.registrationEndDate);
  const dday = getTournamentDDay(tournament.startDate, tournament.endDate);
  const ddayTone =
    dday === "종료"
      ? "bg-muted text-muted-foreground"
      : dday === "진행중" || dday === "D-DAY"
        ? "bg-primary text-primary-foreground"
        : Number(dday.slice(2)) <= 3
          ? "bg-brand-lime text-ink"
          : "bg-brand-soft text-brand-deep";
  const statusTone =
    tournament.status === "REGISTERING"
      ? "bg-primary/10 text-primary"
      : tournament.status === "ONGOING"
        ? "bg-destructive/10 text-destructive"
        : "bg-secondary text-secondary-foreground";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 card-soft">
      <div className="flex items-start gap-3">
        <Link
          to="/tournaments/$tournamentId"
          params={{ tournamentId: tournament.id }}
          className="min-w-0 flex-1"
        >
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {tournament.scope === "NATIONAL" ? "전국대회" : "지역대회"}
            </Badge>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${statusTone}`}>
              {tournamentStatusLabel(tournament.status)}
            </span>
          </div>
          <h2 className="break-keep pr-1 text-[17px] font-bold leading-6 text-foreground">
            {tournament.title}
          </h2>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${ddayTone}`}>{dday}</span>
          <button
            type="button"
            aria-label={favorite ? "관심 대회 취소" : "관심 대회 저장"}
            aria-pressed={favorite}
            onClick={onFavorite}
            className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground active:scale-95"
          >
            <Heart className={`size-4 ${favorite ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
      </div>

      <Link
        to="/tournaments/$tournamentId"
        params={{ tournamentId: tournament.id }}
        className="mt-3 grid gap-1.5 text-[13px] leading-5 text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0 text-primary" />
          {formatTournamentPeriod(tournament.startDate, tournament.endDate)}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {[tournament.region, tournament.city].filter(Boolean).join(" ") || "지역 정보 없음"}
          </span>
        </span>
        {tournament.venue ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Trophy className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{tournament.venue}</span>
          </span>
        ) : null}
      </Link>

      {deadline ? (
        <p className="mt-3 border-t border-border pt-2 text-[11px] font-extrabold text-primary">
          {deadline}
        </p>
      ) : null}
    </article>
  );
}
