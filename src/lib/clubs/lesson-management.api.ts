import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  canManageLessons,
  type LessonSaleInput,
  validateLessonSale,
} from "./lesson-management-core";

const db = supabase as unknown as SupabaseClient;

export type ManagedLessonClub = {
  id: string;
  name: string;
  location: string | null;
  isPublic: boolean;
  lessonsEnabled: boolean;
  role: "owner" | "admin";
};

export type ManagedLesson = LessonSaleInput & {
  id: string;
  clubId: string;
  createdAt: string;
  updatedAt: string;
};

const COACH_COLUMNS =
  "id, club_id, name, intro, specialties, level_label, duration_min, price, weekdays, start_hour, end_hour, is_active, created_at, updated_at";

function lessonFromRow(row: Record<string, unknown>): ManagedLesson {
  return {
    id: String(row["id"]),
    clubId: String(row["club_id"]),
    name: String(row["name"] ?? ""),
    intro: String(row["intro"] ?? ""),
    specialties: Array.isArray(row["specialties"])
      ? row["specialties"].filter((item): item is string => typeof item === "string")
      : [],
    levelLabel: String(row["level_label"] ?? ""),
    durationMin: Number(row["duration_min"]),
    priceWon: Number(row["price"]),
    weekdays: Array.isArray(row["weekdays"])
      ? row["weekdays"].filter((day): day is number => typeof day === "number")
      : [],
    startHour: Number(row["start_hour"]),
    endHour: Number(row["end_hour"]),
    isActive: row["is_active"] === true,
    createdAt: String(row["created_at"] ?? ""),
    updatedAt: String(row["updated_at"] ?? ""),
  };
}

export async function listManageableLessonClubs(userId: string): Promise<ManagedLessonClub[]> {
  const { data, error } = await db
    .from("club_members")
    .select("club_id, role, status, clubs!inner(id, name, location, is_public, lessons_enabled)")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).flatMap((row) => {
    const role = row["role"] as "owner" | "admin" | "member" | null;
    const status = row["status"] as "active" | "pending" | null;
    const club = row["clubs"] as Record<string, unknown> | null;
    if (!club || !canManageLessons(role, status)) return [];
    if (role !== "owner" && role !== "admin") return [];
    return [
      {
        id: String(club["id"]),
        name: String(club["name"] ?? ""),
        location: (club["location"] as string | null) ?? null,
        isPublic: club["is_public"] === true,
        lessonsEnabled: club["lessons_enabled"] === true,
        role,
      },
    ];
  });
}

export async function listManagedLessons(clubId: string): Promise<ManagedLesson[]> {
  const { data, error } = await db
    .from("coaches")
    .select(COACH_COLUMNS)
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(lessonFromRow);
}

export async function saveManagedLesson(input: {
  clubId: string;
  lessonId?: string;
  lesson: LessonSaleInput;
}): Promise<ManagedLesson> {
  const checked = validateLessonSale(input.lesson);
  if (!checked.ok) throw new Error(checked.errors.join("\n"));
  const value = checked.value;
  const payload = {
    name: value.name,
    intro: value.intro,
    specialties: value.specialties,
    level_label: value.levelLabel,
    duration_min: value.durationMin,
    price: value.priceWon,
    weekdays: value.weekdays,
    start_hour: value.startHour,
    end_hour: value.endHour,
    is_active: value.isActive,
  };
  const query = input.lessonId
    ? db
        .from("coaches")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", input.lessonId)
        .eq("club_id", input.clubId)
    : db.from("coaches").insert({ ...payload, club_id: input.clubId });
  const { data, error } = await query.select(COACH_COLUMNS).single();
  if (error) throw error;
  return lessonFromRow(data as Record<string, unknown>);
}

export async function setManagedLessonActive(input: {
  clubId: string;
  lessonId: string;
  isActive: boolean;
}): Promise<ManagedLesson> {
  const { data, error } = await db
    .from("coaches")
    .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
    .eq("id", input.lessonId)
    .eq("club_id", input.clubId)
    .select(COACH_COLUMNS)
    .single();
  if (error) throw error;
  return lessonFromRow(data as Record<string, unknown>);
}
