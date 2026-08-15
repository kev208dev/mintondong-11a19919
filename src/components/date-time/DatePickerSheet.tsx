import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { dateOnlyFromDate, dateOnlyParts, formatKoreanDate } from "./format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function DatePickerSheet({
  label = "날짜",
  value,
  onChange,
  minDate,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const parts = dateOnlyParts(value) ?? dateOnlyParts(dateOnlyFromDate(new Date()));
    return new Date(parts!.year, parts!.month, 1);
  });
  const parts = dateOnlyParts(value);
  const today = dateOnlyFromDate(new Date());
  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [month]);

  const choose = (day: number) => {
    const selected = dateOnlyFromDate(new Date(month.getFullYear(), month.getMonth(), day));
    if (minDate && selected < minDate) return;
    onChange(selected);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (parts) setMonth(new Date(parts.year, parts.month, 1));
          setOpen(true);
        }}
        className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-card px-4 text-left shadow-soft active:scale-[0.99]"
      >
        <span>
          <span className="block text-xs font-bold text-muted-foreground">{label}</span>
          <span
            className={`mt-1 block text-sm font-extrabold ${parts ? "text-foreground" : "text-muted-foreground"}`}
          >
            {parts ? formatKoreanDate(value) : "날짜 선택"}
          </span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="rounded-t-[28px]">
          <DrawerHeader className="flex flex-row items-center gap-2 px-5 pb-2 pt-4 text-left">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-xl font-extrabold">{label} 선택</DrawerTitle>
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label="닫기"
                className="grid size-10 place-items-center rounded-full active:bg-muted"
              >
                <X className="size-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between py-3">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="grid size-11 place-items-center rounded-full active:bg-muted"
              >
                <ChevronLeft />
              </button>
              <strong className="text-lg font-extrabold">
                {month.getFullYear()}년 {month.getMonth() + 1}월
              </strong>
              <button
                type="button"
                aria-label="다음 달"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="grid size-11 place-items-center rounded-full active:bg-muted"
              >
                <ChevronRight />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-2">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {days.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} className="h-11" />;
                const selected =
                  parts?.year === month.getFullYear() &&
                  parts.month === month.getMonth() &&
                  parts.day === day;
                const date = dateOnlyFromDate(new Date(month.getFullYear(), month.getMonth(), day));
                const disabled = Boolean(minDate && date < minDate);
                const isToday = date === today;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={disabled}
                    onClick={() => choose(day)}
                    aria-label={`${formatKoreanDate(date)}${selected ? " 선택됨" : ""}`}
                    className={`mx-auto grid size-11 place-items-center rounded-full text-sm font-semibold transition ${selected ? "bg-foreground text-background" : disabled ? "text-muted-foreground/30" : "text-foreground active:bg-muted"}`}
                  >
                    <span className="relative">
                      {day}
                      {isToday && !selected ? (
                        <i className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand-green" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMonth(new Date());
                  onChange(today);
                  setOpen(false);
                }}
                className="h-11 rounded-xl px-4 text-sm font-bold text-brand-deep"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              >
                선택 완료
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
