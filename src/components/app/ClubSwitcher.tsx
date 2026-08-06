import { Check, ChevronDown, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useStore } from "@/lib/badminton/store";

export function ClubSwitcher() {
  const { club, clubs, switchClub } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-full border border-border bg-card px-2.5 py-2 text-left shadow-soft transition-transform duration-75 active:scale-[0.99] active:bg-accent">
          <span className="brand-gradient grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-primary-foreground">
            {club.club.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-extrabold leading-tight text-foreground">
              {club.club.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {club.club.location} · {club.sessionTime}
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
            {clubs.length}개
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>

      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle>클럽 전환</DrawerTitle>
          <DrawerDescription>
            가입한 클럽 {clubs.length}개 · 각 클럽의 출석·코트·기록은 따로 관리돼요.
          </DrawerDescription>
        </DrawerHeader>
        <ul className="space-y-2 px-4">
          {clubs.map((c) => {
            const active = c.club.id === club.club.id;
            const coming = Object.values(c.attendance).filter(
              (s) => s === "ATTEND" || s === "LATE",
            ).length;
            return (
              <li key={c.club.id}>
                <button
                  onClick={() => {
                    switchClub(c.club.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    active ? "border-primary bg-accent" : "border-border bg-card active:bg-accent"
                  }`}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-base font-extrabold text-secondary-foreground">
                    {c.club.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {c.club.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" />
                      <span className="truncate">{c.club.location}</span>
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-primary">
                      오늘 참석 {coming}명 · 코트 {c.courtCount}면 · 대기 {c.queue.length}명
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
            to="/club"
            onClick={() => setOpen(false)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> 클럽 만들기 / 초대코드로 가입
          </Link>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
