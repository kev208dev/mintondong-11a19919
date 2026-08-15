import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/lessons")({ component: LegacyLessonsRedirect });

function LegacyLessonsRedirect() {
  return (
    <section className="rounded-3xl bg-brand-wash p-7 text-center">
      <h1 className="type-section-title">레슨 예약 방식이 종료되었어요</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        이제 주변 동호회의 게스트 모집을 비교하고 예약할 수 있어요.
      </p>
      <Link
        to="/guest"
        className="mt-5 inline-flex h-11 items-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
      >
        게스트 찾아보기
      </Link>
    </section>
  );
}
