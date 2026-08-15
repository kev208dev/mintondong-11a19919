import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Search, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/guest")({ ssr: false, component: GuestPage });

function GuestPage() {
  const navigate = useNavigate();
  const [partySize, setPartySize] = useState(4);
  const [startsOn, setStartsOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [region, setRegion] = useState("");
  return (
    <div className="space-y-6">
      <section className="brand-gradient -mx-4 rounded-b-[28px] px-5 pb-7 pt-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/20">
            <UsersRound className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold opacity-85">민턴동 게스트</p>
            <h1 className="type-page-title">어디서 칠까요?</h1>
          </div>
        </div>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">
          동호회에 가입하지 않아도 가까운 운동을 가격과 시간으로 비교해요.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <label className="rounded-2xl bg-white p-3 text-foreground">
            <span className="block text-xs font-semibold text-muted-foreground">인원</span>
            <select
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className="mt-1 w-full bg-transparent text-base font-bold outline-none"
            >
              {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-2xl bg-white p-3 text-foreground">
            <span className="block text-xs font-semibold text-muted-foreground">날짜</span>
            <Input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className="mt-1 h-7 border-0 p-0 text-sm font-bold shadow-none"
            />
          </label>
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-foreground">
          <MapPin className="size-4 text-brand-green" />
          <Input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="지역을 입력하세요 (예: 서울 강남구)"
            className="h-8 border-0 p-0 shadow-none"
          />
        </label>
        <Button
          className="mt-3 h-12 w-full rounded-2xl bg-brand-lime font-bold text-brand-deep hover:bg-brand-lime"
          onClick={() =>
            navigate({
              to: "/guest/search",
              search: { partySize, startsOn, region: region || undefined },
            })
          }
        >
          <Search className="mr-2 size-4" />
          근처 게스트 찾기
        </Button>
      </section>
      <section className="rounded-3xl bg-brand-wash p-5">
        <p className="text-sm font-bold text-brand-deep">처음이라면</p>
        <h2 className="mt-1 type-section-title">검색 결과에서 가격과 거리를 비교해요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          예약과 결제는 원하는 운동을 고른 다음 진행할 수 있어요.
        </p>
        <Link
          to="/guest/search"
          search={{ partySize, startsOn, region: undefined }}
          className="mt-4 inline-flex h-11 items-center rounded-2xl bg-white px-4 text-sm font-bold text-brand-deep"
        >
          등록된 게스트 보기
        </Link>
      </section>
    </div>
  );
}
