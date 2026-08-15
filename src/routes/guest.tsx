import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Search, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerSheet } from "@/components/date-time/DatePickerSheet";
import { dateOnlyFromDate } from "@/components/date-time/format";

export const Route = createFileRoute("/guest")({ ssr: false, component: GuestPage });

function GuestPage() {
  const navigate = useNavigate();
  const [partySize, setPartySize] = useState(4);
  const [startsOn, setStartsOn] = useState(() => dateOnlyFromDate(new Date()));
  const [region, setRegion] = useState("");

  return (
    <div className="space-y-8">
      <header className="pt-3">
        <p className="text-sm font-bold text-brand-green">민턴동 게스트</p>
        <h1 className="mt-2 page-heading">오늘 어디서 칠까요?</h1>
      </header>

      <section className="surface-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="rounded-2xl bg-secondary p-4">
            <span className="block text-sm font-bold text-muted-foreground">인원</span>
            <select
              value={partySize}
              onChange={(event) => setPartySize(Number(event.target.value))}
              className="mt-2 w-full bg-transparent text-lg font-extrabold outline-none"
            >
              {Array.from({ length: 19 }, (_, index) => index + 2).map((count) => (
                <option key={count} value={count}>
                  {count}명
                </option>
              ))}
            </select>
          </label>
          <DatePickerSheet label="날짜" value={startsOn} onChange={setStartsOn} />
        </div>
        <label className="mt-3 flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
          <MapPin className="size-5 text-brand-green" />
          <Input
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="지역 전체"
            className="h-8 border-0 bg-transparent p-0 text-base font-bold shadow-none"
          />
        </label>
        <Button
          className="mt-3 h-13 w-full rounded-2xl bg-brand-green text-base font-extrabold text-foreground hover:bg-brand-green-light"
          onClick={() =>
            navigate({
              to: "/guest/search",
              search: { partySize, startsOn, region: region || undefined },
            })
          }
        >
          <Search className="mr-2 size-5" /> 근처 게스트 찾기
        </Button>
      </section>

      <section>
        <h2 className="text-xl font-extrabold tracking-tight">게스트 예약</h2>
        <div className="surface-card mt-3 flex items-center gap-4 p-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-wash text-brand-green">
            <UsersRound className="size-6" />
          </span>
          <div>
            <p className="text-lg font-extrabold">가까운 모집 비교</p>
            <p className="mt-1 text-sm text-muted-foreground">거리 · 시간 · 가격</p>
          </div>
        </div>
      </section>
    </div>
  );
}
