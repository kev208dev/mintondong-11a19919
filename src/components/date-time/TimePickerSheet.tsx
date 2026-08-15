import { ChevronRight, X } from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatKoreanTime } from "./format";

export function TimePickerSheet({
  label = "시간",
  value,
  onChange,
  minuteStep = 10,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minuteStep?: 10 | 30;
}) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(() => Number(value.split(":")[0] || 19));
  const [minute, setMinute] = useState(() => Number(value.split(":")[1] || 0));
  const minutes = [
    ...Array.from({ length: 60 / minuteStep }, (_, index) => index * minuteStep),
    minute,
  ]
    .filter((item, index, all) => all.indexOf(item) === index)
    .sort((a, b) => a - b);
  const choose = () => {
    onChange(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHour(Number(value.split(":")[0] || 19));
          setMinute(Number(value.split(":")[1] || 0));
          setOpen(true);
        }}
        className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-card px-4 text-left shadow-soft active:scale-[0.99]"
      >
        <span>
          <span className="block text-xs font-bold text-muted-foreground">{label}</span>
          <span
            className={`mt-1 block text-sm font-extrabold ${/^\d{2}:\d{2}$/.test(value) ? "text-foreground" : "text-muted-foreground"}`}
          >
            {/^\d{2}:\d{2}$/.test(value) ? formatKoreanTime(value) : "시간 선택"}
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
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 24 }, (_, item) => item).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setHour(item)}
                  className={`h-11 rounded-xl text-sm font-bold ${hour === item ? "bg-foreground text-background" : "bg-muted/50 text-foreground"}`}
                >
                  {String(item).padStart(2, "0")}
                </button>
              ))}
            </div>
            <p className="py-4 text-center text-2xl font-extrabold tabular-nums">
              {String(hour).padStart(2, "0")} : {String(minute).padStart(2, "0")}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {minutes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMinute(item)}
                  className={`h-11 rounded-xl text-sm font-bold ${minute === item ? "bg-foreground text-background" : "bg-muted/50 text-foreground"}`}
                >
                  {String(item).padStart(2, "0")}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={choose}
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
