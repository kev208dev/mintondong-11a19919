import { DatePickerSheet } from "./DatePickerSheet";
import { TimePickerSheet } from "./TimePickerSheet";
import { combineLocalDateTime, dateOnlyFromDate, localDateTimeParts } from "./format";

/** 한국어 날짜·시간 row를 함께 제공하는 재사용 picker. 값은 로컬 `YYYY-MM-DDTHH:mm`이다. */
export function DateTimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = localDateTimeParts(value);
  const setDate = (date: string) => onChange(combineLocalDateTime(date, parts?.time ?? "19:00"));
  const setTime = (time: string) =>
    onChange(combineLocalDateTime(parts?.date ?? dateOnlyFromDate(new Date()), time));
  return (
    <div className="space-y-2 rounded-2xl bg-muted/30 p-3">
      <p className="text-sm font-extrabold">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <DatePickerSheet label="날짜" value={parts?.date ?? ""} onChange={setDate} />
        <TimePickerSheet label="시간" value={parts?.time ?? ""} onChange={setTime} />
      </div>
    </div>
  );
}
