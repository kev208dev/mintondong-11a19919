import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  cancelClubJoinRequest,
  clubKeys,
  clubMutationErrorMessage,
  getClub,
  getClubJoinRequest,
  getMyMembership,
  joinClub,
} from "@/lib/clubs/api";
import { ClubRouteBackButton } from "@/components/app/ClubRouteBackButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClubAvatar } from "./clubs.find";

export const Route = createFileRoute("/clubs/$clubId")({
  component: ClubDetailLayout,
});

function ClubDetailLayout() {
  const { clubId } = Route.useParams();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState("");

  const clubQuery = useQuery({ queryKey: clubKeys.detail(clubId), queryFn: () => getClub(clubId) });
  const membershipQuery = useQuery({
    queryKey: clubKeys.membership(clubId, user?.id ?? null),
    queryFn: () => getMyMembership(clubId, user?.id ?? null),
    enabled: !!user,
  });
  const joinRequestQuery = useQuery({
    queryKey: clubKeys.joinRequest(clubId, user?.id ?? null),
    queryFn: () => getClubJoinRequest(clubId, user?.id ?? null),
    enabled: !!user,
  });

  const join = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("unauthenticated");
      return joinClub(clubId, message);
    },

    onSuccess: async (request) => {
      setRequestOpen(false);
      setMessage("");
      queryClient.setQueryData(clubKeys.joinRequest(clubId, user?.id ?? null), request);
      await queryClient.invalidateQueries({
        queryKey: clubKeys.joinRequest(clubId, user?.id ?? null),
      });
      await queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) });
      toast.success("가입 신청을 보냈어요. 승인을 기다려주세요.");
    },
    onError: (error) => {
      console.error("[clubs] join failed", error);
      toast.error(clubMutationErrorMessage("join", error));
    },
  });

  const cancel = useMutation({
    mutationFn: () => {
      const request = joinRequestQuery.data;
      if (!request) throw new Error("request not found");
      return cancelClubJoinRequest(request.id);
    },
    onSuccess: async (request) => {
      queryClient.setQueryData(clubKeys.joinRequest(clubId, user?.id ?? null), request);
      await joinRequestQuery.refetch();
      toast.success("가입 신청을 취소했어요.");
    },
    onError: (error) => toast.error(clubMutationErrorMessage("join", error)),
  });

  if (clubQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-secondary" />;
  }
  if (clubQuery.isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-bold text-foreground">동호회 정보를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => void clubQuery.refetch()}
          className="mt-3 h-10 rounded-xl bg-secondary px-4 text-xs font-bold text-secondary-foreground"
        >
          다시 시도
        </button>
      </div>
    );
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

  const request = joinRequestQuery.data;

  return (
    <div className="-mt-1 space-y-3">
      <ClubRouteBackButton />
      <div className="-mx-4">
        {club.cover_image_url ? (
          <img
            src={club.cover_image_url}
            alt={`${club.name} 커버 이미지`}
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="h-24 w-full bg-brand-wash" />
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
              <span className="truncate">{club.region ?? "지역 미등록"}</span>
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

      {user && membershipQuery.isLoading ? (
        <div
          className="flex h-11 items-center justify-center rounded-2xl bg-secondary text-xs font-bold text-muted-foreground"
          aria-label="가입 상태 확인 중"
        >
          <Loader2 className="mr-1.5 size-4 animate-spin" /> 가입 상태 확인 중
        </div>
      ) : user && joinRequestQuery.isLoading ? (
        <div
          className="flex h-11 items-center justify-center rounded-2xl bg-secondary text-xs font-bold text-muted-foreground"
          aria-label="가입 신청 상태 확인 중"
        >
          <Loader2 className="mr-1.5 size-4 animate-spin" /> 가입 상태 확인 중
        </div>
      ) : user && membershipQuery.isError ? (
        <div className="rounded-2xl bg-secondary p-3 text-center">
          <p className="text-xs font-bold text-muted-foreground">가입 상태를 확인하지 못했어요.</p>
          <button
            type="button"
            onClick={() => void membershipQuery.refetch()}
            className="mt-2 h-9 rounded-xl bg-card px-3 text-xs font-bold text-foreground"
          >
            다시 시도
          </button>
        </div>
      ) : user && joinRequestQuery.isError ? (
        <div className="rounded-2xl bg-secondary p-3 text-center">
          <p className="text-xs font-bold text-muted-foreground">
            가입 신청 상태를 확인하지 못했어요.
          </p>
          <button
            type="button"
            onClick={() => void joinRequestQuery.refetch()}
            className="mt-2 h-9 rounded-xl bg-card px-3 text-xs font-bold text-foreground"
          >
            다시 시도
          </button>
        </div>
      ) : request?.status === "pending" && membership?.status !== "active" ? (
        <div className="space-y-2">
          <div className="flex h-11 items-center justify-center rounded-2xl bg-secondary text-xs font-bold text-secondary-foreground">
            승인 대기 중
          </div>
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="mx-auto flex min-h-10 items-center justify-center px-3 text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            {cancel.isPending ? "취소 중..." : "신청 취소"}
          </button>
        </div>
      ) : membership ? (
        <div className="grid gap-2">
          <div className="flex h-11 items-center justify-center rounded-2xl bg-secondary text-xs font-bold text-secondary-foreground">
            {membership.status === "pending"
              ? "가입 승인 대기 중"
              : membership.role === "owner"
                ? "내가 만든 동호회"
                : membership.role === "admin"
                  ? "관리 중인 동호회"
                  : "가입한 동호회"}
          </div>
        </div>
      ) : loading ? (
        <div className="h-11 animate-pulse rounded-2xl bg-secondary" />
      ) : user ? (
        <button
          type="button"
          disabled={join.isPending}
          onClick={() => setRequestOpen(true)}
          className="flex h-11 w-full items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {join.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : request?.status === "rejected" ? (
            "다시 신청"
          ) : (
            "가입 신청"
          )}
        </button>
      ) : (
        <Link
          to="/auth"
          search={{ next: `/clubs/${clubId}` }}
          className="flex h-11 w-full items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground"
        >
          로그인 후 가입하기
        </Link>
      )}

      <Outlet />

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-[340px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>가입 신청</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            {club.name}에 가입을 신청할까요?
          </p>
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={500}
            placeholder="한마디 (선택)"
            className="h-12 rounded-2xl"
          />
          <button
            type="button"
            disabled={join.isPending}
            onClick={() => join.mutate()}
            className="h-12 rounded-2xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {join.isPending ? "신청 중..." : "가입 신청"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
