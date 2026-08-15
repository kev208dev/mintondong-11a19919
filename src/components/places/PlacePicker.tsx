import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { searchPlacesFn } from "@/lib/places/places.functions";
import type { Place, PlaceSearchResult } from "@/lib/places/types";

type PlacePickerProps = {
  value?: Place | null;
  legacyLabel?: string | null;
  onChange: (place: Place) => void;
  onClear?: () => void;
  locationNote?: string;
  onLocationNoteChange?: (value: string) => void;
};

export function PlacePicker({
  value,
  legacyLabel,
  onChange,
  onClear,
  locationNote,
  onLocationNoteChange,
}: PlacePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<PlaceSearchResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useQuery({
    queryKey: ["places", "search", debouncedQuery],
    queryFn: () => searchPlacesFn({ data: { query: debouncedQuery } }),
    enabled: open && debouncedQuery.length >= 2 && !selected,
    staleTime: 30_000,
  });

  const close = () => {
    setOpen(false);
    setSelected(null);
    setQuery("");
  };

  const choose = () => {
    if (!selected) return;
    onChange(selected);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-soft transition active:scale-[0.99]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand-green">
          <MapPin className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block truncate text-sm font-extrabold text-foreground">
                {value.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {value.roadAddress ?? value.jibunAddress ?? "주소 정보 없음"}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm font-extrabold text-foreground">
                {legacyLabel ? `기존 장소: ${legacyLabel}` : "장소를 선택해 주세요"}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {legacyLabel ? "정확한 장소 지정" : "검색 결과에서 실제 장소를 선택합니다"}
              </span>
            </>
          )}
        </span>
        <span className="shrink-0 text-sm font-bold text-primary">변경</span>
      </button>
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 text-xs font-semibold text-muted-foreground"
        >
          선택 해제
        </button>
      ) : null}
      {onLocationNoteChange ? (
        <input
          value={locationNote ?? ""}
          onChange={(event) => onLocationNoteChange(event.target.value)}
          placeholder="상세 안내 (예: 2층 3번 코트)"
          className="mt-2 h-11 w-full rounded-xl bg-muted/40 px-3 text-sm outline-none ring-primary focus:ring-2"
        />
      ) : null}

      <Drawer open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DrawerContent className="h-[92dvh] rounded-t-[28px]">
          <DrawerHeader className="flex flex-row items-center gap-2 px-5 pb-3 pt-4 text-left">
            <DrawerClose asChild>
              <button
                type="button"
                aria-label="장소 찾기 닫기"
                className="grid size-10 place-items-center rounded-full active:bg-muted"
              >
                <ChevronLeft className="size-5" />
              </button>
            </DrawerClose>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-xl font-extrabold">장소 찾기</DrawerTitle>
              <DrawerDescription>검색 결과에서 정확한 장소를 선택하세요.</DrawerDescription>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="grid size-10 place-items-center rounded-full active:bg-muted"
            >
              <X className="size-5" />
            </button>
          </DrawerHeader>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-8">
              <div className="grid min-h-44 place-items-center rounded-3xl bg-brand-wash text-brand-green">
                <MapPin className="size-12" />
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-soft">
                <p className="text-lg font-extrabold text-foreground">{selected.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.roadAddress ?? selected.jibunAddress ?? "주소 정보 없음"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  좌표 {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                </p>
              </div>
              <Button type="button" onClick={choose} className="h-12 rounded-2xl font-extrabold">
                <Check className="mr-2 size-4" /> 이 장소 선택
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
                className="h-11 rounded-2xl font-bold"
              >
                검색 결과로 돌아가기
              </Button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-5 pb-8">
              <div className="flex h-12 items-center gap-2 rounded-2xl bg-muted/50 px-3">
                <Search className="size-5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value.slice(0, 80))}
                  placeholder="체육관, 학교, 장소 검색"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                {debouncedQuery.length < 2 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    장소명이나 지역을 2자 이상 입력하세요.
                  </p>
                ) : null}
                {results.isFetching ? (
                  <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> 장소를 찾는 중...
                  </p>
                ) : null}
                {results.isError ? (
                  <p className="py-12 text-center text-sm text-destructive">
                    장소를 불러오지 못했어요. 다시 검색해 주세요.
                  </p>
                ) : null}
                {!results.isFetching &&
                !results.isError &&
                debouncedQuery.length >= 2 &&
                results.data?.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    검색 결과가 없어요.
                  </p>
                ) : null}
                <div className="space-y-2">
                  {(results.data ?? []).map((place) => (
                    <button
                      key={`${place.provider}:${place.providerPlaceId}`}
                      type="button"
                      onClick={() => setSelected(place)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-muted"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand-green">
                        <MapPin className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-foreground">
                          {place.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {place.roadAddress ?? place.jibunAddress ?? "주소 정보 없음"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
