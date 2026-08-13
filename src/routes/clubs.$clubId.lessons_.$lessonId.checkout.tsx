import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { refundPolicyConfig, isRefundPolicyReady } from "@/config/refund-policy";
import { portOnePublicConfig } from "@/config/portone";
import { useAuth } from "@/lib/auth/AuthProvider";
import { won } from "@/lib/badminton/lessons";
import { WEEKDAY_LABEL } from "@/lib/badminton/types";
import { formatKoreanMobilePhone, isValidKoreanMobilePhone } from "@/lib/portone/checkout-input";
import {
  completePortOnePayment,
  getCheckoutLesson,
  preparePortOnePayment,
} from "@/lib/portone/payments.functions";
import {
  checkoutPaymentAccess,
  paymentFailureMessage,
  PAYMENT_REVIEW_MESSAGE,
  toPortOnePayMethod,
  type CheckoutPaymentMethod,
} from "@/lib/portone/payment-core";

export const Route = createFileRoute("/clubs/$clubId/lessons_/$lessonId/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    paymentId: typeof search["paymentId"] === "string" ? search["paymentId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "레슨 결제 – 민턴동" },
      {
        name: "description",
        content: "실제 공개 레슨 상품의 가격과 환불 조건을 확인하고 결제합니다.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortOneCheckoutPage,
});

