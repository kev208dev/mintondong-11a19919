import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidPlace, type Place } from "./types";

export const searchPlacesFn = createServerFn({ method: "GET" })
  .validator((value) =>
    z
      .object({
        query: z.string().trim().min(2).max(80),
        latitude: z.number().finite().min(-90).max(90).optional(),
        longitude: z.number().finite().min(-180).max(180).optional(),
        radius: z.number().int().min(0).max(20_000).optional(),
      })
      .refine((input) => (input.latitude == null) === (input.longitude == null), {
        message: "latitude and longitude must be provided together",
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const { clientKey, rateLimit } = await import("@/lib/auth/account.server");
    const request = getRequest();
    if (request?.headers && !rateLimit(clientKey(request.headers, "places-search"), 60, 60_000)) {
      throw new Error("PLACE_SEARCH_RATE_LIMITED");
    }
    return (await import("./places.server")).searchKakaoPlaces({
      query: data.query,
      ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
      ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
      ...(data.radius !== undefined ? { radius: data.radius } : {}),
    });
  });

const placeSchema = z.custom<Place>(isValidPlace, "검색 결과에서 장소를 선택해 주세요.");

export const savePlaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) => z.object({ place: placeSchema }).parse(value))
  .handler(async ({ data }) => {
    const { upsertCanonicalPlace } = await import("./places.server");
    return upsertCanonicalPlace(data.place);
  });

export const attachClubPlaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z.object({ clubId: z.string().uuid(), placeId: z.string().uuid() }).parse(value),
  )
  .handler(async ({ data, context }) => {
    const { attachPlaceToClub } = await import("./places.server");
    await attachPlaceToClub(context.userId, data.clubId, data.placeId);
    return { ok: true };
  });
