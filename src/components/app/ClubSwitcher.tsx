import { Check, ChevronDown, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useStore } from "@/lib/badminton/store";

/** 컴팩트 헤더용 동호회 전환 트리거 (이름 + chevron) */
export function ClubSwitcher() {
  const { club, clubs, switchClub } = useStore();
  const [open, setOpen] = useState(false);

  // 모달이 열려 있는 동안 배경 스크롤 방지
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="flex min-w-0 items-center gap-1 rounded-full px-2 py-1 text-left transition-colors active:bg-accent"
          aria-label="동호회 선택"
        >
          <span className="max-w-[42vw] truncate text-[13px] font-extrabold text-foreground">
            {club.club.name}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[85vh] max-w-md">
        <DrawerHeader className="flex flex-row items-center justify-between gap-2 text-left">
          <DrawerTitle className="min-w-0 truncate text-base">동호회 선택</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="닫기"
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-accent"
            >
              <X className="size-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-1">
          {clubs.map((c) => {
            const active = c.club.id === club.club.id;
            return (
              <li key={c.club.id}>
                <button
                  onClick={() => {
                    switchClub(c.club.id);
                    setOpen(false);
                  }}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    active ? "border-primary bg-accent" : "border-border bg-card active:bg-accent"
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-extrabold text-secondary-foreground">
                    {c.club.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {c.club.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">
                        {c.club.location === "장소 미설정" ? "운동 장소 미등록" : c.club.location}
                      </span>
                    </span>
                  </span>
                  {active ? <Check className="size-5 shrink-0 text-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            to="/clubs/new"
            onClick={() => setOpen(false)}
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4 shrink-0" /> <span className="truncate">동호회 만들기</span>
          </Link>
          <Link
            to="/clubs/find"
            onClick={() => setOpen(false)}
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-bold text-secondary-foreground"
          >
            <Search className="size-4 shrink-0" /> <span className="truncate">참여하기</span>
          </Link>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
