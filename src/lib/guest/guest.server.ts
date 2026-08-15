/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/auth/account.server";
import type { GuestBooking, GuestOffer } from "./types";
import { isValidPlace, type Place } from "@/lib/places/types";

type Row = {
  id?: any;
  name?: any;
  role?: any;
  owner_id?: any;
  club_id?: any;
  title?: any;
  venue_name?: any;
  address?: any;
  place_id?: any;
  location_note?: any;
  latitude?: any;
  longitude?: any;
  app_places?: any;
  starts_at?: any;
  ends_at?: any;
  booking_closes_at?: any;
  capacity?: any;
  price_per_person?: any;
  skill_note?: any;
  instructions?: any;
  parking_available?: any;
  shower_available?: any;
  shuttlecock_included?: any;
  cancellation_policy?: any;
  status?: any;
  party_size?: any;
  clubs?: any;
  offer_id?: any;
  user_id?: any;
  unit_price?: any;
  subtotal_amount?: any;
  platform_fee_amount?: any;
  total_amount?: any;
  provider_payout_amount?: any;
  payment_id?: any;
  created_at?: any;
  [key: string]: any;
};
const db = () => adminClient() as unknown as SupabaseClient;

function mapOffer(row: Row, clubName = "민턴동 클럽", remainingCapacity?: number): GuestOffer {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    clubName,
    title: String(row.title),
    venueName: String(row.venue_name),
    address: String(row.address),
    ...(row.place_id ? { placeId: String(row.place_id) } : {}),
    ...(row.location_note ? { locationNote: String(row.location_note) } : {}),
    ...(row.latitude != null ? { latitude: Number(row.latitude) } : {}),
    ...(row.longitude != null ? { longitude: Number(row.longitude) } : {}),
    ...((row.app_places as Row | null)?.["place_url"]
      ? { placeUrl: String((row.app_places as Row)["place_url"]) }
      : {}),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    bookingClosesAt: String(row.booking_closes_at),
    capacity: Number(row.capacity),
    remainingCapacity: Math.max(0, remainingCapacity ?? Number(row.capacity)),
    pricePerPerson: Number(row.price_per_person),
    skillNote: (row.skill_note as string | null) ?? null,
    instructions: (row.instructions as string | null) ?? null,
    parkingAvailable: Boolean(row.parking_available),
    showerAvailable: Boolean(row.shower_available),
    shuttlecockIncluded: Boolean(row.shuttlecock_included),
    cancellationPolicy: (row.cancellation_policy as string | null) ?? null,
    status: String(row.status),
  };
}

async function withRemainingCapacity(offer: GuestOffer): Promise<GuestOffer> {
  const { data, error } = await db()
    .from("guest_bookings")
    .select("party_size")
    .eq("offer_id", offer.id)
    .in("status", ["pending", "payment_pending", "confirmed"]);
  if (error) throw error;
  const reserved = (data ?? []).reduce((sum, row) => sum + Number((row as Row).party_size ?? 0), 0);
  return { ...offer, remainingCapacity: Math.max(0, offer.capacity - reserved) };
}

export async function listGuestOffers(filters?: { region?: string; startsOn?: string }) {
  const now = new Date().toISOString();
  let query = db()
    .from("guest_offers")
    .select("*, clubs(name), app_places(place_url)")
    .in("status", ["open", "full"])
    .lte("booking_opens_at", now)
    .gte("booking_closes_at", now)
    .order("starts_at", { ascending: true })
    .limit(50);
  if (filters?.startsOn) {
    query = query
      .gte("starts_at", `${filters.startsOn}T00:00:00+09:00`)
      .lt("starts_at", `${filters.startsOn}T24:00:00+09:00`);
  }
  if (filters?.region) query = query.ilike("address", `%${filters.region}%`);
  const { data, error } = await query;
  if (error) throw error;
  const offers = (data ?? []).map((row) => {
    const item = row as Row;
    const clubs = item.clubs as Row | null;
    return mapOffer(item, clubs ? String(clubs.name) : undefined);
  });
  return Promise.all(offers.map(withRemainingCapacity));
}

