import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  clubKeys,
  getMyMembership,
  listClubJoinRequests,
  listClubMembers,
  reviewClubJoinRequest,
} from "@/lib/clubs/api";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const membership = useQuery({
    queryKey: clubKeys.membership(clubId, user?.id ?? null),
    queryFn: () => getMyMembership(clubId, user?.id ?? null),
    enabled: !!user,
  });
  const canSeeMembers = membership.data?.status === "active";
  const { data, isLoading } = useQuery({
    queryKey: clubKeys.members(clubId, user?.id ?? null),
    queryFn: () => listClubMembers(clubId, user?.id ?? null),
    enabled: canSeeMembers,
  });
  const requests = useQuery({
    queryKey: clubKeys.joinRequests(clubId),
    queryFn: () => listClubJoinRequests(clubId),
    enabled: canSeeMembers,
    retry: 0,
  });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      reviewClubJoinRequest(id, decision),
    onSuccess: async (_request, variables) => {
      await queryClient.invalidateQueries({ queryKey: clubKeys.joinRequests(clubId) });
      await queryClient.invalidateQueries({ queryKey: clubKeys.members(clubId, user?.id ?? null) });
      toast.success(
        variables.decision === "approved" ? "가입을 승인했어요." : "가입 신청을 거절했어요.",
      );
    },
    onError: () => toast.error("가입 신청을 처리하지 못했어요."),
  });

  if (membership.isLoading || (canSeeMembers && isLoading)) {
    return (
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-14 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </ul>
    );
  }

  if (!canSeeMembers) {
    return (
      <div className="rounded-2xl bg-secondary/60 p-8 text-center">
        <Lock className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">멤버 정보는 비공개예요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          가입이 완료된 클럽 회원만 멤버 명단을 확인할 수 있어요.
        </p>
      </div>
    );
  }

  const members = data ?? [];

  return (
    <div className="space-y-5">
      {requests.data && requests.data.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-foreground">가입 신청</h2>
            <span className="text-xs font-bold text-primary">{requests.data.length}</span>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
            {requests.data.map((request) => {
              const name = request.display_name || request.username || "새 회원";
              return (
                <li key={request.id} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                      {name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      {request.message ? (
                        <p className="mt-2 text-sm leading-5 text-muted-foreground">
                          “{request.message}”
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={review.isPending}
                      onClick={() => {
                        if (window.confirm(`${name} 님의 가입 신청을 거절할까요?`))
                          review.mutate({ id: request.id, decision: "rejected" });
                      }}
                      className="h-10 rounded-xl bg-secondary text-xs font-bold text-muted-foreground disabled:opacity-50"
                    >
                      거절
                    </button>
                    <button
                      type="button"
                      disabled={review.isPending}
                      onClick={() => {
                        if (window.confirm(`${name} 님의 가입을 승인할까요?`))
                          review.mutate({ id: request.id, decision: "approved" });
                      }}
                      className="h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      승인
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : requests.isError ? null : null}

      <section>
        <h2 className="mb-2 text-sm font-extrabold text-foreground">멤버 {members.length}명</h2>
        {members.length === 0 ? (
          <div className="rounded-2xl bg-secondary/60 p-8 text-center">
            <Users className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-bold text-foreground">멤버가 없어요</p>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
