import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail } from "@/lib/auth/username";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "비밀번호 찾기 – 민턴동" },
      {
        name: "description",
        content: "가입할 때 등록한 복구 이메일로 민턴동 비밀번호 재설정 안내를 받아보세요.",
      },
      { property: "og:title", content: "비밀번호 찾기 – 민턴동" },
      { property: "og:description", content: "복구 이메일로 비밀번호를 재설정하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { next } = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const problem = validateEmail(email);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    } catch {
      // 계정 존재 여부를 노출하지 않기 위해 결과를 구분하지 않는다.
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="text-base font-extrabold text-foreground">비밀번호 찾기</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        가입할 때 등록한 복구 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
      </p>

      {sent ? (
        <p className="mt-4 rounded-2xl bg-secondary p-3 text-xs font-semibold leading-relaxed text-secondary-foreground">
          입력한 정보와 일치하는 계정이 있다면 비밀번호 재설정 안내를 보내드렸어요. 메일함을
          확인해 주세요.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <Input
            className="h-12 rounded-2xl"
            type="email"
            autoComplete="email"
            placeholder="복구 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className="h-12 w-full rounded-2xl font-bold" disabled={busy} onClick={submit}>
            {busy ? "전송 중..." : "재설정 메일 보내기"}
          </Button>
        </div>
      )}

      <Link
        to="/auth"
        search={{ next }}
        className="mt-4 block text-center text-xs font-bold text-primary"
      >
        로그인으로 돌아가기
      </Link>
    </section>
  );
}
