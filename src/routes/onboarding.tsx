import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PlusCircle, Search, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { NEXT_STORAGE_KEY } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/username";
import { clubKeys, listMyClubs } from "@/lib/clubs/api";

export const Route = createFileRoute("/onboarding")({
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
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const clubs = useQuery({
    queryKey: clubKeys.mine(user?.id ?? null),
    queryFn: () => listMyClubs(user?.id ?? null),
    enabled: !!user,
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/auth", search: { next: "/" }, replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || clubs.isLoading || clubs.isError || (clubs.data?.length ?? 0) === 0) return;

    let next = "/";
    try {
      next = safeNextPath(sessionStorage.getItem(NEXT_STORAGE_KEY));
      sessionStorage.removeItem(NEXT_STORAGE_KEY);
    } catch {
      next = "/";
    }
    void navigate({ to: next, replace: true });
  }, [user, clubs.isLoading, clubs.isError, clubs.data, navigate]);

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
          이미 활동 중인 동호회에 가입하거나, 직접 새 동호회를 만들 수 있어요. 둘 중 하나만
          완료하면 다음부터는 이 화면이 나오지 않아요.
        </p>
      </div>

      <div className="grid gap-2.5">
        <Link
          to="/clubs/find"
          className="flex min-h-24 items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 active:bg-accent"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            <Search className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-foreground">동호회 찾아서 가입하기</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              이름이나 지역으로 공개 동호회를 찾아 바로 가입할 수 있어요.
            </span>
          </span>
        </Link>

        <Link
          to="/clubs/new"
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

      {clubs.isError ? (
        <p className="px-1 text-center text-[11px] text-muted-foreground">
          동호회 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
    </section>
  );
}
