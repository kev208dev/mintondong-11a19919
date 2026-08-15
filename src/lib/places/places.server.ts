import { requireServerEnv } from "@/lib/server-env.server";
import {
  normalizeKakaoPlace,
  normalizePlaceQuery,
  type PlaceSearchResult,
  type Place,
} from "./types";
import { adminClient } from "@/lib/auth/account.server";

const KAKAO_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const MAX_RESULTS = 15;

export async function upsertCanonicalPlace(place: Place): Promise<string> {
  const { data, error } = await adminClient()
    .from("app_places")
    .upsert(
      {
        provider: place.provider,
        provider_place_id: place.providerPlaceId,
        name: place.name.trim(),
        road_address: place.roadAddress,
        jibun_address: place.jibunAddress,
        latitude: place.latitude,
        longitude: place.longitude,
        category: place.category,
        place_url: place.placeUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_place_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return String((data as { id: string }).id);
}

export async function attachPlaceToClub(userId: string, clubId: string, placeId: string) {
  const client = adminClient();
  const { data: club, error: clubError } = await client
    .from("clubs")
    .select("id, owner_id")
    .eq("id", clubId)
    .maybeSingle();
  if (clubError) throw clubError;
  if (!club || String((club as { owner_id: string }).owner_id) !== userId) {
    throw new Error("PLACE_ATTACH_FORBIDDEN");
  }
  const { error } = await client.from("clubs").update({ place_id: placeId }).eq("id", clubId);
  if (error && error.code !== "42703" && error.code !== "PGRST204") throw error;
}

export async function searchKakaoPlaces(input: {
  query: string;
  longitude?: number;
  latitude?: number;
  radius?: number;
}): Promise<PlaceSearchResult[]> {
  const query = normalizePlaceQuery(input.query);
  if (query.length < 2) return [];
  const apiKey = requireServerEnv("KAKAO_REST_API_KEY");
  const url = new URL(KAKAO_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("size", String(MAX_RESULTS));
  if (Number.isFinite(input.longitude) && Number.isFinite(input.latitude)) {
    url.searchParams.set("x", String(input.longitude));
    url.searchParams.set("y", String(input.latitude));
    url.searchParams.set("sort", "distance");
    if (Number.isFinite(input.radius)) {
      url.searchParams.set("radius", String(Math.min(20_000, Math.max(0, input.radius!))));
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`KAKAO_PLACE_SEARCH_${response.status}`);
    const payload = (await response.json()) as { documents?: Record<string, unknown>[] };
    return (payload.documents ?? [])
      .map(normalizeKakaoPlace)
      .filter((place): place is NonNullable<typeof place> => Boolean(place))
      .slice(0, MAX_RESULTS)
      .map((place) => place);
  } finally {
    clearTimeout(timeout);
  }
}
