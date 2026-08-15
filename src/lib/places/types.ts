export type PlaceProvider = "KAKAO";

export type Place = {
  provider: PlaceProvider;
  providerPlaceId: string;
  name: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  placeUrl: string | null;
};

export type PlaceSearchResult = Place & {
  distanceMeters?: number | null;
};

export function isValidPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<Place>;
  return (
    place.provider === "KAKAO" &&
    typeof place.providerPlaceId === "string" &&
    place.providerPlaceId.trim().length > 0 &&
    typeof place.name === "string" &&
    place.name.trim().length > 0 &&
    typeof place.latitude === "number" &&
    Number.isFinite(place.latitude) &&
    place.latitude >= -90 &&
    place.latitude <= 90 &&
    typeof place.longitude === "number" &&
    Number.isFinite(place.longitude) &&
    place.longitude >= -180 &&
    place.longitude <= 180
  );
}

export function normalizePlaceQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function normalizeKakaoPlace(raw: Record<string, unknown>): Place | null {
  const id = String(raw["id"] ?? "").trim();
  const name = String(raw["place_name"] ?? "").trim();
  const longitude = Number(raw["x"]);
  const latitude = Number(raw["y"]);
  if (!id || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const place: Place = {
    provider: "KAKAO",
    providerPlaceId: id,
    name,
    roadAddress: String(raw["road_address_name"] ?? "").trim() || null,
    jibunAddress: String(raw["address_name"] ?? "").trim() || null,
    latitude,
    longitude,
    category: String(raw["category_name"] ?? "").trim() || null,
    placeUrl: String(raw["place_url"] ?? "").trim() || null,
  };
  return isValidPlace(place) ? place : null;
}

export function haversineDistanceKm(
  from: Pick<Place, "latitude" | "longitude">,
  to: Pick<Place, "latitude" | "longitude">,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
