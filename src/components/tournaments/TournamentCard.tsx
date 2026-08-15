import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import {
  getTournamentDDay,
  registrationDeadlineLabel,
  tournamentStatusLabel,
  formatTournamentPeriod,
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
  const dday = getTournamentDDay(tournament.startDate, tournament.endDate);
  const deadline = registrationDeadlineLabel(tournament.registrationEndDate);
  const status = tournamentStatusLabel(tournament.status);
  const badge =
    dday === "종료"
      ? "bg-secondary text-muted-foreground"
      : dday === "진행중" || dday === "D-DAY"
        ? "bg-brand-green text-foreground"
        : Number(dday.slice(2)) <= 3
          ? "bg-brand-lime text-foreground"
          : "bg-brand-wash text-brand-deep";

  return (
    <article className="surface-card relative p-5">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/tournaments/$tournamentId"
          params={{ tournamentId: tournament.id }}
          className="min-w-0 flex-1"
        >
          <p className="text-sm font-bold text-muted-foreground">
            {tournament.region ?? "전국"} · {status}
          </p>
          <h2 className="mt-2 break-keep text-lg font-extrabold leading-7 text-foreground">
            {tournament.title}
          </h2>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${badge}`}>{dday}</span>
          <button
            type="button"
            aria-label={favorite ? "관심 대회 취소" : "관심 대회 저장"}
            aria-pressed={favorite}
            onClick={onFavorite}
            className="grid size-10 place-items-center rounded-full bg-secondary active:scale-95"
          >
            <Heart
              className={`size-5 ${favorite ? "fill-brand-green text-brand-green" : "text-muted-foreground"}`}
            />
          </button>
        </div>
      </div>
      <Link
        to="/tournaments/$tournamentId"
        params={{ tournamentId: tournament.id }}
        className="mt-4 block space-y-1 text-sm font-medium text-muted-foreground"
      >
        <p>
          {formatTournamentPeriod(tournament.startDate, tournament.endDate)} ·{" "}
          {tournament.venue ?? tournament.city ?? "장소 확인"}
        </p>
        {tournament.entryFeeWon ? (
          <p className="flex items-center justify-between pt-2">
            <span>참가비</span>
            <strong className="price-text text-lg">
              {tournament.entryFeeWon.toLocaleString()}원
            </strong>
          </p>
        ) : null}
      </Link>
      {deadline ? (
        <p className="mt-4 border-t border-border pt-3 text-sm font-bold text-brand-green">
          {deadline}
        </p>
      ) : null}
    </article>
  );
}
