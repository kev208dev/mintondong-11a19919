import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Copy, LogOut, Settings, Check } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/badminton/store";
import { listMyGuestBookingsFn } from "@/lib/guest/guest.functions";
import { requestPortOneCancellation } from "@/lib/portone/payments.functions";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "마이 – 민턴동" }] }),
  component: MePage,
});

function providerLabel(provider?: string) {
  return provider === "apple"
    ? "Apple"
    : provider === "google"
      ? "Google"
      : provider === "kakao"
        ? "카카오"
        : "이메일";
}

function bookingLabel(status: string) {
  return status === "confirmed"
    ? "예약 확정"
    : status === "payment_pending"
      ? "결제 대기"
      : status === "refunded"
        ? "환불 완료"
        : status === "cancelled"
          ? "취소"
          : status === "failed"
            ? "실패"
            : "처리 중";
}

function MePage() {
  const { user, profile, loading, signOut } = useAuth();
  const { club, clubs } = useStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const bookings = useQuery({
    queryKey: ["guest-bookings", user?.id],
    queryFn: () => listMyGuestBookingsFn(),
    enabled: Boolean(user),
  });
  const cancel = useMutation({
    mutationFn: (paymentId: string) =>
      requestPortOneCancellation({ data: { paymentId, reason: "게스트 예약 취소" } }),
    onSuccess: () => {
      toast.success("예약 취소를 요청했어요.");
      void bookings.refetch();
    },
    onError: () => toast.error("예약을 취소하지 못했어요."),
  });

  if (loading) return <div className="h-40 animate-pulse rounded-[20px] bg-secondary" />;
  if (!user)
    return (
      <section className="surface-card mt-8 p-6 text-center">
        <h1 className="page-heading">로그인이 필요해요</h1>
        <p className="mt-3 text-base text-muted-foreground">
          로그인하고 내 예약과 동호회를 확인하세요.
        </p>
        <Link
          to="/auth"
          search={{ next: "/me" }}
          className="mt-6 flex h-13 items-center justify-center rounded-2xl bg-brand-green text-base font-extrabold text-foreground"
        >
          로그인하기
        </Link>
      </section>
    );

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "나";
  const bookingsCount = bookings.data?.length ?? 0;
  return (
    <div className="space-y-8">
      <header className="pt-3">
        <h1 className="page-heading">마이</h1>
      </header>

      <section className="surface-card flex items-center gap-4 p-5">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-brand-green text-2xl font-extrabold text-foreground">
            {name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold">{name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-2 text-sm font-bold text-brand-green">
            {providerLabel(user.app_metadata?.provider as string | undefined)} 로그인
          </p>
        </div>
        <Link
          to="/account-deletion"
          aria-label="계정 설정"
          className="grid size-11 place-items-center rounded-full bg-secondary"
        >
          <Settings className="size-5" />
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">내 활동</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/guest" className="surface-card p-5 active:scale-[0.98]">
            <span className="text-sm font-bold text-muted-foreground">내 예약</span>
            <strong className="mt-3 block text-3xl font-extrabold text-brand-green">
              {bookingsCount}
            </strong>
          </Link>
          <Link to="/club" className="surface-card p-5 active:scale-[0.98]">
            <span className="text-sm font-bold text-muted-foreground">내 동호회</span>
            <strong className="mt-3 block text-3xl font-extrabold text-brand-green">
              {clubs.length}
            </strong>
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">최근 예약</h2>
          <Link to="/guest" className="text-sm font-bold">
            더보기 <ArrowRight className="inline size-4" />
          </Link>
        </div>
        <div className="surface-card divide-y divide-border overflow-hidden">
          {bookings.data?.slice(0, 3).map((booking) => (
            <div key={booking.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold">
                  {booking.offerTitle ?? "게스트 예약"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {booking.startsAt
                    ? new Date(booking.startsAt).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : `${booking.partySize}명 예약`}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-extrabold ${booking.status === "confirmed" ? "text-brand-green" : "text-muted-foreground"}`}
                >
                  {bookingLabel(booking.status)}
                </p>
                {booking.status === "confirmed" && booking.paymentId ? (
                  <button
                    type="button"
                    onClick={() => cancel.mutate(booking.paymentId!)}
                    className="mt-2 text-sm font-bold text-destructive"
                    disabled={cancel.isPending}
                  >
                    취소
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!bookings.data?.length ? (
            <p className="p-5 text-base text-muted-foreground">예약 없음</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">설정</h2>
        <div className="surface-card divide-y divide-border overflow-hidden">
          <Link to="/support" className="flex min-h-14 items-center px-4 text-base font-bold">
            고객지원 <ArrowRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
          <Link to="/terms" className="flex min-h-14 items-center px-4 text-base font-bold">
            이용약관 <ArrowRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <section className="surface-card p-5">
        <p className="text-sm font-bold text-muted-foreground">계정 ID</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <code className="truncate text-sm">{user.id}</code>
          <button
            type="button"
            aria-label="계정 ID 복사"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(user.id);
                setCopied(true);
                toast.success("계정 ID를 복사했어요.");
                window.setTimeout(() => setCopied(false), 1500);
              } catch {
                toast.error("복사에 실패했어요.");
              }
            }}
          >
            {copied ? <Check className="size-5 text-brand-green" /> : <Copy className="size-5" />}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <ButtonLike
          onClick={async () => {
            await signOut();
            toast.success("로그아웃했어요.");
            void navigate({ to: "/" });
          }}
        >
          <LogOut className="size-5" /> 로그아웃
        </ButtonLike>
        <Link
          to="/account-deletion"
          className="flex h-13 items-center justify-center rounded-2xl bg-secondary text-base font-bold text-destructive"
        >
          계정 삭제
        </Link>
      </section>
      <p className="text-center text-sm text-muted-foreground">현재 모임 · {club.club.name}</p>
    </div>
  );
}

function ButtonLike({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-extrabold text-background active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
