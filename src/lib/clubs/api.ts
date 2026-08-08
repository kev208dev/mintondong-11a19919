import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * 외부 Supabase(mintondong) 의 clubs / club_members 를 직접 사용한다.
 * 생성된 types.ts 는 신규 컬럼(description, is_public ...) 과 RPC 를 아직 모르므로
 * 느슨하게 타입된 클라이언트로 접근하고, 반환 타입은 아래 인터페이스로 좁힌다.
 *
 * 지역은 기존 clubs.location 컬럼을 canonical 로 사용하며, UI 에서는 region 으로 노출한다.
 */
const db = supabase as unknown as SupabaseClient;

export type ClubRow = {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  /** 기존 clubs.location 의 별칭 */
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
  "id, name, description, profile_image_url, cover_image_url, region:location, is_public, owner_id, member_count, created_at";

const MEMBER_COLUMNS = "id, club_id, user_id, name, role, status, joined_at, level";

/** RPC 는 원본 컬럼(location)을 반환하므로 UI 형태로 정규화한다. */
function normalizeClub(row: Record<string, unknown>): ClubRow {
  return {
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    description: (row["description"] as string | null) ?? null,
    profile_image_url: (row["profile_image_url"] as string | null) ?? null,
    cover_image_url: (row["cover_image_url"] as string | null) ?? null,
    region: ((row["region"] ?? row["location"]) as string | null) ?? null,
    is_public: Boolean(row["is_public"]),
    owner_id: String(row["owner_id"] ?? ""),
    member_count: Number(row["member_count"] ?? 0),
    created_at: String(row["created_at"] ?? new Date().toISOString()),
  };
}


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
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeClub);
}

export async function getClub(id: string): Promise<ClubRow | null> {
  const { data, error } = await db.from("clubs").select(CLUB_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeClub(data as Record<string, unknown>) : null;
}

export async function listClubMembers(clubId: string): Promise<ClubMemberRow[]> {
  const { data, error } = await db
    .from("club_members")
    .select(MEMBER_COLUMNS)
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ClubMemberRow[];
}

export async function getMyMembership(clubId: string, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await db
    .from("club_members")
    .select(MEMBER_COLUMNS)
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
  return ((data ?? []) as unknown as { clubs: Record<string, unknown> }[])
    .map((r) => r.clubs)
    .filter(Boolean)
    .map(normalizeClub);
}

/**
 * 스토리지 정책상 경로는 clubs/<club_id>/... 이어야 하고,
 * 해당 동호회의 owner/admin 만 업로드할 수 있다.
 */
export async function uploadClubImage(file: File, clubId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `clubs/${clubId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from("club-images").upload(path, file, { upsert: false });
  if (error) throw error;
  return db.storage.from("club-images").getPublicUrl(path).data.publicUrl;
}

export type CreateClubInput = {
  name: string;
  /** UI 의 지역 입력값 — 기존 clubs.location 에 저장된다. */
  region: string;
  description: string;
  isPublic: boolean;
  /** 선택한 프로필 이미지. 동호회 생성 이후 업로드된다. */
  imageFile?: File | null;
};

/**
 * 동호회 생성은 RPC 로 원자적으로 처리한다.
 * (clubs INSERT + owner club_members INSERT 가 한 트랜잭션, invite_code 자동 생성,
 *  owner name 은 profiles.display_name → 이메일 앞부분 → '회원' 순으로 fallback)
 * 이미지 업로드는 club_id 기반 경로가 필요하므로 생성 후 수행하고 실패해도 생성은 유지한다.
 */
export async function createClub(input: CreateClubInput): Promise<ClubRow> {
  const { data, error } = await db.rpc("create_club_with_owner", {
    p_name: input.name.trim(),
    p_location: input.region.trim() || null,
    p_description: input.description.trim() || null,
    p_is_public: input.isPublic,
    p_profile_image_url: null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  let club = normalizeClub(row as Record<string, unknown>);

  if (input.imageFile) {
    const url = await uploadClubImage(input.imageFile, club.id);
    const { data: updated, error: updateError } = await db
      .from("clubs")
      .update({ profile_image_url: url })
      .eq("id", club.id)
      .select(CLUB_COLUMNS)
      .single();
    if (updateError) throw updateError;
    club = normalizeClub(updated as Record<string, unknown>);
  }

  return club;
}

/**
 * 가입 신청. 공개 동호회는 즉시 active, 비공개는 pending 으로 생성된다(서버에서 결정).
 * 클라이언트가 role/status 를 지정할 수 없다.
 */
export async function joinClub(clubId: string): Promise<ClubMemberRow> {
  const { data, error } = await db.rpc("request_club_join", { p_club_id: clubId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as unknown as ClubMemberRow;
}

/** 동호회 소유자용 멤버 관리 (승인 / 역할 변경) */
export async function setClubMemberState(
  memberId: string,
  next: { role?: "admin" | "member"; status?: "active" | "pending" },
): Promise<ClubMemberRow> {
  const { data, error } = await db.rpc("set_club_member_state", {
    p_member_id: memberId,
    p_role: next.role ?? null,
    p_status: next.status ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as unknown as ClubMemberRow;
}
