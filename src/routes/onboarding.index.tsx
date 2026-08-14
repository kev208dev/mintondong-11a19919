import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, PlusCircle, RotateCw, Search, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logOnboardingNavigation } from "@/lib/auth/onboarding-debug";

export const Route = createFileRoute("/onboarding/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "민턴동 시작하기" },
      {
        name: "description",
        content: "동호회에 가입하거나 새 동호회를 만들고 민턴동을 시작하세요.",
      },
    ],
  }),
  component: ClubOnboardingPage,
});

function ClubOnboardingPage() {
  const navigate = useNavigate();
  const { user, loading, profileLoading, profileStatus } = useAuth();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      void navigate({ to: "/auth", search: { next: "/" }, replace: true });
    }
  }, [loading, profileLoading, user, navigate]);

  if (loading || profileLoading || profileStatus === "loading" || profileStatus === "missing") {
    return (
      <div className="flex h-40 items-center justify-center text-xs font-bold text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> 계정 정보를 확인하고 있어요
      </div>
    );
  }

  if (profileStatus === "error") {
    return (
      <section className="rounded-3xl border border-border bg-card p-5 text-center">
        <p className="text-sm font-extrabold text-foreground">계정 정보를 확인하지 못했어요.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          네트워크를 확인하고 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-secondary px-4 text-xs font-bold text-secondary-foreground"
        >
          <RotateCw className="size-3.5" /> 다시 시도
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-primary/10 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <h2 className="mt-3 text-xl font-extrabold tracking-tight text-foreground">
          동호회 하나만 연결하면 준비 끝
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          이미 활동 중인 동호회에 가입하거나, 직접 새 동호회를 만들 수 있어요. 둘 중 하나만 완료하면
          다음부터는 이 화면이 나오지 않아요.
        </p>
      </div>

      <div className="grid gap-2.5">
        <Link
          to="/clubs/find"
          onClick={() => logOnboardingNavigation("/onboarding", "/clubs/find")}
          className="flex min-h-24 items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 active:bg-accent"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            <Search className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-foreground">
              동호회 찾아서 가입하기
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              이름이나 지역으로 공개 동호회를 찾아 바로 가입할 수 있어요.
            </span>
          </span>
        </Link>

        <Link
          to="/clubs/new"
          onClick={() => logOnboardingNavigation("/onboarding", "/clubs/new")}
          className="flex min-h-24 items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 active:bg-accent"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            <PlusCircle className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-foreground">새 동호회 만들기</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              운영할 동호회가 있다면 기본 정보만 입력하고 바로 시작해요.
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
