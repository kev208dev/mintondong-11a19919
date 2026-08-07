import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * 외부 Supabase(mintondong) 의 clubs / club_members 를 직접 사용한다.
 * 생성된 types.ts 는 신규 컬럼(description, region, is_public ...) 을 아직 모르므로
 * 느슨하게 타입된 클라이언트로 접근하고, 반환 타입은 아래 인터페이스로 좁힌다.
 */
const db = supabase as unknown as SupabaseClient;

export type ClubRow = {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  region: string | null;
  is_public: boolean;
  owner_id: string;
  member_count: number;
  created_at: string;
};

export type ClubMemberRow = {
  id: string;
  club_id: string;
  user_id: string | null;
  name: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
  joined_at: string;
  level: number;
};

const CLUB_COLUMNS =
  "id, name, description, profile_image_url, cover_image_url, region, is_public, owner_id, member_count, created_at";

export const clubKeys = {
  search: (q: string) => ["clubs", "search", q] as const,
  detail: (id: string) => ["clubs", "detail", id] as const,
  members: (id: string) => ["clubs", "members", id] as const,
  membership: (id: string, userId: string | null) => ["clubs", "membership", id, userId] as const,
  mine: (userId: string | null) => ["clubs", "mine", userId] as const,
};

export async function searchPublicClubs(q: string): Promise<ClubRow[]> {
  let query = db
    .from("clubs")
    .select(CLUB_COLUMNS)
    .eq("is_public", true)
    .order("member_count", { ascending: false })
    .limit(30);
  const term = q.trim();
  if (term) query = query.ilike("name", `%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ClubRow[];
}

export async function getClub(id: string): Promise<ClubRow | null> {
  const { data, error } = await db.from("clubs").select(CLUB_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as ClubRow) ?? null;
}

export async function listClubMembers(clubId: string): Promise<ClubMemberRow[]> {
  const { data, error } = await db
    .from("club_members")
    .select("id, club_id, user_id, name, role, status, joined_at, level")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ClubMemberRow[];
}

export async function getMyMembership(clubId: string, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await db
    .from("club_members")
    .select("id, club_id, user_id, name, role, status, joined_at, level")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ClubMemberRow) ?? null;
}

export async function listMyClubs(userId: string | null): Promise<ClubRow[]> {
  if (!userId) return [];
  const { data, error } = await db
    .from("club_members")
    .select(`club_id, clubs!inner(${CLUB_COLUMNS})`)
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return ((data ?? []) as unknown as { clubs: ClubRow }[]).map((r) => r.clubs).filter(Boolean);
}

function randomInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 7; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function uploadClubImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from("club-images").upload(path, file, { upsert: false });
  if (error) throw error;
  return db.storage.from("club-images").getPublicUrl(path).data.publicUrl;
}

export type CreateClubInput = {
  name: string;
  region: string;
  description: string;
  isPublic: boolean;
  profileImageUrl: string | null;
};

export async function createClub(
  input: CreateClubInput,
  user: { id: string; displayName: string },
): Promise<ClubRow> {
  const { data, error } = await db
    .from("clubs")
    .insert({
      name: input.name.trim(),
      region: input.region.trim() || null,
      location: input.region.trim() || "장소 미설정",
      description: input.description.trim() || null,
      profile_image_url: input.profileImageUrl,
      is_public: input.isPublic,
      owner_id: user.id,
      invite_code: randomInviteCode(),
    })
    .select(CLUB_COLUMNS)
    .single();
  if (error) throw error;
  const club = data as unknown as ClubRow;

  const { error: memberError } = await db.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    name: user.displayName,
    role: "owner",
    status: "active",
  });
  if (memberError) throw memberError;

  return club;
}

export async function joinClub(
  clubId: string,
  user: { id: string; displayName: string },
  isPublic: boolean,
) {
  const { error } = await db.from("club_members").insert({
    club_id: clubId,
    user_id: user.id,
    name: user.displayName,
    role: "member",
    status: isPublic ? "active" : "pending",
  });
  if (error) throw error;
}
