import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GUEST_MAX_PARTY_SIZE, GUEST_MIN_PARTY_SIZE } from "./guest-core";
import { isValidPlace, type Place } from "@/lib/places/types";

const offerId = z.object({ offerId: z.string().uuid() });

export const listGuestOffersFn = createServerFn({ method: "GET" })
  .validator((value) =>
    z
      .object({
        region: z.string().trim().max(80).optional(),
        startsOn: z.string().date().optional(),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) =>
    (await import("./guest.server")).listGuestOffers({
      ...(data.region ? { region: data.region } : {}),
      ...(data.startsOn ? { startsOn: data.startsOn } : {}),
    }),
  );

export const getGuestOfferFn = createServerFn({ method: "GET" })
  .validator((value) => offerId.parse(value))
  .handler(async ({ data }) => (await import("./guest.server")).getGuestOffer(data.offerId));

export const createGuestBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    offerId
      .extend({ partySize: z.number().int().min(GUEST_MIN_PARTY_SIZE).max(GUEST_MAX_PARTY_SIZE) })
      .parse(value),
  )
  .handler(async ({ data, context }) =>
    (await import("./guest.server")).createGuestBooking(
      context.userId,
      data.offerId,
      data.partySize,
    ),
  );

export const listMyGuestBookingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await import("./guest.server")).listMyGuestBookings(context.userId),
  );

export const createGuestOfferFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        clubId: z.string().uuid(),
        title: z.string().trim().min(1).max(120),
        place: z.custom<Place>(isValidPlace, "검색 결과에서 장소를 선택해 주세요."),
        locationNote: z.string().trim().max(300).optional(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        bookingOpensAt: z.string().datetime().optional(),
        bookingClosesAt: z.string().datetime(),
        capacity: z.number().int().min(2).max(200),
        pricePerPerson: z.number().int().min(0),
        skillNote: z.string().max(200).optional(),
        instructions: z.string().max(2000).optional(),
        parkingAvailable: z.boolean().optional(),
        showerAvailable: z.boolean().optional(),
        shuttlecockIncluded: z.boolean().optional(),
        cancellationPolicy: z.string().max(2000).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) =>
    (await import("./guest.server")).createGuestOffer(context.userId, {
      clubId: data.clubId,
      title: data.title,
      place: data.place,
      ...(data.locationNote ? { locationNote: data.locationNote } : {}),
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      ...(data.bookingOpensAt ? { bookingOpensAt: data.bookingOpensAt } : {}),
      bookingClosesAt: data.bookingClosesAt,
      capacity: data.capacity,
      pricePerPerson: data.pricePerPerson,
      ...(data.skillNote ? { skillNote: data.skillNote } : {}),
      ...(data.instructions ? { instructions: data.instructions } : {}),
      ...(data.parkingAvailable !== undefined ? { parkingAvailable: data.parkingAvailable } : {}),
      ...(data.showerAvailable !== undefined ? { showerAvailable: data.showerAvailable } : {}),
      ...(data.shuttlecockIncluded !== undefined
        ? { shuttlecockIncluded: data.shuttlecockIncluded }
        : {}),
      ...(data.cancellationPolicy ? { cancellationPolicy: data.cancellationPolicy } : {}),
    }),
  );

export const listManagedGuestOffersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((value) => z.object({ clubId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) =>
    (await import("./guest.server")).listManagedGuestOffers(context.userId, data.clubId),
  );