export async function getGuestOffer(id: string) {
  const { data, error } = await db()
    .from("guest_offers")
    .select("*, clubs(name), app_places(place_url)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Row;
  const club = row.clubs as Row | null;
  return withRemainingCapacity(mapOffer(row, club ? String(club.name) : undefined));
}

export async function createGuestBooking(userId: string, offerId: string, partySize: number) {
  const { data, error } = await db().rpc("create_guest_booking", {
    p_offer_id: offerId,
    p_party_size: partySize,
    p_user_id: userId,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Row;
  if (!row) throw new Error("GUEST_BOOKING_CREATE_FAILED");
  return mapBooking(row);
}

function mapBooking(row: Row): GuestBooking {
  const offer = row["guest_offers"] as Row | null;
  return {
    id: String(row.id),
    offerId: String(row.offer_id),
    userId: String(row.user_id),
    partySize: Number(row.party_size),
    unitPrice: Number(row.unit_price),
    subtotalAmount: Number(row.subtotal_amount),
    platformFeeAmount: Number(row.platform_fee_amount),
    totalAmount: Number(row.total_amount),
    providerPayoutAmount: Number(row.provider_payout_amount),
    paymentId: (row.payment_id as string | null) ?? null,
    status: String(row.status),
    createdAt: String(row.created_at),
    ...(offer?.["title"] ? { offerTitle: String(offer["title"]) } : {}),
    ...(offer?.["starts_at"] ? { startsAt: String(offer["starts_at"]) } : {}),
    ...(offer?.["venue_name"] ? { venueName: String(offer["venue_name"]) } : {}),
  };
}

export async function listMyGuestBookings(userId: string) {
  const { data, error } = await db()
    .from("guest_bookings")
    .select("*, guest_offers(title,starts_at,venue_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => mapBooking(row as Row));
}

export async function createGuestOffer(
  userId: string,
  input: {
    clubId: string;
    title: string;
    place: Place;
    locationNote?: string;
    startsAt: string;
    endsAt: string;
    bookingOpensAt?: string;
    bookingClosesAt: string;
    capacity: number;
    pricePerPerson: number;
    skillNote?: string;
    instructions?: string;
    parkingAvailable?: boolean;
    showerAvailable?: boolean;
    shuttlecockIncluded?: boolean;
    cancellationPolicy?: string;
  },
) {
  if (!isValidPlace(input.place)) throw new Error("STRUCTURED_PLACE_REQUIRED");
  const { data: club, error: clubError } = await db()
    .from("clubs")
    .select("id,owner_id")
    .eq("id", input.clubId)
    .maybeSingle();
  if (clubError) throw clubError;
  const { data: membership, error: membershipError } = await db()
    .from("club_members")
    .select("role,status")
    .eq("club_id", input.clubId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (
    !club ||
    (String((club as Row).owner_id) !== userId &&
      !["owner", "admin"].includes(String((membership as Row | null)?.role)))
  )
    throw new Error("GUEST_OFFER_FORBIDDEN");
  const { data: canonicalPlace, error: placeError } = await db()
    .from("app_places")
    .upsert(
      {
        provider: input.place.provider,
        provider_place_id: input.place.providerPlaceId,
        name: input.place.name.trim(),
        road_address: input.place.roadAddress,
        jibun_address: input.place.jibunAddress,
        latitude: input.place.latitude,
        longitude: input.place.longitude,
        category: input.place.category,
        place_url: input.place.placeUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_place_id" },
    )
    .select("id")
    .single();
  if (placeError) throw placeError;
  const { data, error } = await db()
    .from("guest_offers")
    .insert({
      club_id: input.clubId,
      created_by: userId,
      title: input.title.trim(),
      venue_name: input.place.name.trim(),
      address: input.place.roadAddress ?? input.place.jibunAddress ?? input.place.name.trim(),
      place_id: (canonicalPlace as Row).id,
      location_note: input.locationNote?.trim() || null,
      latitude: input.place.latitude,
      longitude: input.place.longitude,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      booking_opens_at: input.bookingOpensAt ?? new Date().toISOString(),
      booking_closes_at: input.bookingClosesAt,
      capacity: input.capacity,
      price_per_person: input.pricePerPerson,
      skill_note: input.skillNote?.trim() || null,
      instructions: input.instructions?.trim() || null,
      parking_available: input.parkingAvailable ?? false,
      shower_available: input.showerAvailable ?? false,
      shuttlecock_included: input.shuttlecockIncluded ?? false,
      cancellation_policy: input.cancellationPolicy?.trim() || null,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapOffer(data as Row);
}

export async function listManagedGuestOffers(userId: string, clubId: string) {
  const { data: club, error: clubError } = await db()
    .from("clubs")
    .select("id,owner_id")
    .eq("id", clubId)
    .maybeSingle();
  if (clubError) throw clubError;
  const { data: membership, error: membershipError } = await db()
    .from("club_members")
    .select("role,status")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (
    !club ||
    (String((club as Row).owner_id) !== userId &&
      !["owner", "admin"].includes(String((membership as Row | null)?.role)))
  )
    throw new Error("GUEST_OFFER_FORBIDDEN");

  const { data, error } = await db()
    .from("guest_offers")
    .select("*, guest_bookings(id,party_size,status,total_amount,provider_payout_amount)")
    .eq("club_id", clubId)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const item = row as Row;
    const bookings = Array.isArray(item["guest_bookings"]) ? (item["guest_bookings"] as Row[]) : [];
    const active = bookings.filter((booking) =>
      ["pending", "payment_pending", "confirmed"].includes(String(booking.status)),
    );
    return {
      offer: mapOffer(item),
      bookingCount: active.length,
      reservedPartySize: active.reduce((sum, booking) => sum + Number(booking.party_size ?? 0), 0),
      expectedPayout: active.reduce(
        (sum, booking) => sum + Number(booking.provider_payout_amount ?? 0),
        0,
      ),
    };
  });
}
