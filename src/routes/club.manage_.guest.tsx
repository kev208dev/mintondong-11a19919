import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createGuestOfferFn, listManagedGuestOffersFn } from "@/lib/guest/guest.functions";
import { useStore } from "@/lib/badminton/store";
import { listMyClubs } from "@/lib/clubs/api";
import { PlacePicker } from "@/components/places/PlacePicker";
import type { Place } from "@/lib/places/types";

export const Route = createFileRoute("/club/manage_/guest")({
  component: GuestOfferManagementPage,
});

function GuestOfferManagementPage() {
  const { user } = useAuth();
  const { club } = useStore();
  const clubs = useQuery({
    queryKey: ["clubs", "mine", user?.id],
    queryFn: () => listMyClubs(user!.id),
    enabled: Boolean(user),
  });
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [locationNote, setLocationNote] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [bookingOpensAt, setBookingOpensAt] = useState("");
  const [bookingClosesAt, setBookingClosesAt] = useState("");
  const [capacity, setCapacity] = useState(6);
  const [pricePerPerson, setPricePerPerson] = useState(8000);
  const [instructions, setInstructions] = useState("");
  const [skillNote, setSkillNote] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [showerAvailable, setShowerAvailable] = useState(false);
  const [shuttlecockIncluded, setShuttlecockIncluded] = useState(false);
  const clubId = clubs.data?.[0]?.id;
  const offers = useQuery({
    queryKey: ["guest-offers", "managed", clubId],
    queryFn: () => listManagedGuestOffersFn({ data: { clubId: clubId! } }),
    enabled: Boolean(clubId),
  });
  const create = useMutation({
    mutationFn: () => {
      if (!clubId) throw new Error("CLUB_REQUIRED");
      return createGuestOfferFn({
        data: {
          clubId,
          title,
          place: place!,
          locationNote: locationNote || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          ...(bookingOpensAt ? { bookingOpensAt: new Date(bookingOpensAt).toISOString() } : {}),
          bookingClosesAt: new Date(bookingClosesAt).toISOString(),
          capacity,
          pricePerPerson,
          skillNote: skillNote || undefined,
          instructions: instructions || undefined,
          parkingAvailable,
          showerAvailable,
          shuttlecockIncluded,
          cancellationPolicy: cancellationPolicy || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("게스트 모집을 열었어요.");
      void offers.refetch();
      setTitle("");
      setPlace(null);
      setLocationNote("");
      setStartsAt("");
      setEndsAt("");
      setBookingOpensAt("");
      setBookingClosesAt("");
      setInstructions("");
      setSkillNote("");
      setCancellationPolicy("");
      setParkingAvailable(false);
      setShowerAvailable(false);
      setShuttlecockIncluded(false);
    },
    onError: () => toast.error("게스트 모집을 만들지 못했어요."),
  });
  if (!user) return <p className="py-12 text-center">로그인이 필요해요.</p>;
  if (!clubId && !clubs.isLoading)
    return <p className="py-12 text-center">관리할 동호회를 찾지 못했어요.</p>;
  return (
    <div className="space-y-4">
      <h1 className="type-page-title">게스트 모집 만들기</h1>
      <p className="text-sm text-muted-foreground">{club.club.name} 운동에 참여할 자리를 열어요.</p>
      <section className="space-y-3 rounded-3xl bg-card p-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="모집 제목 (예: 토요일 저녁 게스트)"
          className="h-12 rounded-2xl"
        />
        <PlacePicker
          value={place}
          legacyLabel={club.club.location}
          onChange={setPlace}
          locationNote={locationNote}
          onLocationNoteChange={setLocationNote}
        />
        <label className="block text-sm font-bold">
          운동 시작
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-border px-3"
          />
        </label>
        <label className="block text-sm font-bold">
          운동 종료
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-border px-3"
          />
        </label>
        <label className="block text-sm font-bold">
          모집 시작 (선택)
          <input
            type="datetime-local"
            value={bookingOpensAt}
            onChange={(e) => setBookingOpensAt(e.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-border px-3"
          />
        </label>
        <label className="block text-sm font-bold">
          모집 마감
          <input
            type="datetime-local"
            value={bookingClosesAt}
            onChange={(e) => setBookingClosesAt(e.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-border px-3"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">
            최대 인원
            <Input
              type="number"
              min={2}
              max={200}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1 h-11 rounded-2xl"
            />
          </label>
          <label className="text-sm font-bold">
            1인 게스트비
            <Input
              type="number"
              min={0}
              step={500}
              value={pricePerPerson}
              onChange={(e) => setPricePerPerson(Number(e.target.value))}
              className="mt-1 h-11 rounded-2xl"
            />
          </label>
        </div>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="안내사항 (선택)"
          className="min-h-24 w-full rounded-2xl border border-border p-3 text-sm"
        />
        <Input
          value={skillNote}
          onChange={(e) => setSkillNote(e.target.value)}
          placeholder="권장 실력 (예: 초급~중급)"
          className="h-11 rounded-2xl"
        />
        <textarea
          value={cancellationPolicy}
          onChange={(e) => setCancellationPolicy(e.target.value)}
          placeholder="취소·환불 정책 (선택)"
          className="min-h-20 w-full rounded-2xl border border-border p-3 text-sm"
        />
        <div className="grid grid-cols-3 gap-2 text-xs font-bold">
          {[
            ["주차 가능", parkingAvailable, setParkingAvailable],
            ["샤워 가능", showerAvailable, setShowerAvailable],
            ["셔틀콕 포함", shuttlecockIncluded, setShuttlecockIncluded],
          ].map(([label, checked, setChecked]) => (
            <label
              key={String(label)}
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-muted/40 px-2"
            >
              <input
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(e) => (setChecked as (value: boolean) => void)(e.target.checked)}
              />
              {String(label)}
            </label>
          ))}
        </div>
      </section>
      <Button
        className="h-12 w-full rounded-2xl font-bold"
        disabled={create.isPending || !title || !place || !startsAt || !endsAt || !bookingClosesAt}
        onClick={() => create.mutate()}
      >
        {create.isPending ? "모집을 여는 중..." : "게스트 모집 열기"}
      </Button>
      <section className="space-y-3">
        <div>
          <h2 className="type-section-title">모집 현황</h2>
          <p className="text-sm text-muted-foreground">예약 인원과 예상 정산액을 확인하세요.</p>
        </div>
        {offers.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중...</p> : null}
        {offers.data?.length === 0 ? (
          <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
            아직 만든 게스트 모집이 없어요.
          </p>
        ) : null}
        {offers.data?.map(({ offer, bookingCount, reservedPartySize, expectedPayout }) => (
          <article key={offer.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{offer.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(offer.startsAt).toLocaleString("ko-KR", {
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-deep">
                {offer.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-muted/40 p-2">
                <strong className="block">{bookingCount}건</strong>
                <span className="text-xs text-muted-foreground">예약</span>
              </div>
              <div className="rounded-xl bg-muted/40 p-2">
                <strong className="block">{reservedPartySize}명</strong>
                <span className="text-xs text-muted-foreground">참가</span>
              </div>
              <div className="rounded-xl bg-muted/40 p-2">
                <strong className="block">{expectedPayout.toLocaleString()}원</strong>
                <span className="text-xs text-muted-foreground">예상 정산</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
