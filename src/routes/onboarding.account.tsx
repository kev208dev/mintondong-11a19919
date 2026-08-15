import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { validateDisplayName, validateUsername } from "@/lib/auth/username";
import { checkUsernameAvailable } from "@/lib/auth/account.functions";

export const Route = createFileRoute("/onboarding/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "민턴동 아이디 만들기" },
      {
        name: "description",
        content: "민턴동에서 사용할 고유 아이디와 닉네임을 정하고 동호회 활동을 시작하세요.",
      },
      { property: "og:title", content: "민턴동 아이디 만들기" },
      { property: "og:description", content: "민턴동에서 사용할 아이디를 정해주세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingAccountPage,
});

function OnboardingAccountPage() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, profileStatus, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/auth", search: { next: "/" }, replace: true });
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!displayName && profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name, displayName]);

  const submit = async () => {
    if (busy) return;
    const problem = validateUsername(username) || validateDisplayName(displayName);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const { available } = await checkUsernameAvailable({ data: { username } });
      if (!available) {
        setNote("이미 사용 중인 아이디예요.");
        return;
      }
      const db = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
      const { error } = await db.rpc("claim_username", {
        p_username: username.trim().toLowerCase(),
        p_display_name: displayName.trim(),
      });
      if (error) throw error;
      await refreshProfile();
      toast.success("민턴동 아이디를 만들었어요!");
      void navigate({ to: "/onboarding", replace: true });
    } catch {
      setNote("아이디를 저장하지 못했어요. 다른 아이디로 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || profileLoading || profileStatus === "loading") {
    return (
      <div className="h-44 animate-pulse rounded-3xl bg-secondary" aria-label="계정 확인 중" />
    );
  }

  if (profileStatus === "error") {
    return (
      <section className="rounded-3xl border border-border bg-card p-5 text-center">
        <p className="text-sm font-extrabold text-foreground">계정 정보를 불러오지 못했어요.</p>
        <Button
          className="mt-4 h-11 rounded-xl"
          variant="secondary"
          onClick={() => void refreshProfile()}
        >
          다시 시도
        </Button>
      </section>
    );
  }

  return (
    <section className="surface-card p-6">
      <h2 className="page-heading text-foreground">민턴동 아이디 만들기</h2>
      <p className="mt-2 text-base text-muted-foreground">
        민턴동에서 사용할 고유 아이디를 정해주세요.
      </p>
      <div className="mt-4 space-y-2">
        <Input
          className="h-13 rounded-2xl bg-secondary text-base shadow-none"
          placeholder="아이디 (영문 소문자·숫자·_ 4~20자)"
          autoCapitalize="none"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setNote(null);
          }}
        />
        <Input
          className="h-13 rounded-2xl bg-secondary text-base shadow-none"
          placeholder="닉네임 (2~20자)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {note ? <p className="px-1 text-[11px] font-semibold text-destructive">{note}</p> : null}
        <Button
          className="h-13 w-full rounded-2xl bg-brand-green text-base font-extrabold text-foreground hover:bg-brand-green-light"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "저장 중..." : "다음"}
        </Button>
      </div>
    </section>
  );
}
