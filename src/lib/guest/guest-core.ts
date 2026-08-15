export const GUEST_MIN_PARTY_SIZE = 2;
export const GUEST_MAX_PARTY_SIZE = 20;
export const DEFAULT_PLATFORM_FEE_BPS = 1000;

export type GuestBookingPrice = {
  partySize: number;
  unitPrice: number;
  subtotalAmount: number;
  platformFeeAmount: number;
  totalAmount: number;
  providerPayoutAmount: number;
};

export function calculateGuestBookingPrice(input: {
  partySize: number;
  unitPrice: number;
  platformFeeBps?: number;
}): GuestBookingPrice {
  const partySize = Math.trunc(input.partySize);
  const unitPrice = Math.trunc(input.unitPrice);
  const platformFeeBps = Math.trunc(input.platformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);
  if (partySize < GUEST_MIN_PARTY_SIZE || partySize > GUEST_MAX_PARTY_SIZE) {
    throw new Error("INVALID_PARTY_SIZE");
  }
  if (unitPrice < 0 || platformFeeBps < 0 || platformFeeBps > 5000) {
    throw new Error("INVALID_GUEST_PRICE");
  }
  const subtotalAmount = unitPrice * partySize;
  const platformFeeAmount = Math.floor((subtotalAmount * platformFeeBps) / 10000);
  return {
    partySize,
    unitPrice,
    subtotalAmount,
    platformFeeAmount,
    totalAmount: subtotalAmount + platformFeeAmount,
    providerPayoutAmount: subtotalAmount,
  };
}

export function normalizeGuestStatus(status: unknown) {
  const value = String(status ?? "");
  return ["draft", "open", "full", "closed", "cancelled"].includes(value) ? value : "closed";
}
