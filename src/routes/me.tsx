import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LogOut, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/badminton/store";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "마이 – 민턴동" }] }),
  component: MePage,
});

function providerLabel(provider?: string) {
  return provider === "apple"
    ? "Apple"
    : provider === "google"
      ? "Google"
      : provider === "kakao"
        ? "카카오"
        : "이메일";
}

function MePage() {
  const { user, profile, loading, signOut } = useAuth();
  const { club, clubs } = useStore();
  const navigate = useNavigate();

  if (loading) return <div className="h-40 animate-pulse rounded-[20px] bg-secondary" />;
  if (!user)
    return (
      <section className="surface-card mt-8 p-6 text-center">
        <h1 className="page-heading">로그인이 필요해요</h1>
        <p className="mt-3 text-base text-muted-foreground">로그인하고 내 동호회를 확인하세요.</p>
        <Link
          to="/auth"
          search={{ next: "/me" }}
          className="mt-6 flex h-13 items-center justify-center rounded-2xl bg-brand-green text-base font-extrabold text-foreground"
        >
          로그인하기
        </Link>
      </section>
    );

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "나";
  return (
    <div className="space-y-8">
      <header className="pt-3">
        <h1 className="page-heading">마이</h1>
      </header>

      <section className="surface-card flex items-center gap-4 p-5">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-brand-green text-2xl font-extrabold text-foreground">
            {name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold">{name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-2 text-sm font-bold text-brand-green">
            {providerLabel(user.app_metadata?.provider as string | undefined)} 로그인
          </p>
        </div>
        <Link
          to="/account-deletion"
          aria-label="계정 설정"
          className="grid size-11 place-items-center rounded-full bg-secondary"
        >
          <Settings className="size-5" />
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">내 활동</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/club" className="surface-card p-5 active:scale-[0.98]">
            <span className="text-sm font-bold text-muted-foreground">동호회</span>
            <strong className="mt-3 block text-3xl font-extrabold text-brand-green">
              {clubs.length}
            </strong>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">설정</h2>
        <div className="surface-card divide-y divide-border overflow-hidden">
          <Link to="/support" className="flex min-h-14 items-center px-4 text-base font-bold">
            고객지원 <ArrowRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
          <Link to="/terms" className="flex min-h-14 items-center px-4 text-base font-bold">
            이용약관 <ArrowRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <ButtonLike
          onClick={async () => {
            await signOut();
            toast.success("로그아웃했어요.");
            void navigate({ to: "/" });
          }}
        >
          <LogOut className="size-5" /> 로그아웃
        </ButtonLike>
        <Link
          to="/account-deletion"
          className="flex h-13 items-center justify-center rounded-2xl bg-secondary text-base font-bold text-destructive"
        >
          계정 삭제
        </Link>
      </section>
      <p className="text-center text-sm text-muted-foreground">현재 모임 · {club.club.name}</p>
    </div>
  );
}

function ButtonLike({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-extrabold text-background active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
