import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateGuestBookingPrice } from "../src/lib/guest/guest-core.ts";

test("guest booking price snapshots subtotal, fee and payout", () => {
  assert.deepEqual(calculateGuestBookingPrice({ partySize: 4, unitPrice: 8000 }), {
    partySize: 4,
    unitPrice: 8000,
    subtotalAmount: 32000,
    platformFeeAmount: 3200,
    totalAmount: 35200,
    providerPayoutAmount: 32000,
  });
});

test("guest party size is limited to 2 through 20", () => {
  assert.throws(
    () => calculateGuestBookingPrice({ partySize: 1, unitPrice: 1000 }),
    /INVALID_PARTY_SIZE/,
  );
  assert.throws(
    () => calculateGuestBookingPrice({ partySize: 21, unitPrice: 1000 }),
    /INVALID_PARTY_SIZE/,
  );
  assert.equal(calculateGuestBookingPrice({ partySize: 20, unitPrice: 1000 }).totalAmount, 22000);
});

test("guest migration keeps capacity and notification writes server-controlled", () => {
  const migration = readFileSync(
    "supabase/migrations/20260815120000_guest_marketplace_notifications.sql",
    "utf8",
  );
  assert.match(migration, /for update/);
  assert.match(migration, /capacity exceeded|CAPACITY_EXCEEDED/i);
  assert.match(migration, /guest_bookings_active_user_offer_idx/);
  assert.match(migration, /alter table public\.user_notifications enable row level security/);
  assert.match(migration, /grant update \(read_at\) on public\.user_notifications/);
  assert.match(migration, /grant execute on function public\.create_guest_booking/);
});
