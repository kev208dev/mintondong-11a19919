import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { signInWithUsername } from "@/lib/auth/account.functions";
import { SOCIAL_PROVIDERS, isProviderEnabled, startSocialLogin } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/username";

function GoogleBrandIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-[18px] shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.91-2.258c-.806.54-1.835.86-3.046.86-2.344 0-4.328-1.585-5.037-3.714H.957v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.708A5.42 5.42 0 0 1 3.68 9c0-.593.102-1.17.283-1.708V4.96H.957A9 9 0 0 0 0 9c0 1.452.347 2.827.957 4.04l3.006-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.578c1.321 0 2.507.454 3.44 1.346l2.582-2.582C13.463.89 11.426 0 9 0A9 9 0 0 0 .957 4.96l3.006 2.332C4.672 5.163 6.656 3.578 9 3.578Z"
      />
    </svg>
  );
}

function AppleBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[19px] shrink-0 fill-current">
      <path d="M16.7 12.24c.02-2 1.64-2.96 1.72-3.01a3.7 3.7 0 0 0-2.92-1.58c-1.23-.13-2.43.74-3.05.74-.64 0-1.59-.73-2.63-.71a3.88 3.88 0 0 0-3.26 1.99c-1.42 2.46-.36 6.07 1 8.06.68.97 1.47 2.05 2.51 2.01 1.02-.04 1.4-.65 2.63-.65 1.22 0 1.58.65 2.64.63 1.1-.02 1.79-.97 2.44-1.95a8.04 8.04 0 0 0 1.12-2.28 3.48 3.48 0 0 1-2.2-3.25ZM14.7 6.35a3.58 3.58 0 0 0 .82-2.57 3.64 3.64 0 0 0-2.36 1.22 3.4 3.4 0 0 0-.84 2.47 3 3 0 0 0 2.38-1.12Z" />
    </svg>
  );
}

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

export function SocialLoginButtons({
  busy,
  onSelect,
}: {
  busy: "password" | "kakao" | "google" | "apple" | null;
  onSelect: (provider: "kakao" | "google" | "apple") => void;
}) {
  return (
    <div className="space-y-2.5">
      {SOCIAL_PROVIDERS.filter((provider) => isProviderEnabled(provider.id)).map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={busy !== null}
          onClick={() => onSelect(provider.id)}
          aria-label={provider.label}
          className={`relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60 ${provider.className}`}
        >
          {provider.id === "google" ? <GoogleBrandIcon /> : null}
          {provider.id === "apple" ? <AppleBrandIcon /> : null}
          <span>{busy === provider.id ? "이동 중..." : provider.label}</span>
        </button>
      ))}
    </div>
  );
}

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
    } catch (error) {
      const errorCode =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.message
            : "";
      if (id === "apple" && errorCode.includes("APPLE_SIGN_IN_CANCELLED")) return;
      toast.error("지금은 이 방법으로 로그인할 수 없어요. 다른 방법을 이용해 주세요.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="surface-card p-4">
      <div className="space-y-2">
        <label className="block text-sm font-bold text-foreground" htmlFor="login-id">
          아이디
        </label>
        <Input
          id="login-id"
          className="h-11 rounded-2xl bg-secondary text-base shadow-none"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label className="block pt-1 text-sm font-bold text-foreground" htmlFor="login-pw">
          비밀번호
        </label>
        <Input
          id="login-pw"
          className="h-11 rounded-2xl bg-secondary text-base shadow-none"
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
          className="h-11 w-full rounded-2xl bg-brand-green text-base font-extrabold text-foreground hover:bg-brand-green-light"
          disabled={busy !== null || !username.trim() || !password}
          onClick={submit}
        >
          {busy === "password" ? "로그인 중..." : "로그인"}
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-sm font-bold">
        <Link to="/auth/signup" search={{ next }} className="text-primary">
          회원가입
        </Link>
        <span className="text-border">|</span>
        <Link to="/auth/forgot-password" search={{ next }} className="text-muted-foreground">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="my-2.5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-sm font-bold text-muted-foreground">또는 계속하기</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <SocialLoginButtons busy={busy} onSelect={(provider) => void social(provider)} />

      <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        로그인하면 민턴동{" "}
        <Link to="/terms" className="underline underline-offset-2">
          이용약관
        </Link>
        과{" "}
        <Link to="/privacy" className="underline underline-offset-2">
          개인정보 처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </section>
  );
}
