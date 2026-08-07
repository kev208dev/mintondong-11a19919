import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { clubKeys, getClub, getMyMembership, joinClub } from "@/lib/clubs/api";
import { ClubAvatar } from "./clubs.find";

export const Route = createFileRoute("/clubs/$clubId")({
  component: ClubDetailLayout,
});

const TABS = [
  { key: "home", label: "홈", to: "/clubs/$clubId" as const, exact: true },
  { key: "schedule", label: "일정", to: "/clubs/$clubId/schedule" as const },
  { key: "lessons", label: "레슨", to: "/clubs/$clubId/lessons" as const },
  { key: "members", label: "멤버", to: "/clubs/$clubId/members" as const },
];

function ClubDetailLayout() {
  const { clubId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const clubQuery = useQuery({ queryKey: clubKeys.detail(clubId), queryFn: () => getClub(clubId) });
  const membershipQuery = useQuery({
    queryKey: clubKeys.membership(clubId, user?.id ?? null),
    queryFn: () => getMyMembership(clubId, user?.id ?? null),
    enabled: !!user,
  });

  const join = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("unauthenticated");
      await joinClub(
        clubId,
        {
          id: user.id,
          displayName: profile?.display_name || user.email?.split("@")[0] || "회원",
        },
        clubQuery.data?.is_public ?? true,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clubs"] });
      toast.success(
        clubQuery.data?.is_public ? "가입 완료!" : "가입 신청을 보냈어요. 승인을 기다려주세요.",
      );
    },
    onError: () => toast.error("가입에 실패했어요."),
  });

  if (clubQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-secondary" />;
  }
  const club = clubQuery.data;
  if (!club) {
    return (
      <div className="py-16 text-center">
        <Lock className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">동호회를 찾을 수 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          비공개 동호회이거나 삭제되었을 수 있어요.
        </p>
        <Link to="/clubs/find" className="mt-3 inline-block text-xs font-bold text-primary">
          동호회 찾기로 이동
        </Link>
      </div>
    );
  }

  const membership = membershipQuery.data;

  return (
    <div className="-mt-1 space-y-3">
      <div className="-mx-4">
        {club.cover_image_url ? (
          <img
            src={club.cover_image_url}
            alt={`${club.name} 커버 이미지`}
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="h-24 w-full bg-gradient-to-br from-primary/25 to-secondary" />
        )}
      </div>

      <div className="-mt-8 flex items-end gap-3 px-0">
        <span className="rounded-2xl ring-4 ring-background">
          <ClubAvatar club={club} size={56} />
        </span>
        <div className="min-w-0 flex-1 pb-0.5">
          <p className="truncate text-[17px] font-extrabold text-foreground">{club.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{club.region ?? "지역 미설정"}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Users className="size-3" />
              멤버 {club.member_count}
            </span>
            {club.is_public ? null : (
              <span className="flex shrink-0 items-center gap-1">
                <Lock className="size-3" />
                비공개
              </span>
            )}
          </p>
        </div>
      </div>

      {club.description ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {club.description}
        </p>
      ) : null}

      {membership ? (
        <div className="flex h-11 items-center justify-center rounded-2xl bg-secondary text-xs font-bold text-secondary-foreground">
          {membership.status === "pending"
            ? "가입 승인 대기 중"
            : membership.role === "owner"
              ? "내가 만든 동호회"
              : "가입한 동호회"}
        </div>
      ) : (
        <button
          type="button"
          disabled={join.isPending}
          onClick={() => (user ? join.mutate() : toast.error("로그인이 필요해요."))}
          className="flex h-11 w-full items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {join.isPending ? <Loader2 className="size-4 animate-spin" /> : "가입하기"}
        </button>
      )}

      <nav className="-mx-4 border-b border-border px-4">
        <ul className="flex items-center gap-1">
          {TABS.map((t) => {
            const href = t.to.replace("$clubId", clubId);
            const active = t.exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={t.key} className="flex-1">
                <Link
                  to={t.to}
                  params={{ clubId }}
                  className={`flex h-10 items-center justify-center border-b-2 text-xs font-bold transition-colors ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
