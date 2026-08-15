import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  MapPin,
  ParkingCircle,
  ShowerHead,
  Ticket,
  UsersRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getGuestOfferFn } from "@/lib/guest/guest.functions";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/guest_/$offerId")({ ssr: false, component: GuestOfferPage });

function GuestOfferPage() {
  const { offerId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["guest-offer", offerId],
    queryFn: () => getGuestOfferFn({ data: { offerId } }),
  });
  if (query.isLoading) return <div className="h-80 animate-pulse rounded-3xl bg-muted" />;
  const offer = query.data;
  if (!offer)
    return (
      <div className="py-16 text-center">
        <p className="font-bold">게스트 모집을 찾을 수 없어요</p>
        <Link to="/guest" className="mt-3 inline-block text-sm font-bold text-brand-deep">
          게스트로 돌아가기
        </Link>
      </div>
    );
  const features = [
    [offer.parkingAvailable, "주차", ParkingCircle],
    [offer.showerAvailable, "샤워", ShowerHead],
    [offer.shuttlecockIncluded, "셔틀콕 포함", Ticket],
  ] as const;
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() =>
          navigate({
            to: "/guest/search",
            search: { partySize: 4, startsOn: undefined, region: undefined },
          })
        }
        className="flex min-h-11 items-center gap-1 text-sm font-bold text-brand-deep"
      >
        <ChevronLeft className="size-5" />
        게스트
      </button>
      <section className="brand-gradient rounded-[28px] p-5 text-primary-foreground">
        <p className="text-sm font-bold text-white/85">{offer.clubName}</p>
        <h1 className="mt-2 type-page-title">{offer.title}</h1>
        <p className="mt-3 text-sm text-white/85">
          {new Date(offer.startsAt).toLocaleString("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </section>
      <section className="space-y-4 rounded-3xl bg-card p-5">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 text-brand-green" />
          <div>
            <p className="font-bold">{offer.venueName}</p>
            <p className="text-sm text-muted-foreground">{offer.address}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-brand-wash p-3">
            <p className="text-muted-foreground">남은 자리</p>
            <strong className="mt-1 block text-lg">{offer.remainingCapacity}명</strong>
          </div>
          <div className="rounded-2xl bg-brand-wash p-3">
            <p className="text-muted-foreground">1인 게스트비</p>
            <strong className="mt-1 block text-lg">
              {offer.pricePerPerson.toLocaleString()}원
            </strong>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {features
            .filter(([enabled]) => enabled)
            .map(([, label, Icon]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-3 py-1.5 text-xs font-bold text-brand-deep"
              >
                <Icon className="size-3.5" />
                {label}
              </span>
            ))}
        </div>
        {offer.skillNote ? (
          <p className="text-sm text-muted-foreground">권장 실력 · {offer.skillNote}</p>
        ) : null}
        {offer.instructions ? (
          <div>
            <h2 className="font-bold">안내사항</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {offer.instructions}
            </p>
          </div>
        ) : null}
        {offer.cancellationPolicy ? (
          <div>
            <h2 className="font-bold">취소·환불 정책</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {offer.cancellationPolicy}
            </p>
          </div>
        ) : null}
      </section>
      <Button
        className="h-13 w-full rounded-2xl text-base font-bold"
        disabled={offer.remainingCapacity < 2 || offer.status === "closed"}
        onClick={() =>
          user
            ? navigate({
                to: "/guest/$offerId/checkout",
                params: { offerId },
                search: { paymentId: undefined },
              })
            : navigate({ to: "/auth", search: { next: `/guest/${offerId}/checkout` } })
        }
      >
        <UsersRound className="mr-2 size-5" />
        게스트 예약하기
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        예약 인원은 다음 단계에서 선택해요.
      </p>
    </div>
  );
}
