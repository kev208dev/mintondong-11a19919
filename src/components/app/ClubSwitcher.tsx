import { Check, ChevronDown, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Drawer,
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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="flex min-w-0 items-center gap-1 rounded-full px-2 py-1 text-left transition-colors active:bg-accent"
          aria-label="동호회 전환"
        >
          <span className="max-w-[42vw] truncate text-[13px] font-extrabold text-foreground">
            {club.club.name}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle>동호회 전환</DrawerTitle>
        </DrawerHeader>
        <ul className="space-y-2 px-4">
          {clubs.map((c) => {
            const active = c.club.id === club.club.id;
            return (
              <li key={c.club.id}>
                <button
                  onClick={() => {
                    switchClub(c.club.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
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
                      <span className="truncate">{c.club.location}</span>
                    </span>
                  </span>
                  {active ? <Check className="size-5 shrink-0 text-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="p-4">
          <Link
            to="/club/manage"
            onClick={() => setOpen(false)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> 동호회 만들기 / 초대코드로 가입
          </Link>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
