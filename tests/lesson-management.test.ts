import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canManageLessons,
  type LessonSaleInput,
  validateLessonSale,
} from "../src/lib/clubs/lesson-management-core.ts";
import { isSellableLesson } from "../src/lib/portone/payment-core.ts";

const validLesson: LessonSaleInput = {
  name: "실제 코치",
  intro: "실제 소개",
  specialties: ["복식"],
  levelLabel: "입문",
  weekdays: [1],
  startHour: 19,
  endHour: 22,
  durationMin: 50,
  priceWon: 30_000,
  isActive: true,
};

test("owner와 active admin만 레슨 관리 역할로 인정한다", () => {
  assert.equal(canManageLessons("owner", "active"), true);
  assert.equal(canManageLessons("admin", "active"), true);
  assert.equal(canManageLessons("member", "active"), false);
  assert.equal(canManageLessons(null, null), false);
  assert.equal(canManageLessons("admin", "pending"), false);
});

test("0원, 0분, 요일 없음, 역전된 시간은 판매 정보 검증을 통과하지 못한다", () => {
  for (const lesson of [
    { ...validLesson, priceWon: 0 },
    { ...validLesson, durationMin: 0 },
    { ...validLesson, weekdays: [] },
    { ...validLesson, startHour: 22, endHour: 19 },
  ]) {
    assert.equal(validateLessonSale(lesson).ok, false);
  }
  assert.equal(validateLessonSale(validLesson).ok, true);
});

test("판매중지 상품은 checkout 판매 가능 판정을 통과하지 못한다", () => {
  const base = {
    isPublic: true,
    lessonsEnabled: true,
    price: 30_000,
    durationMin: 50,
  };
  assert.equal(isSellableLesson({ ...base, isActive: false }), false);
  assert.equal(isSellableLesson({ ...base, isActive: true }), true);
});

test("migration은 anon/member write와 다른 club_id 변조를 DB에서 차단한다", () => {
  const sql = readFileSync(
    "supabase/migrations/20260812062356_coach_lesson_management_20260812.sql",
    "utf8",
  );
  assert.match(sql, /revoke all on table public\.coaches from public, anon, authenticated/i);
  assert.match(sql, /role in \('owner', 'admin'\)/i);
  assert.match(sql, /status = 'active'/i);
  assert.match(sql, /with check \(private\.can_manage_coach_lessons\(club_id\)\)/i);
  assert.doesNotMatch(sql, /grant (insert|update).*anon/i);
  assert.doesNotMatch(sql, /grant (insert|update).*club_id.*update/i);
  assert.doesNotMatch(sql, /drop\s+table|delete\s+from|truncate/i);
});

test("hard delete 없이 is_active 판매중지와 유효 상품 constraint를 사용한다", () => {
  const sql = readFileSync(
    "supabase/migrations/20260812062356_coach_lesson_management_20260812.sql",
    "utf8",
  );
  assert.match(sql, /add column if not exists is_active boolean not null default false/i);
  assert.match(sql, /not is_active[\s\S]*price > 0[\s\S]*duration_min > 0/i);
  assert.doesNotMatch(sql, /for delete/i);
});

test("public catalog와 checkout은 판매중 상태와 최신 DB 가격을 다시 읽는다", () => {
  const catalog = readFileSync("src/lib/clubs/public-lessons.functions.ts", "utf8");
  const checkout = readFileSync("src/lib/portone/portone.server.ts", "utf8");
  assert.match(catalog, /\.eq\("is_active", true\)/);
  assert.match(catalog, /\.gt\("price", 0\)/);
  assert.match(checkout, /duration_min, price, is_active/);
  assert.match(checkout, /priceWon: Number\(lesson\["price"\]\)/);
  assert.match(checkout, /const product = await readCheckoutProduct/);
  assert.doesNotMatch(catalog, /settlement_account/);
  assert.doesNotMatch(checkout, /settlement_account/);
});

test("관리 API도 settlement_account를 읽거나 쓰지 않는다", () => {
  const source = readFileSync("src/lib/clubs/lesson-management.api.ts", "utf8");
  assert.doesNotMatch(source, /settlement_account/);
  assert.match(source, /\.eq\("club_id", input\.clubId\)/);
});
