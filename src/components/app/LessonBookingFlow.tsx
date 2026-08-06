import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/badminton/store";
import {
  createOrderToken,
  getTossServerStatus,
} from "@/lib/toss/payments.functions";
import {
  getOrCreateCustomerKey,
  getTossClientState,
  makeOrderId,
  TOSS_SETUP_MESSAGE,
} from "@/lib/toss/config";
import {
  formatDay,
  formatRange,
  formatTime,
  isPast,
  isSlotTaken,
  nextDays,
  slotsFor,
  won,
} from "@/lib/badminton/lessons";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  WEEKDAY_LABEL,
  type LessonBooking,
  type PaymentMethod,
} from "@/lib/badminton/types";

const STEPS = ["코치", "날짜·시간", "결제", "완료"] as const;
const WEEK_HEAD = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 달력에 그릴 한 달치 칸 (앞쪽 빈칸 포함) */
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const total = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= total; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function LessonBookingFlow({
  open,
  onOpenChange,
  initialCoachId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCoachId?: string | null;
}) {
  const { club, bookLesson, createPendingCardBooking, attachOrderToken, failBooking } =
    useStore();
  const fetchServerStatus = useServerFn(getTossServerStatus);
  const issueOrderToken = useServerFn(createOrderToken);
  /** 키 미설정/라이브 키면 결제를 막고 안내 문구를 보여준다(가짜 성공 금지). */
  const [tossBlocked, setTossBlocked] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [coachId, setCoachId] = useState<string | null>(initialCoachId ?? null);
  const [dayTs, setDayTs] = useState<number | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [depositor, setDepositor] = useState("");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<LessonBooking | null>(null);


  // 결제 단계에 들어올 때 클라이언트/서버 키 설정 상태를 확인한다.
  useEffect(() => {
    if (!open) return;
    const clientState = getTossClientState();
    if (!clientState.ok) {
      setTossBlocked(TOSS_SETUP_MESSAGE[clientState.reason]);
      return;
    }
    let alive = true;
    fetchServerStatus()
      .then((res) => {
        if (!alive) return;
        setTossBlocked(
          res.ok
            ? null
            : res.reason === "MISSING_SIGNING_SECRET"
              ? "주문 검증 키(ORDER_SIGNING_SECRET)가 설정되지 않았습니다."
              : TOSS_SETUP_MESSAGE[res.reason as keyof typeof TOSS_SETUP_MESSAGE],
        );
      })
      .catch(() => alive && setTossBlocked("결제 서버 상태를 확인할 수 없어요."));
    return () => {
      alive = false;
    };
  }, [open, fetchServerStatus]);

  /**
   * 토스 결제창(V2) 실행.
   * 1) 슬롯 선점용 PENDING 예약 생성 → 2) 서버에서 주문 무결성 토큰 발급
   * → 3) 결제창 열기(리다이렉트 방식, 모바일 안전) → 4) successUrl에서 서버 승인.
   * NOTE(프로덕션): 주문/예약은 서버 DB에 저장하고 webhook으로 상태를 동기화해야 한다.
   */
  const startTossPayment = async (selectedCoachId: string, slotStartAt: number) => {
    const clientState = getTossClientState();
    if (!clientState.ok) {
      setTossBlocked(TOSS_SETUP_MESSAGE[clientState.reason]);
      return;
    }
    const selected = club.coaches.find((c) => c.id === selectedCoachId);
    if (!selected) return;
    setPaying(true);
    const booking = createPendingCardBooking({
      coachId: selectedCoachId,
      startAt: slotStartAt,
      orderId: makeOrderId(selectedCoachId),
    });
    try {
      const tokenRes = await issueOrderToken({
        data: {
          orderId: booking.orderId!,
          bookingId: booking.bookingId,
          clubId: club.club.id,
          amount: booking.price,
        },
      });
      if (!tokenRes.ok) {
        failBooking(club.club.id, booking.bookingId, {
          code: tokenRes.reason,
          message: "결제 설정이 완료되지 않아 결제를 시작할 수 없습니다.",
        });
        setTossBlocked(TOSS_SETUP_MESSAGE[tokenRes.reason as keyof typeof TOSS_SETUP_MESSAGE]);
        setPaying(false);
        return;
      }
      attachOrderToken(club.club.id, booking.bookingId, tokenRes.orderToken);

      const toss = await loadTossPayments(clientState.clientKey);
      const payment = toss.payment({ customerKey: getOrCreateCustomerKey() });
      const origin = window.location.origin;
      const query = `bookingId=${encodeURIComponent(booking.bookingId)}&clubId=${encodeURIComponent(club.club.id)}`;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: booking.price },
        orderId: booking.orderId!,
        orderName: `${selected.name} 배드민턴 레슨`,
        successUrl: `${origin}/payments/toss/success?${query}`,
        failUrl: `${origin}/payments/toss/fail?${query}`,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (e) {
      // 사용자가 결제창을 닫거나 인증 실패 → 슬롯을 풀고 실패 기록을 남긴다.
      const err = e as { code?: string; message?: string };
      failBooking(club.club.id, booking.bookingId, {
        code: err.code ?? "PAYMENT_WINDOW_ERROR",
        message: err.message ?? "결제가 완료되지 않았습니다.",
      });
      toast.error(err.message ?? "결제가 취소됐어요.");
      setPaying(false);
    }
  };

  // 열릴 때마다 초기화 (선택값은 뒤로 가기에서는 유지)
  const [syncKey, setSyncKey] = useState(`${open}-${initialCoachId ?? ""}`);
  const key = `${open}-${initialCoachId ?? ""}`;
  if (syncKey !== key) {
    setSyncKey(key);
    if (open) {
      setStep(initialCoachId ? 1 : 0);
      setCoachId(initialCoachId ?? null);
      setDayTs(null);
      setMonthOffset(0);
      setStartAt(null);
      setMethod("BANK_TRANSFER");
      setDepositor("");
      setResult(null);
      setPaying(false);
    }
  }

  const today = useMemo(() => new Date(), []);
  const limit = useMemo(() => nextDays(60)[59]!, []);
  const cursor = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset],
  );
  const cells = useMemo(() => monthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const coach = club.coaches.find((c) => c.id === coachId) ?? null;
  const slots = useMemo(
    () => (coach && dayTs !== null ? slotsFor(coach, new Date(dayTs)) : []),
    [coach, dayTs],
  );


  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-md">
        <DrawerHeader className="pb-2 text-left">
          <div className="flex items-center gap-2">
            {step > 0 && step < 3 ? (
              <button
                onClick={back}
                aria-label="이전 단계"
                className="grid size-8 place-items-center rounded-xl bg-secondary active:scale-95"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : null}
            <DrawerTitle>{step === 3 ? "예약 완료" : "레슨 신청하기"}</DrawerTitle>
          </div>
          <DrawerDescription>
            STEP {Math.min(step + 1, 4)} / 4 · {STEPS[step]}
          </DrawerDescription>
          <div className="mt-2 flex gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
              />
            ))}
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          {step === 0 ? (
            <ul className="space-y-2">
              {club.coaches.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setCoachId(c.id);
                      if (coachId !== c.id) {
                        setDayTs(null);
                        setStartAt(null);
                      }
                      setStep(1);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] ${
                      coachId === c.id ? "border-primary bg-accent" : "border-border bg-card"
                    }`}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-base font-extrabold text-secondary-foreground">
                      {c.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">{c.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.specialties.join(" · ")}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-bold text-primary">
                        {c.durationMin}분 · {won(c.price)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {step === 1 && coach ? (
            <>
              <div className="rounded-3xl border border-border bg-card shadow-soft p-3">
                <div className="flex items-center justify-between px-1">
                  <button
                    aria-label="이전 달"
                    disabled={monthOffset === 0}
                    onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                    className="grid size-8 place-items-center rounded-xl bg-secondary active:scale-95 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <p className="text-sm font-extrabold text-foreground">
                    {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
                  </p>
                  <button
                    aria-label="다음 달"
                    disabled={monthOffset >= 2}
                    onClick={() => setMonthOffset((m) => Math.min(2, m + 1))}
                    className="grid size-8 place-items-center rounded-xl bg-secondary active:scale-95 disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                  {WEEK_HEAD.map((w) => (
                    <span key={w} className="text-[10px] font-bold text-muted-foreground">
                      {w}
                    </span>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (!d) return <span key={`e${i}`} />;
                    const inRange = d >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && d <= limit;
                    const lessonDay = coach.weekdays.includes(d.getDay());
                    const daySlots = lessonDay ? slotsFor(coach, d) : [];
                    const openCount = daySlots.filter(
                      (s) => !isSlotTaken(club.bookings, coach.id, s) && !isPast(s),
                    ).length;
                    const selectable = inRange && lessonDay && openCount > 0;
                    const active = dayTs !== null && sameDay(new Date(dayTs), d);
                    return (
                      <button
                        key={d.getTime()}
                        disabled={!selectable}
                        onClick={() => {
                          setDayTs(d.getTime());
                          setStartAt(null);
                        }}
                        className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition active:scale-95 ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : selectable
                              ? "border-border bg-card text-foreground"
                              : "border-transparent bg-muted text-muted-foreground/50"
                        }`}
                      >
                        <span className="text-sm font-extrabold">{d.getDate()}</span>
                        {lessonDay && inRange ? (
                          <span
                            className={`mt-0.5 text-[9px] font-bold ${
                              active
                                ? "text-primary-foreground"
                                : openCount > 0
                                  ? "text-primary"
                                  : "text-muted-foreground/60"
                            }`}
                          >
                            {openCount > 0 ? `${openCount}` : "마감"}
                          </span>
                        ) : (
                          <span className="mt-0.5 text-[9px]">·</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-[4px] border border-border bg-card shadow-soft" /> 예약 가능
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-[4px] bg-muted" /> 수업 없음 / 마감
                  </span>
                  <span>수업 요일 {coach.weekdays.map((w) => WEEKDAY_LABEL[w]).join("/")}</span>
                </p>
              </div>

              {dayTs === null ? (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  {coach.name} 코치의 레슨 가능한 날짜를 선택하면 시간이 표시돼요.
                </p>
              ) : (
                <>
                  <p className="mt-4 text-xs font-bold text-foreground">
                    {formatDay(new Date(dayTs))}{" "}
                    <span className="font-normal text-muted-foreground">
                      · 회색은 이미 예약된 시간이에요
                    </span>
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {slots.map((s) => {
                      const taken = isSlotTaken(club.bookings, coach.id, s) || isPast(s);
                      const active = startAt === s;
                      return (
                        <button
                          key={s}
                          disabled={taken}
                          onClick={() => {
                            setStartAt(s);
                            setStep(2);
                          }}
                          className={`rounded-2xl border py-3 text-sm font-bold transition active:scale-95 ${
                            taken
                              ? "border-transparent bg-muted text-muted-foreground/60 line-through"
                              : active
                                ? "border-primary bg-accent text-primary"
                                : "border-border bg-card text-foreground"
                          }`}
                        >
                          {formatTime(s)}
                        </button>
                      );
                    })}
                    {slots.length === 0 ? (
                      <p className="col-span-3 py-6 text-center text-sm text-muted-foreground">
                        이 날은 수업이 없어요.
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </>
          ) : null}


          {step === 2 && coach && startAt !== null ? (
            <>
              <div className="rounded-3xl border border-border bg-card shadow-soft p-4">
                <p className="text-xs font-bold text-primary">예약 내용</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <Row label="코치" value={coach.name} />
                  <Row label="일시" value={`${formatDay(new Date(startAt))} ${formatTime(startAt)}`} />
                  <Row label="시간" value={`${coach.durationMin}분`} />
                  <Row label="장소" value={club.club.location} />
                  <Row label="금액" value={won(coach.price)} strong />
                </dl>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary p-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-[11px] leading-relaxed text-secondary-foreground">
                  <span className="mr-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                    데모 결제
                  </span>
                  현재는 계좌이체 데모만 사용할 수 있어요. 카드·간편결제는 준비 중입니다.
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["BANK_TRANSFER", "CARD"] as PaymentMethod[]).map((m) => {
                  const cardDisabled = m === "CARD";
                  return (
                  <button
                    key={m}
                    disabled={cardDisabled}
                    onClick={() => setMethod(m)}
                    className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center text-xs font-bold leading-tight active:scale-95 disabled:opacity-50 ${
                      method === m ? "border-primary bg-accent text-primary" : "border-border bg-card"
                    }`}
                  >
                    {m === "BANK_TRANSFER" ? (
                      <Building2 className="size-4 shrink-0" />
                    ) : (
                      <CreditCard className="size-4 shrink-0" />
                    )}
                    <span>
                      {m === "BANK_TRANSFER"
                        ? "계좌이체 (데모)"
                        : "카드/간편결제 (준비 중)"}
                    </span>
                  </button>
                  );
                })}
              </div>

              {method === "BANK_TRANSFER" ? (
                <div className="mt-3 space-y-2 rounded-3xl border border-border bg-card shadow-soft p-4">
                  <p className="text-xs font-bold text-foreground">입금 계좌 (데모)</p>
                  <p className="rounded-2xl bg-secondary px-3 py-2.5 text-sm font-bold text-secondary-foreground">
                    {coach.settlementAccount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    입금 금액 <b className="text-foreground">{won(coach.price)}</b>
                  </p>
                  <Input
                    className="h-12 rounded-2xl"
                    placeholder="입금자명 (예: 김민준)"
                    value={depositor}
                    onChange={(e) => setDepositor(e.target.value)}
                  />
                  <Button
                    className="h-13 h-12 w-full rounded-2xl font-bold"
                    disabled={!depositor.trim()}
                    onClick={() => {
                      try {
                        const b = bookLesson({
                          coachId: coach.id,
                          startAt,
                          method: "BANK_TRANSFER",
                          depositorName: depositor.trim(),
                        });
                        setResult(b);
                        setStep(3);
                        toast.success("송금 완료 처리 · 클럽 확인 후 결제 완료됩니다.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "예약을 완료할 수 없어요.");
                      }
                    }}
                  >
                    송금 완료
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-2 rounded-3xl border border-border bg-card shadow-soft p-4">
                  {tossBlocked ? (
                    <p className="rounded-2xl bg-secondary p-3 text-xs font-semibold leading-relaxed text-secondary-foreground">
                      카드·간편결제는 <b>준비 중</b>이에요. 가맹점 등록이 완료되면 활성화됩니다.
                      지금은 계좌이체(데모)로 예약해 주세요.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      토스페이먼츠 결제창(테스트)이 열립니다. 카드 정보는 토스 결제창에서만
                      입력되고 이 앱은 저장하지 않아요.
                    </p>
                  )}
                  <Button
                    className="h-12 w-full rounded-2xl font-bold"
                    disabled={paying || Boolean(tossBlocked)}
                    onClick={() => startTossPayment(coach.id, startAt)}
                  >
                    {paying ? "결제창 준비 중…" : `${won(coach.price)} 결제하기 (테스트)`}
                  </Button>
                </div>
              )}

            </>
          ) : null}

          {step === 3 && result && coach ? (
            <>
              <div className="rounded-3xl border border-primary bg-accent p-5 text-center">
                <CheckCircle2 className="mx-auto size-10 text-primary" />
                <p className="mt-2 text-lg font-extrabold text-foreground">레슨 예약이 접수됐어요</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  결제번호 {result.transactionRef} · 데모 결제
                </p>
              </div>
              <dl className="mt-3 space-y-1.5 rounded-3xl border border-border bg-card shadow-soft p-4 text-sm">
                <Row label="코치" value={coach.name} />
                <Row label="날짜" value={formatDay(new Date(result.startAt))} />
                <Row label="시간" value={formatRange(result.startAt, result.endAt)} />
                <Row label="장소" value={club.club.location} />
                <Row label="결제수단" value={PAYMENT_METHOD_LABEL[result.paymentMethod]} />
                <Row label="금액" value={won(result.price)} strong />
                <Row label="결제상태" value={PAYMENT_STATUS_LABEL[result.paymentStatus]} strong />
              </dl>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="size-3" /> {club.club.name} · {club.club.location}
              </p>
              <Button
                className="mt-4 h-12 w-full rounded-2xl font-bold"
                onClick={() => onOpenChange(false)}
              >
                확인
              </Button>
            </>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-right text-sm ${strong ? "font-extrabold text-primary" : "font-semibold text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}
