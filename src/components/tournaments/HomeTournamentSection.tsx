import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import { listTournaments, tournamentKeys } from "@/lib/tournaments/api";
import { formatTournamentPeriod } from "@/lib/tournaments/format";

const filters = { status: "REGISTERING" as const, limit: 3 };

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
        <h2 className="text-[13px] font-extrabold text-foreground">접수 중인 대회</h2>
        <Link to="/tournaments" className="flex items-center text-[11px] font-bold text-primary">
          전체보기 <ChevronRight className="size-3" />
        </Link>
      </div>
      {tournaments.isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
      ) : tournaments.data?.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {tournaments.data.map((item) => (
            <li key={item.id}>
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId: item.id }}
                className="flex items-center gap-2.5 px-3.5 py-3 active:bg-accent"
              >
                <Trophy className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <CalendarDays className="size-3" />{" "}
                    {formatTournamentPeriod(item.startDate, item.endDate)}
                    {item.region ? ` · ${item.region}` : ""}
                  </span>
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
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
