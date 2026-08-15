import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, UserRoundPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LEVEL_LABEL } from "@/lib/badminton/types";
import { useStore } from "@/lib/badminton/store";

export const Route = createFileRoute("/guest")({
  ssr: false,
  component: GuestPage,
});

function GuestPage() {
  const { user, loading } = useAuth();
  const { club } = useStore();

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-label="게스트 불러오는 중" />
    );
  }

  if (!user) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-brand-wash text-brand-green">
          <UsersRound className="size-8" />
        </span>
        <h2 className="mt-5 type-section-title text-foreground">게스트 기능은 로그인이 필요해요</h2>
        <p className="mt-2 max-w-xs type-body text-muted-foreground">
          로그인하면 가까운 게스트를 찾고 동호회 운동에 초대할 수 있어요.
        </p>
        <Button asChild className="mt-6 h-12 rounded-2xl px-6 font-bold">
          <Link to="/auth" search={{ next: "/guest" }}>
            로그인하기 <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </section>
    );
  }

  const guests = club.guests;
  return (
    <div className="space-y-6">
      <section className="brand-gradient rounded-[24px] p-5 text-primary-foreground">
        <p className="text-sm font-semibold opacity-80">오늘 운동에 함께할</p>
        <h2 className="mt-1 type-page-title">게스트를 찾아보세요</h2>
        <p className="mt-2 type-secondary opacity-80">
          동호회에 초대할 게스트를 관리하고 운동을 준비해요.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            asChild
            variant="secondary"
            className="h-11 rounded-2xl justify-between font-bold"
          >
            <Link to="/club/attendance">
              게스트 추가 <UserRoundPlus className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="h-11 rounded-2xl justify-between font-bold"
          >
            <Link to="/club/members">
              회원·게스트 <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="type-section-title text-foreground">최근 게스트</h2>
          <span className="type-caption text-muted-foreground">{guests.length}명</span>
        </div>
        {guests.length ? (
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {guests.map((guest) => (
              <li
                key={guest.id}
                className="min-w-[150px] rounded-3xl border border-border bg-card p-4"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-brand-wash font-bold text-brand-deep">
                  {guest.name.slice(0, 1)}
                </span>
                <p className="mt-3 truncate text-base font-bold text-foreground">{guest.name}</p>
                <p className="mt-1 type-caption text-muted-foreground">
                  {LEVEL_LABEL[guest.level]}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-3xl bg-cool-white p-6 text-center">
            <p className="text-base font-bold text-foreground">아직 등록한 게스트가 없어요</p>
            <p className="mt-1 type-secondary text-muted-foreground">
              오늘 운동에 초대할 게스트를 추가해보세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
