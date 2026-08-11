import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword } from "@/lib/auth/username";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "비밀번호 재설정 – 민턴동" },
      {
        name: "description",
        content: "민턴동 계정의 새 비밀번호를 설정하고 다시 로그인하세요.",
      },
      { property: "og:title", content: "비밀번호 재설정 – 민턴동" },
      { property: "og:description", content: "새 비밀번호를 설정하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const problem =
      validatePassword(password) || (password !== password2 ? "비밀번호가 서로 달라요." : null);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.");
      void navigate({ to: "/auth", search: { next: undefined }, replace: true });
    } catch {
      toast.error("재설정 링크가 만료되었을 수 있어요. 비밀번호 찾기를 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="text-base font-extrabold text-foreground">새 비밀번호 설정</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        메일의 링크로 접속한 상태에서 새 비밀번호를 입력해 주세요.
      </p>
      <div className="mt-4 space-y-2">
        <Input
          className="h-12 rounded-2xl"
          type="password"
          autoComplete="new-password"
          placeholder="새 비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          className="h-12 rounded-2xl"
          type="password"
          autoComplete="new-password"
          placeholder="새 비밀번호 확인"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
        <Button className="h-12 w-full rounded-2xl font-bold" disabled={busy} onClick={submit}>
          {busy ? "변경 중..." : "비밀번호 변경"}
        </Button>
      </div>
    </section>
  );
}
