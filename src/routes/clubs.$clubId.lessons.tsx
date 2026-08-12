import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock3, GraduationCap, MapPin, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { clubKeys, getClub } from "@/lib/clubs/api";
import { getPublicLessonCatalog } from "@/lib/clubs/public-lessons.functions";
import { WEEKDAY_LABEL } from "@/lib/badminton/types";
import { won } from "@/lib/badminton/lessons";

export const Route = createFileRoute("/clubs/$clubId/lessons")({
  head: () => ({
    meta: [
      { title: "공개 레슨 상품 – 민턴동" },
      {
        name: "description",
        content: "배드민턴 클럽의 코치, 일정, 수업 시간과 원 단위 레슨 가격을 확인하세요.",
      },
      { property: "og:title", content: "배드민턴 레슨 – 민턴동" },
      { property: "og:description", content: "클럽별 공개 레슨 상품 정보를 확인하세요." },
    ],
  }),
  component: ClubDetailLessons,
});

function ClubDetailLessons() {
  const { clubId } = Route.useParams();
  const { user } = useAuth();
  const club = useQuery({ queryKey: clubKeys.detail(clubId), queryFn: () => getClub(clubId) });
  const lessons = useQuery({
    queryKey: clubKeys.publicLessons(clubId),
    queryFn: () => getPublicLessonCatalog({ data: { clubId } }),
  });

  if (lessons.isLoading) {
    return (
      <ul className="space-y-3" aria-label="레슨 정보를 불러오는 중">
        {[0, 1].map((item) => (
          <li key={item} className="h-48 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </ul>
    );
  }

  if (lessons.error) {
    return (
      <div className="rounded-2xl bg-secondary/60 p-8 text-center">
        <GraduationCap className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">레슨 정보를 불러오지 못했어요</p>
        <p className="mt-1 text-xs text-muted-foreground">잠시 후 다시 확인해 주세요.</p>
      </div>
    );
  }

  if (!lessons.data?.lessons.length) {
    return (
      <div className="rounded-2xl bg-secondary/60 p-8 text-center">
        <GraduationCap className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold text-foreground">등록된 레슨이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">
          동호회에서 실제 레슨 상품을 등록하면 코치와 가격이 이곳에 표시돼요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-secondary/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        아래 가격은 클럽이 등록한 1회 수업 기준 실제 상품 정보이며, 예약 전에 일정과 취소 조건을
        다시 확인할 수 있어요.
      </div>
      <ul className="space-y-3">
        {lessons.data.lessons.map((lesson) => {
          const schedule = lesson.weekdays
            .map((day) => WEEKDAY_LABEL[day])
            .filter(Boolean)
            .join("·");
          const validProduct = lesson.priceWon > 0 && lesson.durationMin > 0;
          const available = Boolean(lessons.data.club?.lessonsEnabled && validProduct);
          const next = `/clubs/${clubId}/lessons`;

          return (
            <li
              key={lesson.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 card-soft"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                    <UserRound className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{lesson.coachName} 코치</span>
                  </p>
                  {lesson.levelLabel ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-primary">
                      {lesson.levelLabel}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {available ? "신청 가능" : "신청 준비 중"}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                {lesson.description || "레슨 소개가 아직 등록되지 않았어요."}
              </p>

              {lesson.specialties.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="레슨 전문 분야">
                  {lesson.specialties.map((specialty) => (
                    <li
                      key={specialty}
                      className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground"
                    >
                      {specialty}
                    </li>
                  ))}
                </ul>
              ) : null}

              <dl className="mt-3 grid min-w-0 gap-2 rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground">
                <div className="flex min-w-0 items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <dt className="sr-only">장소</dt>
                  <dd className="min-w-0 break-words">
                    {lessons.data.club?.location || club.data?.region || "장소 미등록"}
                  </dd>
                </div>
                <div className="flex min-w-0 items-start gap-2">
                  <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <dt className="sr-only">요일과 시간</dt>
                  <dd className="min-w-0 break-words">
                    {schedule || "요일 미등록"}
                    {lesson.startHour < lesson.endHour
                      ? ` · ${String(lesson.startHour).padStart(2, "0")}:00–${String(lesson.endHour).padStart(2, "0")}:00`
                      : " · 시간 미등록"}
                  </dd>
                </div>
                <div className="flex min-w-0 items-start gap-2">
                  <Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <dt className="sr-only">수업 시간과 가격</dt>
                  <dd className="min-w-0 break-words font-extrabold text-foreground">
                    {validProduct
                      ? `${won(lesson.priceWon)} / ${lesson.durationMin}분`
                      : "가격 또는 수업 시간 미등록"}
                  </dd>
                </div>
              </dl>

              {available ? (
                user ? (
                  <Link
                    to="/lessons"
                    className="mt-3 flex h-11 items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground"
                  >
                    로그인 계정으로 신청하기
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    search={{ next }}
                    className="mt-3 flex h-11 items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground"
                  >
                    로그인 후 신청하기
                  </Link>
                )
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground"
                >
                  현재 신청할 수 없어요
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
