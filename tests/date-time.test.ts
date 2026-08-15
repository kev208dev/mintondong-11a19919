import assert from "node:assert/strict";
import test from "node:test";
import {
  dateOnlyParts,
  formatCompactKoreanDate,
  formatKoreanDate,
  localDateTimeParts,
  localDateTimeToIso,
} from "../src/components/date-time/format.ts";

test("formats date-only values in Korean without UTC day shifts", () => {
  assert.deepEqual(dateOnlyParts("2028-02-29"), { year: 2028, month: 1, day: 29 });
  assert.equal(formatKoreanDate("2026-08-22", new Date(2026, 0, 1)), "8월 22일 토요일");
  assert.equal(formatKoreanDate("2027-01-03", new Date(2026, 0, 1)), "2027년 1월 3일 일요일");
  assert.equal(formatCompactKoreanDate("2026-08-22"), "8.22 토");
});

test("keeps local date and time together before server ISO conversion", () => {
  assert.deepEqual(localDateTimeParts("2026-08-22T19:30"), { date: "2026-08-22", time: "19:30" });
  assert.match(localDateTimeToIso("2026-08-22T19:30"), /^2026-08-22T/);
  assert.throws(() => localDateTimeToIso("2026-08-22"), /INVALID_LOCAL_DATETIME/);
});
