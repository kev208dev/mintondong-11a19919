import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AccountButton() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <span className="size-9 shrink-0 rounded-full bg-secondary" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        search={{ next: undefined }}
        className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-secondary px-3 text-[11px] font-bold text-secondary-foreground active:scale-95"
      >
        <LogIn className="size-3.5" /> 로그인
      </Link>
    );
  }

  const label = profile?.display_name ?? user.email?.split("@")[0] ?? "나";

  return (
    <Link
      to="/me"
      aria-label="마이 페이지"
      className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs font-extrabold text-accent-foreground active:scale-95"
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="size-9 object-cover" />
      ) : (
        label.slice(0, 1)
      )}
    </Link>
  );
}
