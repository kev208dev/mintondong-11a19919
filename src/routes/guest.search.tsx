import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listGuestOffersFn } from "@/lib/guest/guest.functions";
import { calculateGuestBookingPrice } from "@/lib/guest/guest-core";

export const Route = createFileRoute("/guest/search")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    partySize: Number(search["partySize"] ?? 4),
    startsOn: typeof search["startsOn"] === "string" ? search["startsOn"] : undefined,
    region: typeof search["region"] === "string" ? search["region"] : undefined,
  }),
  component: GuestSearchPage,
});

function GuestSearchPage() {
  const { partySize = 4, startsOn, region } = Route.useSearch();
  const [sort, setSort] = useState<"near" | "price" | "time">("near");
  const offers = useQuery({
    queryKey: ["guest-offers", startsOn, region],
    queryFn: () => listGuestOffersFn({ data: { startsOn, region } }),
    staleTime: 30_000,
  });
  const availableOffers = useMemo(() => {
    const filtered = (offers.data ?? []).filter((offer) => offer.remainingCapacity >= partySize);
    return [...filtered].sort((a, b) => {
      if (sort === "price") return a.pricePerPerson - b.pricePerPerson;
      if (sort === "time") return a.startsAt.localeCompare(b.startsAt);
      return (a.address ?? "").localeCompare(b.address ?? "");
    });
  }, [offers.data, partySize, sort]);

  return (
    <div className="space-y-6">
      <header className="pt-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-sm font-bold text-foreground"
        >
          ← 조건 다시 설정
        </Link>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="page-heading">근처 게스트</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {startsOn ?? "날짜 전체"} · {partySize}명 · {region || "전국"}
            </p>
          </div>
          <span className="text-sm font-bold text-muted-foreground">
            {availableOffers.length}개
          </span>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {(
          [
            ["near", "가까운 순"],
            ["price", "가격순"],
            ["time", "시간순"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            className={`h-11 shrink-0 rounded-full px-4 text-sm font-bold ${sort === value ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {offers.isLoading ? (
        <div className="h-48 animate-pulse rounded-[20px] bg-secondary" />
      ) : offers.isError ? (
        <section className="surface-card p-8 text-center">
          <p className="text-lg font-extrabold">게스트 정보를 불러오지 못했어요</p>
          <Button
            variant="secondary"
            className="mt-4 h-11 rounded-xl"
            onClick={() => void offers.refetch()}
          >
            <RefreshCw className="mr-2 size-4" /> 다시 시도
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
                  to="/"
                  params={{ offerId: offer.id }}
                  className="surface-card block p-5 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold">{offer.clubName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{offer.address}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-brand-green">
                      {offer.remainingCapacity}자리 남음
                    </span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {new Date(offer.startsAt).toLocaleString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="mt-2">
                        <span className="text-sm text-muted-foreground">1인 </span>
                        <strong className="price-text">
                          {offer.pricePerPerson.toLocaleString()}원
                        </strong>
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {partySize}명 총 {price.totalAmount.toLocaleString()}원
                      </p>
                    </div>
                    <span className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-foreground px-3 text-sm font-bold text-background">
                      예약 <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="surface-card p-8 text-center">
          <p className="text-lg font-extrabold">조건에 맞는 게스트가 없어요</p>
          <p className="mt-2 text-sm text-muted-foreground">날짜나 지역을 바꿔 다시 찾아보세요.</p>
        </section>
      )}
    </div>
  );
}