function PortOneCheckoutPage() {
  const { clubId, lessonId } = Route.useParams();
  const { paymentId: redirectedPaymentId } = Route.useSearch();
  const { user, loading } = useAuth();
  const prepare = useServerFn(preparePortOnePayment);
  const complete = useServerFn(completePortOnePayment);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("CARD");
  const [busy, setBusy] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const completedRedirect = useRef(false);
  const product = useQuery({
    queryKey: ["portone-checkout", clubId, lessonId],
    queryFn: () => getCheckoutLesson({ data: { clubId, lessonId } }),
  });

  useEffect(() => {
    if (!redirectedPaymentId || !user || completedRedirect.current) return;
    completedRedirect.current = true;
    setBusy(true);
    complete({ data: { paymentId: redirectedPaymentId } })
      .then((state) => {
        setResult({
          ok: state.status === "PAID",
          message:
            state.status === "PAID"
              ? "서버 검증을 마쳐 결제가 완료되었습니다."
              : `현재 결제 상태는 ${state.portoneStatus}입니다.`,
        });
      })
      .catch((error) => {
        if (isPaymentReviewError(error)) {
          setReviewRequired(true);
          setResult({ ok: false, message: PAYMENT_REVIEW_MESSAGE });
          return;
        }
        setResult({ ok: false, message: paymentFailureMessage("PAYMENT_FAILED") });
      })
      .finally(() => setBusy(false));
  }, [complete, redirectedPaymentId, user]);

  if (product.isLoading) {
    return <Loader2 className="mx-auto mt-16 size-8 animate-spin text-primary" />;
  }
  if (!product.data || product.error) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6 text-center">
        <AlertCircle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-3 text-lg font-extrabold">결제할 수 없는 상품입니다</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          비공개 클럽, 레슨 운영 중지, 미등록 가격·수업 시간은 결제할 수 없습니다.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link to="/clubs/$clubId/lessons" params={{ clubId }}>
            레슨으로 돌아가기
          </Link>
        </Button>
      </section>
    );
  }

  const lesson = product.data;
  const schedule = lesson.weekdays
    .map((day) => WEEKDAY_LABEL[day])
    .filter(Boolean)
    .join("·");
  const { enabled, storeId, channelKey } = portOnePublicConfig;
  const integrationReady = enabled && Boolean(storeId && channelKey);
  const access = checkoutPaymentAccess({
    authenticated: Boolean(user),
    integrationReady,
    refundPolicyReady: isRefundPolicyReady,
  });
  const checkoutPath = `/clubs/${clubId}/lessons/${lessonId}/checkout${
    redirectedPaymentId ? `?paymentId=${encodeURIComponent(redirectedPaymentId)}` : ""
  }`;

  async function pay() {
    if (access !== "READY" || !user || !storeId || !channelKey || reviewRequired) return;
    setBusy(true);
    setResult(null);
    try {
      const order = await prepare({
        data: { clubId, lessonId, customerName: name, customerPhone: phone },
      });
      const PortOne = await import("@portone/browser-sdk/v2");
      const redirectUrl = `${window.location.origin}/clubs/${clubId}/lessons/${lessonId}/checkout?paymentId=${encodeURIComponent(order.paymentId)}`;
      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId: order.paymentId,
        orderName: order.orderName,
        totalAmount: order.amount,
        currency: "CURRENCY_KRW",
        payMethod: toPortOnePayMethod(paymentMethod),
        customer: order.customer,
        redirectUrl,
      });
      if (response?.code) {
        setResult({ ok: false, message: paymentFailureMessage(response.code, response.message) });
        return;
      }
      const verified = await complete({ data: { paymentId: order.paymentId } });
      setResult({
        ok: verified.status === "PAID",
        message:
          verified.status === "PAID"
            ? "서버 검증을 마쳐 결제가 완료되었습니다."
            : `현재 결제 상태는 ${verified.portoneStatus}입니다.`,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const needsReview = isPaymentReviewError(error);
      if (needsReview) setReviewRequired(true);
      setResult({
        ok: false,
        message: needsReview
          ? PAYMENT_REVIEW_MESSAGE
          : code === "PORTONE_PAYMENT_MIGRATION_REQUIRED"
            ? "결제 DB 준비가 필요합니다. 운영자에게 문의해 주세요."
            : code === "PORTONE_SERVER_NOT_CONFIGURED"
              ? "결제 서버 설정이 필요합니다. 운영자에게 문의해 주세요."
              : paymentFailureMessage(code),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
      <header className="brand-header p-5">
        <Link
          to="/clubs/$clubId/lessons"
          params={{ clubId }}
          aria-label="레슨으로 돌아가기"
          className="mb-3 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="text-xl font-extrabold">결제하기</h1>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          결제 전 상품과 환불 조건을 확인해 주세요.
        </p>
      </header>
      <div className="space-y-5 p-5 pb-36">
        <div>
          <p className="text-xs font-bold text-muted-foreground">배드민턴 레슨</p>
          <h2 className="mt-1 text-lg font-extrabold text-foreground">
            {lesson.coachName} 코치 레슨
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {lesson.clubName} · {lesson.durationMin}분
          </p>
        </div>
        <dl className="space-y-2 rounded-2xl bg-secondary/60 p-4 text-xs">
          <Row label="클럽" value={lesson.clubName} />
          <Row label="코치" value={`${lesson.coachName} 코치`} />
          <Row label="장소" value={lesson.location || "장소 미등록"} />
          <Row
            label="운영 시간"
            value={`${schedule || "요일 미등록"} · ${String(lesson.startHour).padStart(2, "0")}:00–${String(lesson.endHour).padStart(2, "0")}:00`}
          />
          <Row label="1회 수업" value={`${lesson.durationMin}분`} />
          <Row label="최종 결제금액" value={won(lesson.priceWon)} strong />
        </dl>

        <div className="rounded-2xl border border-border p-4 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground">취소·환불 조건</p>
          <p className="mt-1">
            취소 기준: {refundPolicyConfig.cancellationDeadline ?? "운영자 입력 필요"}
          </p>
          <p>처리 기간: {refundPolicyConfig.expectedRefundPeriod ?? "운영자 입력 필요"}</p>
          <Link to="/refund-policy" className="mt-2 inline-block font-bold text-primary underline">
            전체 취소 및 환불 정책 보기
          </Link>
        </div>

        {user ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="buyer-name">구매자 이름</Label>
              <Input
                id="buyer-name"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="실명을 입력해 주세요"
                maxLength={50}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="buyer-phone">휴대전화</Label>
              <Input
                id="buyer-phone"
                className="mt-1"
                value={phone}
                onChange={(e) => setPhone(formatKoreanMobilePhone(e.target.value))}
                placeholder="010-0000-0000"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={13}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-extrabold text-foreground">결제 수단</legend>
              <PaymentMethodOption
                checked={paymentMethod === "CARD"}
                icon={<CreditCard className="size-5" />}
                label="카드"
                description="신용/체크카드"
                onClick={() => setPaymentMethod("CARD")}
              />
              <PaymentMethodOption
                checked={paymentMethod === "EASY_PAY"}
                icon={<Smartphone className="size-5" />}
                label="간편결제"
                description="지원되는 간편결제"
                onClick={() => setPaymentMethod("EASY_PAY")}
              />
            </fieldset>
          </div>
        ) : null}

        {!integrationReady ? (
          <Notice text="결제 연동 설정이 필요합니다. PortOne 상점 ID, KG이니시스 채널 키와 활성화 설정을 확인해 주세요." />
        ) : null}
        {!isRefundPolicyReady ? (
          <Notice text="실제 취소 기준과 환불 처리 기간이 설정되지 않아 결제를 시작할 수 없습니다." />
        ) : null}
        {result ? (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl p-5 text-center ${result.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
          >
            {result.ok ? <CheckCircle2 className="mx-auto size-10" /> : null}
            <p className="mt-2 text-base font-extrabold">
              {result.ok ? "결제가 완료됐어요" : "결제를 완료하지 못했어요"}
            </p>
            <p className="mt-1 text-xs font-bold">{result.message}</p>
            {result.ok ? (
              <Button asChild variant="outline" className="mt-4 w-full rounded-xl">
                <Link to="/clubs/$clubId/lessons" params={{ clubId }}>
                  레슨으로 돌아가기
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        {user ? (
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            결제 진행 시{" "}
            <Link to="/terms" className="font-bold text-primary underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link to="/refund-policy" className="font-bold text-primary underline">
              환불정책
            </Link>
            에 동의한 것으로 간주합니다.
          </p>
        ) : null}
      </div>
      {!result?.ok ? (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-md border-t border-border bg-card/95 p-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1 text-sm">
            <span className="font-bold text-muted-foreground">총 결제 금액</span>
            <strong className="text-base font-extrabold text-primary">
              {won(lesson.priceWon)}
            </strong>
          </div>
          {loading ? (
            <Button className="h-12 w-full rounded-2xl font-extrabold" disabled>
              <Loader2 className="mr-2 size-4 animate-spin" /> 로그인 상태 확인 중
            </Button>
          ) : !user ? (
            <Button asChild className="h-12 w-full rounded-2xl font-extrabold">
              <Link to="/auth" search={{ next: checkoutPath }}>
                로그인 후 결제하기
              </Link>
            </Button>
          ) : (
            <Button
              className="h-12 w-full rounded-2xl font-extrabold"
              disabled={
                access !== "READY" ||
                reviewRequired ||
                busy ||
                !name.trim() ||
                !isValidKoreanMobilePhone(phone)
              }
              onClick={() => void pay()}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {busy
                ? "결제 진행 중..."
                : reviewRequired
                  ? "결제 확인 필요"
                  : result
                    ? "다시 결제하기"
                    : `${won(lesson.priceWon)} 결제하기`}
            </Button>
          )}
          {busy ? (
            <p
              className="mt-2 text-center text-[11px] font-bold text-muted-foreground"
              role="status"
            >
              결제창으로 이동 중… 안전한 결제를 위해 결제 화면으로 이동합니다.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PaymentMethodOption({
  checked,
  icon,
  label,
  description,
  onClick,
}: {
  checked: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked ? "border-primary bg-primary/5" : "border-border bg-card active:bg-accent"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-5 place-items-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"}`}
      >
        {checked ? <span className="size-2 rounded-full bg-current" /> : null}
      </span>
      <span className="text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function isPaymentReviewError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("PAYMENT_VERIFICATION_MISMATCH") || message.includes("PAYMENT_REVIEW_REQUIRED")
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right ${strong ? "text-base font-extrabold text-primary" : "font-bold text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
      <AlertCircle className="mr-1 inline size-4" />
      {text}
    </p>
  );
}