import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/club/manage_/lessons")({
  component: LegacyLessonManagementRedirect,
});

function LegacyLessonManagementRedirect() {
  return (
    <section className="rounded-3xl bg-brand-wash p-7 text-center">
      <h1 className="type-section-title">레슨 상품 관리는 종료되었어요</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        동호회 관리에서 게스트 모집을 만들고 예약 현황을 확인할 수 있어요.
      </p>
      <Link
        to="/club/manage/guest"
        className="mt-5 inline-flex h-11 items-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
      >
        게스트 모집 관리
      </Link>
    </section>
  );
}
