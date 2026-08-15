import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/clubs/$clubId/lessons_/$lessonId/checkout")({
  component: LegacyLessonCheckoutRedirect,
});

function LegacyLessonCheckoutRedirect() {
  return (
    <section className="rounded-3xl bg-brand-wash p-7 text-center">
      <h1 className="type-section-title">이 예약 방식은 종료되었어요</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        기존 레슨 결제를 다시 시작하지 않고 게스트 모집으로 안내해 드려요.
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
