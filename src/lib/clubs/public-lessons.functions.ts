import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicLessonProduct = {
  id: string;
  clubId: string;
  coachName: string;
  description: string | null;
  specialties: string[];
  levelLabel: string | null;
  durationMin: number;
  priceWon: number;
  weekdays: number[];
  startHour: number;
  endHour: number;
};

export type PublicLessonCatalog = {
  club: {
    id: string;
    name: string;
    location: string | null;
    lessonsEnabled: boolean;
  } | null;
  lessons: PublicLessonProduct[];
};

function missingColumn(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/** 예약자·회원·정산계좌·결제 정보가 들어오지 않는 PG 심사용 공개 read model. */
export const getPublicLessonCatalog = createServerFn({ method: "GET" })
  .validator((input: { clubId: string }) => input)
  .handler(async ({ data }): Promise<PublicLessonCatalog> => {
    const clubId = data.clubId.trim();
    if (!clubId || clubId.length > 64 || !/^[a-zA-Z0-9-]+$/.test(clubId)) {
      return { club: null, lessons: [] };
    }

    const { adminClient, clientKey, rateLimit } = await import("@/lib/auth/account.server");
    if (!rateLimit(clientKey(getRequest().headers, "public-lessons"), 120, 60_000)) {
      throw new Error("too_many_requests");
    }
    const db = adminClient() as unknown as SupabaseClient;

    let clubResult = await db
      .from("clubs")
      .select("id, name, location, lessons_enabled, is_public")
      .eq("id", clubId)
      .maybeSingle();
    if (missingColumn(clubResult.error)) {
      clubResult = await db
        .from("clubs")
        .select("id, name, location, lessons_enabled")
        .eq("id", clubId)
        .maybeSingle();
    }
    if (clubResult.error) throw clubResult.error;
    if (!clubResult.data) return { club: null, lessons: [] };

    const clubRow = clubResult.data as Record<string, unknown>;
    // is_public 컬럼이 있는 스키마에서는 비공개 클럽 상품을 절대 반환하지 않는다.
    if (clubRow["is_public"] === false) return { club: null, lessons: [] };

    const { data: coachData, error: coachError } = await db
      .from("coaches")
      .select(
        "id, club_id, name, intro, specialties, level_label, duration_min, price, weekdays, start_hour, end_hour",
      )
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });
    if (coachError) throw coachError;

    const lessons = ((coachData ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row["id"]),
      clubId: String(row["club_id"]),
      coachName: String(row["name"] ?? ""),
      description: (row["intro"] as string | null) ?? null,
      specialties: Array.isArray(row["specialties"])
        ? row["specialties"].filter((item): item is string => typeof item === "string")
        : [],
      levelLabel: (row["level_label"] as string | null) ?? null,
      durationMin: Number(row["duration_min"] ?? 0),
      priceWon: Number(row["price"] ?? 0),
      weekdays: Array.isArray(row["weekdays"])
        ? row["weekdays"].filter((day): day is number => typeof day === "number")
        : [],
      startHour: Number(row["start_hour"] ?? 0),
      endHour: Number(row["end_hour"] ?? 0),
    }));

    return {
      club: {
        id: String(clubRow["id"]),
        name: String(clubRow["name"] ?? ""),
        location: (clubRow["location"] as string | null) ?? null,
        lessonsEnabled: Boolean(clubRow["lessons_enabled"]),
      },
      lessons,
    };
  });
