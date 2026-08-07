import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { clubKeys, listClubMembers } from "@/lib/clubs/api";

export const Route = createFileRoute("/clubs/$clubId/members")({
  component: ClubDetailMembers,
});

const ROLE_LABEL: Record<string, string> = {
  owner: "운영자",
  admin: "관리자",
  member: "멤버",
};

function ClubDetailMembers() {
  const { clubId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: clubKeys.members(clubId),
    queryFn: () => listClubMembers(clubId),
  });

  if (isLoading) {
    return (
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-14 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </ul>
    );
  }

  const members = data ?? [];
  if (members.length === 0) {
    return (
      <div className="rounded-2xl bg-secondary/60 p-8 text-center">
        <Users className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">멤버가 없어요</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
            {m.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-foreground">{m.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {ROLE_LABEL[m.role] ?? "멤버"}
              {m.status === "pending" ? " · 승인 대기" : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
