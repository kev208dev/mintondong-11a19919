import assert from "node:assert/strict";
import test from "node:test";
import {
  haversineDistanceKm,
  isValidPlace,
  normalizeKakaoPlace,
  normalizePlaceQuery,
} from "../src/lib/places/types.ts";

test("normalizes Kakao place fields and coordinates", () => {
  const place = normalizeKakaoPlace({
    id: "123",
    place_name: "강남스포츠문화센터",
    road_address_name: "서울 강남구 밤고개로",
    address_name: "서울 강남구 수서동",
    category_name: "스포츠시설",
    x: "127.105",
    y: "37.488",
    place_url: "https://place.map.kakao.com/123",
  });
  assert.equal(place?.provider, "KAKAO");
  assert.equal(place?.providerPlaceId, "123");
  assert.equal(place?.longitude, 127.105);
  assert.equal(place?.latitude, 37.488);
  assert.equal(isValidPlace(place), true);
});

test("rejects places without a provider id or coordinates", () => {
  assert.equal(normalizeKakaoPlace({ id: "", place_name: "체육관", x: "127", y: "37" }), null);
  assert.equal(isValidPlace({ provider: "KAKAO", providerPlaceId: "1", name: "체육관" }), false);
});

test("normalizes bounded search input and calculates coordinate distance", () => {
  assert.equal(normalizePlaceQuery("  강남   체육관 "), "강남 체육관");
  const distance = haversineDistanceKm(
    { latitude: 37.5665, longitude: 126.978 },
    { latitude: 37.5651, longitude: 126.9895 },
  );
  assert.ok(distance > 0.9 && distance < 1.2);
});
