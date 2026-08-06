import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/badminton/store";
import { confirmTossPayment } from "@/lib/toss/payments.functions";
import { formatDay, formatRange, won } from "@/lib/badminton/lessons";

export const Route = createFileRoute("/payments/toss/success")({
  head: () => ({
    meta: [
      { title: "결제 확인 – 민턴동 레슨 결제" },
      {
        name: "description",
        content: "토스페이먼츠 테스트 결제 승인 결과를 확인하고 레슨 예약을 확정합니다.",
      },
      { property: "og:title", content: "레슨 결제 확인 – 민턴동" },
      { property: "og:description", content: "테스트 결제 승인 결과 화면입니다." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    paymentKey: typeof s["paymentKey"] === "string" ? s["paymentKey"] : "",
    orderId: typeof s["orderId"] === "string" ? s["orderId"] : "",
    amount: Number(s["amount"] ?? 0),
    bookingId: typeof s["bookingId"] === "string" ? s["bookingId"] : "",
  }),

  component: TossSuccessPage,
});

function TossSuccessPage() {
  const { paymentKey, orderId, amount, bookingId } = useSearch({ from: Route.id });
  const { findBooking, markBookingPaid, failBooking, club } = useStore();
  const confirm = useServerFn(confirmTossPayment);
  const [state, setState] = useState<"LOADING" | "OK" | "ERROR">("LOADING");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const found = findBooking(bookingId);
    if (!found?.booking.orderToken) {
      setState("ERROR");
      setMessage("주문 정보를 찾을 수 없어요. 예약 내역을 확인해 주세요.");
      return;
    }
    if (found.booking.paymentStatus === "PAID") {
      setState("OK");
      return;
    }
    // successUrl의 amount는 단독으로 신뢰하지 않는다 — 서버가 서명된 주문과 대조해 검증한다.
    confirm({
      data: { paymentKey, orderId, amount, orderToken: found.booking.orderToken },
    })
      .then((res) => {
        if (res.ok) {
          markBookingPaid(res.clubId, res.bookingId, {
            paymentKey: res.payment.paymentKey,
            orderId: res.payment.orderId,
            receiptUrl: res.payment.receiptUrl,
          });
          setState("OK");
          return;
        }
        failBooking(found.clubId, bookingId, { code: res.code, message: res.message });
        setState("ERROR");
        setMessage(res.message);
      })
      .catch(() => {
        setState("ERROR");
        setMessage("결제 승인 중 오류가 발생했어요.");
      });
    // 최초 1회만 실행 (ran ref로 가드)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const booking = findBooking(bookingId)?.booking ?? null;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-center">
      {state === "LOADING" ? (
        <>
          <Loader2 className="mx-auto size-9 animate-spin text-primary" />
          <p className="mt-3 text-base font-extrabold text-foreground">결제를 승인하고 있어요</p>
          <p className="mt-1 text-xs text-muted-foreground">잠시만 기다려 주세요.</p>
        </>
      ) : state === "OK" ? (
        <>
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <p className="mt-2 text-lg font-extrabold text-foreground">레슨 결제가 완료됐어요</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            토스페이먼츠 테스트 결제 · 실제 금액은 청구되지 않습니다.
          </p>
          {booking ? (
            <dl className="mt-4 space-y-1.5 rounded-2xl bg-secondary p-4 text-left text-sm">
              <Row label="일시" value={`${formatDay(new Date(booking.startAt))} ${formatRange(booking.startAt, booking.endAt)}`} />
              <Row label="장소" value={club.club.location} />
              <Row label="금액" value={won(booking.price)} />
              <Row label="결제번호" value={booking.paymentKey ?? orderId} />
            </dl>
          ) : null}
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-10 text-destructive" />
          <p className="mt-2 text-lg font-extrabold text-foreground">결제를 완료하지 못했어요</p>
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        </>
      )}
      <Button asChild className="mt-5 h-12 w-full rounded-2xl font-bold">
        <Link to="/lessons">레슨으로 돌아가기</Link>
      </Button>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}
