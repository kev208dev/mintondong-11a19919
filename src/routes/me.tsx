import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/badminton/store";
import { ATTENDANCE_LABEL, LEVEL_LABEL } from "@/lib/badminton/types";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title: "마이 – 민턴동 배드민턴 클럽" },
      {
        name: "description",
        content: "로그인한 계정, 현재 모임과 내 역할, 최근 활동 기록을 한 화면에서 확인하세요.",
      },
      { property: "og:title", content: "마이 – 민턴동" },
      { property: "og:description", content: "내 계정과 모임 정보를 한눈에 확인해요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MePage,
});

function providerLabel(provider?: string) {
  switch (provider) {
    case "kakao":
      return "카카오";
    case "apple":
      return "Apple";
    case "google":
      return "Google";
    case "email":
      return "이메일";
    default:
      return provider ?? "이메일";
  }
}

function MePage() {
  const { user, profile, loading, signOut } = useAuth();
  const { club, clubs, switchClub, meMemberId, isOwner, getMemberRoles } = useStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-secondary" aria-hidden />;
  }

  if (!user) {
    return (
      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-base font-extrabold text-foreground">로그인이 필요해요</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          로그인하면 내 계정과 모임 정보를 여러 기기에서 확인할 수 있어요.
        </p>
        <Link
          to="/auth"
          search={{ next: "/me" }}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground active:scale-95"
        >
          로그인하기
        </Link>
      </section>
    );
  }

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "나";
  const provider = providerLabel(user.app_metadata?.provider as string | undefined);
  const shortId = `${user.id.slice(0, 6)}…${user.id.slice(-4)}`;
  const myRoles = getMemberRoles(meMemberId);
  const me = club.members.find((m) => m.id === meMemberId);
  const stat = club.stats[meMemberId] ?? { games: 0, wins: 0 };
  const losses = Math.max(0, stat.games - stat.wins);
  const winRate = stat.games > 0 ? Math.round((stat.wins / stat.games) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="size-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="brand-gradient grid size-14 shrink-0 place-items-center rounded-full text-lg font-extrabold text-primary-foreground">
              {name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-bold text-secondary-foreground">
              {provider} 로그인
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-secondary px-3 py-2">
          <span className="text-[11px] font-bold text-muted-foreground">계정 ID</span>
          <div className="flex items-center gap-2">
            <code className="text-[11px] font-semibold text-foreground">{shortId}</code>
            <button
              aria-label="계정 ID 복사"
              className="grid size-7 place-items-center rounded-full bg-card active:scale-95"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(user.id);
                  setCopied(true);
                  toast.success("계정 ID를 복사했어요.");
                  window.setTimeout(() => setCopied(false), 1500);
                } catch {
                  toast.error("복사에 실패했어요.");
                }
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-extrabold text-foreground">현재 모임</h2>
        <p className="mt-2 text-base font-extrabold text-foreground">
          {club.club.emoji} {club.club.name}
        </p>
        <p className="text-xs text-muted-foreground">{club.club.location}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {isOwner ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              클럽 소유자
            </span>
          ) : null}
          {myRoles.map((r) => (
            <span
              key={r.id}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground"
            >
              {r.name}
            </span>
          ))}
          {me ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
              레벨 {me.level} · {LEVEL_LABEL[me.level]}
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-foreground">내 활동</h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-bold text-secondary-foreground">
              오늘 {ATTENDANCE_LABEL[club.attendance[meMemberId] ?? "NONE"]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                club.checkedIn.includes(meMemberId)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {club.checkedIn.includes(meMemberId) ? "체크인 완료" : "체크인 전"}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { label: "경기", value: `${stat.games}` },
            { label: "승", value: `${stat.wins}` },
            { label: "패", value: `${losses}` },
            { label: "승률", value: `${winRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-secondary px-2 py-3 text-center">
              <p className="text-base font-extrabold text-foreground">{s.value}</p>
              <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-extrabold text-foreground">내 모임 {clubs.length}개</h2>
        <ul className="mt-3 space-y-2">
          {clubs.map((c) => {
            const active = c.club.id === club.club.id;
            const roles = getMemberRoles(`${c.club.id}-m0`, c.club.id);
            return (
              <li key={c.club.id}>
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left active:scale-[0.99] ${
                    active ? "border-primary bg-accent" : "border-border bg-card"
                  }`}
                  onClick={() => {
                    if (!active) {
                      switchClub(c.club.id);
                      toast.success(`${c.club.name}(으)로 전환했어요.`);
                    }
                  }}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm">
                    {c.club.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {c.club.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.club.location}
                      {roles.length ? ` · ${roles.map((r) => r.name).join(", ")}` : ""}
                    </span>
                  </span>
                  {active ? (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-bold text-primary-foreground">
                      현재
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {profile?.role === "ADMIN" ? (
        <Link
          to="/admin/tournaments"
          className="flex h-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-sm font-extrabold text-primary"
        >
          <Settings className="mr-2 size-4" /> 대회 관리자 페이지
        </Link>
      ) : null}

      <Button
        variant="secondary"
        className="h-12 w-full rounded-2xl font-bold"
        onClick={async () => {
          await signOut();
          toast.success("로그아웃했어요.");
          void navigate({ to: "/" });
        }}
      >
        <LogOut className="size-4" /> 로그아웃
      </Button>
    </div>
  );
}
