import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  GraduationCap,
  MapPin,
  Megaphone,
  Search,
  UserCheck,
  Zap,
} from "lucide-react";
import { HomeTournamentSection } from "@/components/tournaments/HomeTournamentSection";
import { Capacitor } from "@capacitor/core";
import { useStore, useTodayPlayers } from "@/lib/badminton/store";
import { won } from "@/lib/badminton/lessons";
import { clubKeys, searchPublicClubs } from "@/lib/clubs/api";
import { getPublicLessonCatalog } from "@/lib/clubs/public-lessons.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "민턴동 – 배드민턴 동호회 운영·레슨 예약" },
      {
        name: "description",
        content:
          "배드민턴 동호회 운영과 공개 레슨 상품의 코치, 수업 시간, 장소, 가격을 확인하고 신청할 수 있는 민턴동.",
      },
      { property: "og:title", content: "민턴동 – 배드민턴 동호회 운영·레슨 예약" },
      {
        property: "og:description",
        content: "배드민턴 클럽 관리와 실제 레슨 상품·가격 확인을 한 곳에서.",
      },
    ],
  }),
  component: HomePage,
});

function SectionHeader({ title, to, cta }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-extrabold text-foreground">{title}</h2>
      {to ? (
        <Link to={to} className="flex items-center text-[11px] font-bold text-primary">
          {cta ?? "더보기"} <ChevronRight className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}

function HomePage() {
  const { club, can } = useStore();
  const { coming, counts } = useTodayPlayers();
  const publicClubs = useQuery({
    queryKey: clubKeys.search(""),
    queryFn: () => searchPublicClubs(""),
  });
  const featuredClub = publicClubs.data?.find((item) => item.lessons_enabled);
  const featuredLessons = useQuery({
    queryKey: featuredClub
      ? [...clubKeys.publicLessons(featuredClub.id), "home"]
      : ["clubs", "public-lessons", "home", "none"],
    queryFn: () => getPublicLessonCatalog({ data: { clubId: featuredClub!.id } }),
    enabled: Boolean(featuredClub),
  });
  const featuredCatalog = featuredLessons.data;
  const featuredCatalogClub = featuredCatalog?.club ?? null;
  const liveMatches = club.matches.filter((m) => m.status === "LIVE");
  const doneCount = club.matches.filter((m) => m.status === "DONE").length;
  const checkedIn = club.checkedIn.length;
  const canSettings = can("MANAGE_CLUB_SETTINGS");
  const placeUnset = !club.club.location || club.club.location === "장소 미설정";
  const scheduleUnset = club.sessionLabel === "운동 일정 미설정";

  return (
    <div className="space-y-4">
      <section className="px-1">
        {Capacitor.getPlatform() === "ios" ? (
          <div className="mb-3 flex items-center gap-2">
            <img
              src="/mintondong-logo.png"
              alt="민턴동"
              width={40}
              height={40}
              className="size-10 rounded-xl object-contain"
            />
            <span className="text-sm font-extrabold tracking-tight text-foreground">민턴동</span>
          </div>
        ) : null}
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          배드민턴 동호회 운영을 더 간편하게
        </h1>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          출석 · 경기 배정 · 회원 관리 · 일정 관리 · 레슨 예약
        </p>
      </section>

      <Link
        to="/clubs/find"
        className="flex min-w-0 items-center gap-3 rounded-2xl border border-primary/20 bg-card p-3.5 card-soft active:bg-accent"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-keep text-xs font-extrabold text-foreground">
            배드민턴 클럽과 레슨 상품을 찾고 신청해보세요.
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            코치 · 일정 · 수업 시간 · 가격 확인
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-primary" />
      </Link>

      <section id="lesson-products" aria-labelledby="lesson-products-title">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <h2 id="lesson-products-title" className="text-[13px] font-extrabold text-foreground">
            판매 중인 레슨 상품
          </h2>
          <Link to="/clubs/find" className="flex items-center text-[11px] font-bold text-primary">
            전체 보기 <ChevronRight className="size-3" />
          </Link>
        </div>

        {publicClubs.isLoading || (featuredClub && featuredLessons.isLoading) ? (
          <div
            className="h-36 animate-pulse rounded-2xl bg-secondary"
            aria-label="레슨 상품 불러오는 중"
          />
        ) : featuredCatalog?.lessons.length && featuredCatalogClub ? (
          <ul className="space-y-2">
            {featuredCatalog.lessons.slice(0, 3).map((lesson) => (
              <li key={lesson.id}>
                <article className="rounded-2xl border border-border bg-card p-4 card-soft">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-primary">레슨 상품</p>
                      <h3 className="mt-0.5 truncate text-sm font-extrabold text-foreground">
                        {lesson.coachName} 코치 {lesson.durationMin}분 레슨
                      </h3>
                      <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {featuredCatalogClub.name} ·{" "}
                          {featuredCatalogClub.location || "장소 미등록"}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground">상품 가격</p>
                      <p className="text-base font-extrabold tabular-nums text-primary">
                        {won(lesson.priceWon)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {lesson.description ||
                      "배드민턴 레슨 상품입니다. 상세 일정과 수업 정보를 확인해 주세요."}
                  </p>
                  <Link
                    to="/clubs/$clubId/lessons"
                    params={{ clubId: lesson.clubId }}
                    className="mt-3 flex h-10 items-center justify-center rounded-xl bg-secondary text-xs font-extrabold text-secondary-foreground active:bg-accent"
                  >
                    상품 상세 설명 · 가격 보기
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <GraduationCap className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1.5 text-xs font-bold text-foreground">
              현재 판매 중인 레슨 상품을 확인 중이에요
            </p>
            <Link to="/clubs/find" className="mt-1 inline-block text-[11px] font-bold text-primary">
              공개 클럽과 레슨 보기
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-brand-deep p-4 text-primary-foreground">
        <p className="text-[11px] font-semibold opacity-75">오늘 운동 요약</p>
        <p className="mt-0.5 truncate text-[15px] font-extrabold">{club.club.name}</p>
        <p className="text-[11px] opacity-80">
          {scheduleUnset
            ? "정기 운동 일정이 아직 없어요"
            : `${club.sessionLabel} · ${club.sessionTime}`}
        </p>
        <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          {[
            { k: "참석", v: coming.length },
            { k: "체크인", v: checkedIn },
            { k: "미정", v: counts.MAYBE },
            { k: "완료 경기", v: doneCount },
          ].map((s) => (
            <div key={s.k} className="rounded-xl bg-primary-foreground/15 py-2">
              <dd className="text-base font-extrabold tabular-nums">{s.v}</dd>
              <dt className="text-[10.5px] opacity-80">{s.k}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/club/attendance"
            className="flex h-10 items-center justify-center rounded-xl bg-primary-foreground text-xs font-extrabold text-primary"
          >
            <UserCheck className="mr-1 size-4" /> 출석 체크
          </Link>
          <Link
            to="/games"
            className="flex h-10 items-center justify-center rounded-xl bg-primary-foreground/20 text-xs font-extrabold"
          >
            <Zap className="mr-1 size-4" /> 경기 배정
          </Link>
        </div>
      </section>

      {placeUnset ? (
        <section className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-xs font-bold text-foreground">
            오늘 운동 장소가 아직 설정되지 않았어요
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {canSettings
              ? "장소를 등록하면 회원들이 모임 위치를 바로 확인할 수 있어요."
              : "운영진이 장소를 등록하면 여기에 표시돼요."}
          </p>
          {canSettings ? (
            <Link
              to="/club/manage"
              className="mt-2.5 flex h-9 items-center justify-center rounded-xl bg-secondary text-xs font-bold text-secondary-foreground"
            >
              장소 설정하기
            </Link>
          ) : null}
        </section>
      ) : null}

      <section>
        <SectionHeader title="진행 중인 경기" to="/games" cta="경기" />
        {liveMatches.length > 0 ? (
          <ul className="space-y-2">
            {liveMatches.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-card p-3"
              >
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-destructive-foreground">
                  <span className="size-1.5 rounded-full bg-destructive-foreground" /> LIVE
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                  코트 {m.courtIndex + 1}
                </span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-foreground">
                  {m.scoreA} : {m.scoreB}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Zap className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1.5 text-xs font-bold text-foreground">지금 진행 중인 경기가 없어요</p>
            <Link to="/games" className="mt-1 inline-block text-[11px] font-bold text-primary">
              경기 배정 시작하기
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="다가오는 일정" to="/club/schedule" cta="일정" />
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <li className="flex items-center gap-2.5 px-3.5 py-3">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-foreground">
                {scheduleUnset ? "등록된 운동 일정이 없어요" : club.sessionLabel}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {scheduleUnset
                  ? canSettings
                    ? "정기 운동 요일과 시간을 등록해 보세요."
                    : "운영진이 일정을 등록하면 알려드려요."
                  : club.sessionTime}
              </span>
            </span>
          </li>
        </ul>
      </section>

      <HomeTournamentSection />

      <section>
        <SectionHeader title="최근 공지" to="/club/notices" />
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Megaphone className="mx-auto size-4 text-muted-foreground" />
          <p className="mt-1.5 text-xs text-muted-foreground">아직 등록된 공지가 없어요.</p>
        </div>
      </section>

      <Link
        to="/clubs/find"
        className="flex h-11 items-center justify-center rounded-2xl bg-secondary text-xs font-bold text-secondary-foreground active:bg-accent"
      >
        <Search className="mr-1.5 size-4" /> 동호회와 레슨 찾기
      </Link>
    </div>
  );
}
