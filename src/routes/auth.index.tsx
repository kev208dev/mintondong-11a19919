import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { signInWithUsername } from "@/lib/auth/account.functions";
import { SOCIAL_PROVIDERS, isProviderEnabled, startSocialLogin } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/username";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "로그인 – 민턴동 배드민턴 클럽" },
      {
        name: "description",
        content: "아이디와 비밀번호 또는 소셜 계정으로 민턴동에 로그인하세요.",
      },
      { property: "og:title", content: "로그인 – 민턴동" },
      { property: "og:description", content: "아이디 또는 소셜 계정으로 민턴동에 로그인하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading, establishSession } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "kakao" | "google" | "apple" | null>(null);

  useEffect(() => {
    if (!loading && user) void navigate({ to: safeNextPath(next), replace: true });
  }, [loading, user, next, navigate]);

  const submit = async () => {
    if (!username.trim() || !password || busy) return;
    setBusy("password");
    try {
      const tokens = await signInWithUsername({ data: { username, password } });
      await establishSession(tokens);
      toast.success("로그인했어요.");
      void navigate({ to: safeNextPath(next), replace: true });
    } catch (error) {
      const message =
        error instanceof Error && error.message && error.message.length < 80
          ? error.message
          : "아이디 또는 비밀번호를 확인해주세요.";
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const social = async (id: "kakao" | "google" | "apple") => {
    if (busy) return;
    setBusy(id);
    try {
      await startSocialLogin(id, next);
    } catch {
      toast.error("지금은 이 방법으로 로그인할 수 없어요. 다른 방법을 이용해 주세요.");
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-muted-foreground" htmlFor="login-id">
          아이디
        </label>
        <Input
          id="login-id"
          className="h-12 rounded-2xl"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label
          className="block pt-1 text-[11px] font-bold text-muted-foreground"
          htmlFor="login-pw"
        >
          비밀번호
        </label>
        <Input
          id="login-pw"
          className="h-12 rounded-2xl"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <Button
          className="h-12 w-full rounded-2xl font-bold"
          disabled={busy !== null || !username.trim() || !password}
          onClick={submit}
        >
          {busy === "password" ? "로그인 중..." : "로그인"}
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-xs font-bold">
        <Link to="/auth/signup" search={{ next }} className="text-primary">
          회원가입
        </Link>
        <span className="text-border">|</span>
        <Link to="/auth/forgot-password" search={{ next }} className="text-muted-foreground">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-[11px] font-bold text-muted-foreground">또는 계속하기</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        {SOCIAL_PROVIDERS.filter((p) => isProviderEnabled(p.id)).map((p) => (
          <button
            key={p.id}
            disabled={busy !== null}
            onClick={() => void social(p.id)}
            className={`flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold active:scale-95 disabled:opacity-60 ${p.className}`}
          >
            {busy === p.id ? "이동 중..." : p.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        로그인하면 민턴동 이용약관과 개인정보 처리방침에 동의하게 됩니다.
      </p>
    </section>
  );
}
