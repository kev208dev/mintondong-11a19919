import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { clubKeys, getClub, getMyMembership, listClubMembers } from "@/lib/clubs/api";

export const Route = createFileRoute("/clubs/$clubId/")({
  component: ClubDetailHome,
});

function ClubDetailHome() {
  const { clubId } = Route.useParams();
  const { user } = useAuth();
  const club = useQuery({ queryKey: clubKeys.detail(clubId), queryFn: () => getClub(clubId) });
  const membership = useQuery({
    queryKey: clubKeys.membership(clubId, user?.id ?? null),
    queryFn: () => getMyMembership(clubId, user?.id ?? null),
    enabled: !!user,
  });
  const canSeeMembers = membership.data?.status === "active";
  const members = useQuery({
    queryKey: clubKeys.members(clubId),
    queryFn: () => listClubMembers(clubId),
    enabled: canSeeMembers,
  });

  const active = (members.data ?? []).filter((m) => m.status === "active");

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-secondary px-3 py-2.5">
          <dt className="text-[10.5px] font-semibold text-muted-foreground">멤버</dt>
          <dd className="text-base font-extrabold tabular-nums text-secondary-foreground">
            {club.data?.member_count ?? 0}
          </dd>
        </div>
        <div className="rounded-2xl bg-secondary px-3 py-2.5">
          <dt className="text-[10.5px] font-semibold text-muted-foreground">개설일</dt>
          <dd className="text-base font-extrabold text-secondary-foreground">
            {club.data ? new Date(club.data.created_at).toLocaleDateString("ko-KR") : "-"}
          </dd>
        </div>
      </dl>

      <section>
        <h2 className="text-[13px] font-extrabold text-foreground">다가오는 일정</h2>
        <div className="mt-1.5 rounded-2xl bg-secondary/60 p-5 text-center">
          <CalendarDays className="mx-auto size-4 text-muted-foreground" />
          <p className="mt-1.5 text-xs text-muted-foreground">등록된 일정이 없어요.</p>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-extrabold text-foreground">최근 가입 멤버</h2>
        {!canSeeMembers ? (
          <div className="mt-1.5 rounded-2xl bg-secondary/60 p-5 text-center">
            <Users className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              멤버 정보는 가입한 클럽 회원에게만 공개돼요.
            </p>
          </div>
        ) : active.length === 0 ? (
          <div className="mt-1.5 rounded-2xl bg-secondary/60 p-5 text-center">
            <Users className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1.5 text-xs text-muted-foreground">아직 멤버가 없어요.</p>
          </div>
        ) : (
          <ul className="mt-1.5 divide-y divide-border">
            {active
              .slice(-5)
              .reverse()
              .map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                    {m.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                    {m.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {m.role === "owner" ? "운영자" : m.role === "admin" ? "관리자" : "멤버"}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
