import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, MapPin, Trophy } from "lucide-react";
import { listTournaments, tournamentKeys } from "@/lib/tournaments/api";
import {
  formatTournamentPeriod,
  getTournamentDDay,
  tournamentStatusLabel,
} from "@/lib/tournaments/format";

const filters = { status: "REGISTERING" as const, limit: 8 };

export function HomeTournamentSection() {
  const tournaments = useQuery({
    queryKey: tournamentKeys.all(filters),
    queryFn: () => listTournaments(filters),
    staleTime: 60_000,
  });
  if (tournaments.isError) return null;

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 className="type-section-title text-foreground">접수 중인 대회</h2>
        <Link to="/tournaments" className="flex items-center text-[11px] font-bold text-primary">
          전체보기 <ChevronRight className="size-3" />
        </Link>
      </div>
      {tournaments.isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
      ) : tournaments.data?.length ? (
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tournaments.data.map((item) => (
            <li key={item.id} className="w-[78%] max-w-[290px] shrink-0">
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId: item.id }}
                className="block h-full rounded-2xl border border-primary/20 bg-card p-4 card-soft active:bg-accent"
              >
                <span className="flex items-center justify-between gap-2 text-[12px] font-bold text-primary">
                  <span>
                    {item.region ?? "전국"} · {tournamentStatusLabel(item.status)}
                  </span>
                  <span className="rounded-full bg-brand-soft px-2 py-1 text-[11px] text-brand-deep">
                    {getTournamentDDay(item.startDate, item.endDate)}
                  </span>
                </span>
                <span className="mt-3 block break-keep text-[17px] font-bold leading-6 text-foreground">
                  {item.title}
                </span>
                <span className="mt-3 grid gap-1 text-[13px] leading-5 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 shrink-0 text-primary" />
                    {formatTournamentPeriod(item.startDate, item.endDate)}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <MapPin className="size-3.5 shrink-0 text-primary" />
                    {item.venue ?? item.city ?? "장소 정보 확인"}
                  </span>
                </span>
                <span className="mt-4 flex items-center justify-end text-[12px] font-bold text-primary">
                  자세히 보기 <ChevronRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Link
          to="/tournaments"
          className="block rounded-2xl border border-border bg-card p-4 text-center"
        >
          <Trophy className="mx-auto size-4 text-muted-foreground" />
          <p className="mt-1.5 text-xs font-bold text-foreground">등록된 접수 중 대회가 없어요</p>
          <p className="mt-1 text-[11px] text-muted-foreground">전체 대회 일정을 확인해 보세요.</p>
        </Link>
      )}
    </section>
  );
}
