import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGuestOfferFn, createGuestBookingFn } from "@/lib/guest/guest.functions";
import { calculateGuestBookingPrice } from "@/lib/guest/guest-core";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatKoreanMobilePhone } from "@/lib/portone/checkout-input";
import {
  completePortOnePayment,
  prepareGuestPortOnePayment,
} from "@/lib/portone/payments.functions";
import { portOnePublicConfig } from "@/config/portone";

export const Route = createFileRoute("/guest_/$offerId/checkout")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    paymentId: typeof s["paymentId"] === "string" ? s["paymentId"] : undefined,
  }),
  component: GuestCheckoutPage,
});

function GuestCheckoutPage() {
  const { offerId } = Route.useParams();
  const { paymentId: redirectedPaymentId } = Route.useSearch();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const offer = useQuery({
    queryKey: ["guest-offer", offerId],
    queryFn: () => getGuestOfferFn({ data: { offerId } }),
    enabled: Boolean(user) && !loading,
  });
  const complete = useMutation({
    mutationFn: (id: string) => completePortOnePayment({ data: { paymentId: id } }),
    onSuccess: () => setResult("예약과 결제가 완료됐어요."),
  });
  const pay = useMutation({
    mutationFn: async () => {
      const booking = await createGuestBookingFn({ data: { offerId, partySize } });
      const order = await prepareGuestPortOnePayment({
        data: { bookingId: booking.id, customerName: name, customerPhone: phone },
      });
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestPayment({
        storeId: portOnePublicConfig.storeId,
        channelKey: portOnePublicConfig.channelKey,
        paymentId: order.paymentId,
        orderName: order.orderName,
        totalAmount: order.amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: order.customer,
        redirectUrl: `${window.location.origin}/?paymentId=${encodeURIComponent(order.paymentId)}`,
      });
      if (response?.code) throw new Error(response.message || "PAYMENT_FAILED");
      return completePortOnePayment({ data: { paymentId: order.paymentId } });
    },
    onSuccess: () => setResult("예약과 결제가 완료됐어요."),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "결제를 완료하지 못했어요."),
  });
  useEffect(() => {
    if (redirectedPaymentId && user && !complete.isPending && !complete.data && !result)
      complete.mutate(redirectedPaymentId);
  }, [redirectedPaymentId, user, result, complete]);

  if (!user && !loading)
    return (
      <section className="py-16 text-center">
        <h1 className="type-page-title">로그인이 필요해요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          예약과 결제를 위해 먼저 로그인해 주세요.
        </p>
        <Button asChild className="mt-6 h-12 rounded-2xl">
          <Link to="/auth" search={{ next: "/" }}>
            로그인하기
          </Link>
        </Button>
      </section>
    );
  if (offer.isLoading || !offer.data)
    return <div className="h-72 animate-pulse rounded-3xl bg-muted" />;
  const item = offer.data;
  const max = Math.min(20, item.remainingCapacity);
  const price = calculateGuestBookingPrice({ partySize, unitPrice: item.pricePerPerson });
  if (result)
    return (
      <section className="surface-card py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-wash text-2xl font-extrabold text-brand-green">
          ✓
        </div>
        <h1 className="mt-5 type-page-title">{result}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          내 예약에서 상세 내용을 확인할 수 있어요.
        </p>
        <Button asChild className="mt-6 h-12 rounded-2xl">
          <Link to="/me">내 예약 보기</Link>
        </Button>
      </section>
    );
  return (
    <div className="space-y-6">
      <Link
        to="/"
        params={{ offerId }}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-foreground"
      >
        <ArrowLeft className="size-4" />
        홈으로
      </Link>
      <div>
        <p className="text-sm font-bold text-brand-green">{item.clubName}</p>
        <h1 className="mt-2 page-heading">예약 확인</h1>
      </div>
      <section className="surface-card p-5">
        <h2 className="text-xl font-extrabold">{item.title}</h2>
        <p className="mt-2 text-base text-muted-foreground">
          {new Date(item.startsAt).toLocaleString("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary p-4">
          <span className="text-base font-bold">예약 인원</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full bg-white"
              aria-label="인원 줄이기"
              onClick={() => setPartySize((v) => Math.max(2, v - 1))}
            >
              <Minus className="size-4" />
            </button>
            <strong className="w-8 text-center text-lg">{partySize}</strong>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full bg-white"
              aria-label="인원 늘리기"
              onClick={() => setPartySize((v) => Math.min(max, v + 1))}
              disabled={partySize >= max}
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예약자 이름"
            autoComplete="name"
            className="h-12 rounded-2xl"
          />
          <Input
            value={phone}
            onChange={(e) => setPhone(formatKoreanMobilePhone(e.target.value))}
            placeholder="010-0000-0000"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={13}
            className="h-12 rounded-2xl"
          />
        </div>
        <dl className="mt-6 space-y-4 text-base">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">1인 가격</dt>
            <dd>{price.unitPrice.toLocaleString()}원</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">상품 금액</dt>
            <dd>{price.subtotalAmount.toLocaleString()}원</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">플랫폼 수수료</dt>
            <dd>{price.platformFeeAmount.toLocaleString()}원</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-4 text-lg font-extrabold">
            <dt>총 결제액</dt>
            <dd className="price-text">{price.totalAmount.toLocaleString()}원</dd>
          </div>
        </dl>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">
        결제 진행 시 이용약관 및 모집별 취소·환불 정책에 동의합니다.
      </p>
      <Button
        className="h-13 w-full rounded-2xl bg-brand-green text-base font-extrabold text-foreground hover:bg-brand-green-light"
        disabled={
          pay.isPending ||
          complete.isPending ||
          max < 2 ||
          !name.trim() ||
          phone.replace(/\D/g, "").length !== 11
        }
        onClick={() => pay.mutate()}
      >
        {pay.isPending || complete.isPending
          ? "결제를 준비하고 있어요..."
          : `${price.totalAmount.toLocaleString()}원 결제하기`}
      </Button>
    </div>
  );
}
