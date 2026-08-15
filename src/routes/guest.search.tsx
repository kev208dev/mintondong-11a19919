import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listGuestOffersFn } from "@/lib/guest/guest.functions";
import { calculateGuestBookingPrice } from "@/lib/guest/guest-core";

export const Route = createFileRoute("/guest/search")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    partySize: Number(s["partySize"] ?? 4),
    startsOn: typeof s["startsOn"] === "string" ? s["startsOn"] : undefined,
    region: typeof s["region"] === "string" ? s["region"] : undefined,
  }),
  component: GuestSearchPage,
});

function GuestSearchPage() {
  const { partySize = 4, startsOn, region } = Route.useSearch();
  const offers = useQuery({
    queryKey: ["guest-offers", startsOn, region],
    queryFn: () => listGuestOffersFn({ data: { startsOn, region } }),
    staleTime: 30_000,
  });
  const availableOffers = (offers.data ?? []).filter(
    (offer) => offer.remainingCapacity >= partySize,
  );
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <Link to="/guest" className="text-sm font-bold text-brand-deep">
            ← 조건 다시 설정
          </Link>
          <h1 className="mt-3 type-page-title">근처 게스트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {startsOn ?? "날짜 전체"} · {partySize}명 · {region || "전국"}
          </p>
        </div>
        <span className="rounded-full bg-brand-wash px-3 py-1 text-xs font-bold text-brand-deep">
          {availableOffers.length}개
        </span>
      </div>
      {offers.isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      ) : offers.isError ? (
        <section className="rounded-3xl bg-brand-wash p-6 text-center">
          <p className="font-bold">게스트 정보를 불러오지 못했어요</p>
          <Button variant="secondary" className="mt-3" onClick={() => void offers.refetch()}>
            <RefreshCw className="mr-2 size-4" />
            다시 시도
          </Button>
        </section>
      ) : availableOffers.length ? (
        <ul className="space-y-3">
          {availableOffers.map((offer) => {
            const price = calculateGuestBookingPrice({
              partySize,
              unitPrice: offer.pricePerPerson,
            });
            return (
              <li key={offer.id}>
                <Link
                  to="/guest/$offerId"
                  params={{ offerId: offer.id }}
                  className="block rounded-3xl border border-border bg-card p-5 transition active:scale-[.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-deep">{offer.clubName}</p>
                      <h2 className="mt-1 text-lg font-bold">{offer.title}</h2>
                    </div>
                    <span className="rounded-full bg-brand-wash px-2.5 py-1 text-xs font-bold text-brand-deep">
                      {offer.remainingCapacity}자리
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {new Date(offer.startsAt).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {offer.address}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <strong className="text-lg">{offer.pricePerPerson.toLocaleString()}원</strong>
                      <span className="ml-1 text-xs text-muted-foreground">1인</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {partySize}명 총 {price.totalAmount.toLocaleString()}원
                      </p>
                    </div>
                    <span className="inline-flex items-center text-sm font-bold text-brand-deep">
                      자세히 <ArrowRight className="ml-1 size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-3xl bg-brand-wash p-8 text-center">
          <p className="font-bold">조건에 맞는 게스트가 아직 없어요</p>
          <p className="mt-2 text-sm text-muted-foreground">날짜나 지역을 바꿔 다시 찾아보세요.</p>
        </section>
      )}
    </div>
  );
}
