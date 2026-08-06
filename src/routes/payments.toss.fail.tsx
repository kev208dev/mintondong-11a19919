import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/badminton/store";

export const Route = createFileRoute("/payments/toss/fail")({
  head: () => ({
    meta: [
      { title: "결제 실패 – 민턴동 레슨 결제" },
      {
        name: "description",
        content: "토스페이먼츠 테스트 결제가 완료되지 않았습니다. 예약 시간은 다시 열립니다.",
      },
      { property: "og:title", content: "레슨 결제 실패 – 민턴동" },
      { property: "og:description", content: "결제가 취소되어 예약 시간이 다시 열렸습니다." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s["code"] === "string" ? s["code"] : "PAYMENT_FAILED",
    message: typeof s["message"] === "string" ? s["message"] : "결제가 완료되지 않았습니다.",
    bookingId: typeof s["bookingId"] === "string" ? s["bookingId"] : "",
  }),
  component: TossFailPage,
});

function TossFailPage() {
  const { code, message, bookingId } = useSearch({ from: Route.id });
  const { findBooking, failBooking } = useStore();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const found = findBooking(bookingId);
    // 실패 시 슬롯을 즉시 풀어주되 결제 기록은 남긴다(삭제하지 않음).
    if (found) failBooking(found.clubId, bookingId, { code, message });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-center">
      <XCircle className="mx-auto size-10 text-destructive" />
      <p className="mt-2 text-lg font-extrabold text-foreground">결제가 완료되지 않았어요</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">오류코드 {code}</p>
      <p className="mt-3 rounded-2xl bg-secondary p-3 text-[11px] leading-relaxed text-secondary-foreground">
        예약 시간은 다시 예약 가능 상태로 열렸고, 실패 기록은 결제 내역에 남았습니다. (테스트
        모드이므로 실제 금액은 청구되지 않습니다.)
      </p>
      <Button asChild className="mt-5 h-12 w-full rounded-2xl font-bold">
        <Link to="/lessons">다시 예약하기</Link>
      </Button>
    </section>
  );
}
