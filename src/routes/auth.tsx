import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "로그인 – 민턴동 배드민턴 클럽" },
      {
        name: "description",
        content:
          "카카오·Apple·이메일로 로그인해 내 배드민턴 클럽의 출석·경기·레슨 정보를 안전하게 관리하세요.",
      },
      { property: "og:title", content: "로그인 – 민턴동" },
      { property: "og:description", content: "카카오·Apple·이메일로 민턴동에 로그인하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : undefined,
  }),
  component: AuthPage,
});

function safePath(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function AuthPage() {
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: safePath(next), replace: true });
  }, [loading, user, next, navigate]);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해 주세요.");
          return;
        }
        toast.success("가입 완료!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("로그인했어요.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const kakao = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("shuttleon:next", safePath(next));
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast.error("카카오 로그인 설정이 필요해요.");
        return;
      }
    } catch {
      toast.error("카카오 로그인 설정이 필요해요.");
    } finally {
      setBusy(false);
    }
  };

  const apple = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("shuttleon:next", safePath(next));
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Apple 로그인에 실패했어요.");
        return;
      }
    } catch {
      toast.error("Apple 로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("shuttleon:next", safePath(next));
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("구글 로그인에 실패했어요.");
        return;
      }
    } catch {
      toast.error("구글 로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="text-lg font-extrabold text-foreground">
        {mode === "signin" ? "로그인" : "회원가입"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        클럽 데이터를 여러 기기에서 안전하게 쓰려면 로그인이 필요해요.
      </p>

      <button
        className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#FEE500] text-sm font-bold text-[#191600] active:scale-95 disabled:opacity-60"
        disabled={busy}
        onClick={kakao}
      >
        카카오로 시작하기
      </button>

      <button
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background active:scale-95 disabled:opacity-60"
        disabled={busy}
        onClick={apple}
      >
        Apple로 계속하기
      </button>

      <button
        className="mt-2 flex h-10 w-full items-center justify-center rounded-2xl border border-border bg-card text-xs font-bold text-muted-foreground active:scale-95 disabled:opacity-60"
        disabled={busy}
        onClick={google}
      >
        구글로 계속하기
      </button>


      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold text-muted-foreground">또는 이메일</span>
        <span className="h-px flex-1 bg-border" />
      </div>


      {sent ? (
        <p className="rounded-2xl bg-secondary p-3 text-xs font-semibold text-secondary-foreground">
          {email} 로 확인 메일을 보냈어요. 링크를 누르면 로그인됩니다.
        </p>
      ) : (
        <div className="space-y-2">
          {mode === "signup" ? (
            <Input
              className="h-12 rounded-2xl"
              placeholder="이름 (예: 김민수)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          ) : null}
          <Input
            className="h-12 rounded-2xl"
            type="email"
            autoComplete="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            className="h-12 rounded-2xl"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            className="h-12 w-full rounded-2xl font-bold"
            disabled={busy || !email.trim() || password.length < 6}
            onClick={submit}
          >
            {mode === "signin" ? "로그인" : "가입하기"}
          </Button>
        </div>
      )}

      <button
        className="mt-4 w-full text-xs font-bold text-primary"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setSent(false);
        }}
      >
        {mode === "signin" ? "계정이 없어요 · 회원가입" : "이미 계정이 있어요 · 로그인"}
      </button>
    </section>
  );
}
