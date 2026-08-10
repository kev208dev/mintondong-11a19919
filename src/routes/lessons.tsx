import { RequireAuth } from "@/components/app/RequireAuth";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { cancelTossPayment } from "@/lib/toss/payments.functions";
import { CalendarClock, GraduationCap, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LessonBookingFlow } from "@/components/app/LessonBookingFlow";
import { useStore } from "@/lib/badminton/store";
import { formatDay, formatRange, won } from "@/lib/badminton/lessons";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  WEEKDAY_LABEL,
  type PaymentStatus,
} from "@/lib/badminton/types";

export const Route = createFileRoute("/lessons")({
  head: () => ({
    meta: [
      { title: "레슨 예약 – 코치 선택·시간 예약·데모 결제" },
      {
        name: "description",
        content:
          "클럽별 코치와 일정을 확인하고 50분 레슨을 예약해요. 계좌이체·카드 데모 결제와 예약 취소까지 지원합니다.",
      },
      { property: "og:title", content: "레슨 예약 – 민턴동" },
      {
        property: "og:description",
        content: "클럽 코치 레슨을 3단계로 예약하고 결제 상태까지 관리해요.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <LessonsPage />
    </RequireAuth>
  ),
});

const STATUS_TONE: Record<PaymentStatus, string> = {
  PAID: "bg-primary text-primary-foreground",
  PENDING: "bg-secondary text-secondary-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive text-destructive-foreground",
};

function LessonsPage() {
  const { club, cancelBooking, refundBooking, failBooking, can } = useStore();
  const cancelToss = useServerFn(cancelTossPayment);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preselect, setPreselect] = useState<string | null>(null);

  const bookings = useMemo(
    () => [...club.bookings].sort((a, b) => a.startAt - b.startAt),
    [club.bookings],
  );
  const upcoming = bookings.filter((b) => b.status === "BOOKED" && b.endAt > Date.now());
  const history = [...bookings]
    .filter((b) => !(b.status === "BOOKED" && b.endAt > Date.now()))
    .sort((a, b) => b.createdAt - a.createdAt);
  const coachName = (id: string) => club.coaches.find((c) => c.id === id)?.name ?? "코치";

  const startFlow = (coachId: string | null) => {
    setPreselect(coachId);
    setOpen(true);
  };

  if (!can("VIEW_LESSONS")) {
    return (
      <section className="rounded-3xl border border-border bg-card shadow-soft p-6 text-center">
        <GraduationCap className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-base font-bold text-foreground">레슨 조회 권한이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          클럽 운영자에게 레슨 열람 권한을 요청해 주세요.
        </p>
      </section>
    );
  }

  if (!club.lessonsEnabled) {
    return (
      <section className="rounded-3xl border border-border bg-card shadow-soft p-6 text-center">
        <GraduationCap className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-base font-bold text-foreground">이 클럽은 레슨을 운영하지 않아요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          모임 &gt; 레슨 운영 설정에서 켜면 코치와 예약 기능이 활성화돼요.
        </p>
      </section>
    );
  }

  return (
    <>
      {upcoming.length ? (
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">다가오는 레슨</h2>
          {upcoming.map((b) => (
            <article key={b.bookingId} className="rounded-3xl border border-primary/35 bg-accent card-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-primary">
                    {formatDay(new Date(b.startAt))} · {formatRange(b.startAt, b.endAt)}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground">
                    {coachName(b.coachId)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{club.club.location}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[b.paymentStatus]}`}
                >
                  {PAYMENT_STATUS_LABEL[b.paymentStatus]}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-foreground">
                  {won(b.price)}
                  <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[b.paymentMethod]}
                    {b.provider === "TOSS" ? " · 테스트" : " · 데모"}
                  </span>
                </p>
                <Button
                  variant="ghost"
                  className="h-9 rounded-xl text-xs font-bold text-muted-foreground"
                  disabled={cancelling === b.bookingId}
                  onClick={async () => {
                    // 토스로 결제된 예약은 반드시 서버 → 토스 취소 API를 거친 뒤에만
                    // 로컬 상태를 REFUNDED로 전이한다. (브라우저에서 토스 호출 금지)
                    if (b.provider === "TOSS" && b.paymentStatus === "PAID" && b.paymentKey) {
                      setCancelling(b.bookingId);
                      const res = await cancelToss({
                        data: { paymentKey: b.paymentKey, cancelReason: "회원 예약 취소" },
                      });
                      setCancelling(null);
                      if (!res.ok) {
                        toast.error(
                          res.code === "MISSING_SECRET_KEY"
                            ? "결제 취소 키(TOSS_SECRET_KEY)가 설정되지 않아 환불 요청을 보낼 수 없어요."
                            : res.message,
                        );
                        return;
                      }
                      refundBooking(club.club.id, b.bookingId);
                      toast.success("테스트 결제가 취소되고 환불 처리됐어요.");
                      return;
                    }
                    if (b.provider === "TOSS" && b.paymentStatus === "PENDING") {
                      failBooking(club.club.id, b.bookingId, {
                        code: "USER_CANCELLED",
                        message: "사용자가 결제 전에 예약을 취소했습니다.",
                      });
                      toast.success("예약을 취소했어요.");
                      return;
                    }
                    cancelBooking(b.bookingId);
                    toast.success(
                      b.paymentStatus === "PAID"
                        ? "예약을 취소했어요 · 환불 대기로 변경됩니다."
                        : "예약을 취소했어요.",
                    );
                  }}
                >
                  <X className="mr-1 size-4" /> 예약 취소
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-border bg-card shadow-soft p-5 text-center">
          <CalendarClock className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold text-foreground">예약된 레슨이 없어요</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {club.club.name} 코치 {club.coaches.length}명 · 50분 수업
          </p>
        </section>
      )}

      <Button
        className="mt-4 h-14 w-full rounded-2xl text-base font-extrabold"
        onClick={() => startFlow(null)}
      >
        <Sparkles className="mr-1 size-5" /> 레슨 신청하기
      </Button>

      <section className="mt-6">
        <h2 className="text-base font-bold text-foreground">코치 {club.coaches.length}명</h2>
        <ul className="mt-3 space-y-2">
          {club.coaches.map((c) => (
            <li key={c.id} className="rounded-3xl border border-border bg-card shadow-soft p-4">
              <div className="flex items-start gap-3">
                <span className="brand-gradient grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-primary-foreground">
                  {c.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-foreground">{c.name}</p>
                  <p className="text-[11px] font-semibold text-primary">{c.levelLabel}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.intro}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-foreground">
                  {won(c.price)}
                  <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                    / {c.durationMin}분 ·{" "}
                    {c.weekdays.map((w) => WEEKDAY_LABEL[w]).join("")} {c.startHour}–{c.endHour}시
                  </span>
                </p>
                <Button
                  className="h-10 rounded-xl px-4 text-xs font-bold"
                  onClick={() => startFlow(c.id)}
                >
                  예약
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {history.length ? (
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground">내 레슨 내역</h2>
          <ul className="mt-3 space-y-2">
            {history.map((b) => (
              <li
                key={b.bookingId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card shadow-soft p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">
                    {coachName(b.coachId)}
                    {b.status === "CANCELLED" ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">취소됨</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDay(new Date(b.startAt))} {formatRange(b.startAt, b.endAt)} ·{" "}
                    {won(b.price)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_TONE[b.paymentStatus]}`}
                >
                  {PAYMENT_STATUS_LABEL[b.paymentStatus]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LessonBookingFlow open={open} onOpenChange={setOpen} initialCoachId={preselect} />
    </>
  );
}
