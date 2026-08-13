import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUsernameAvailable, signUpWithUsername } from "@/lib/auth/account.functions";
import { NEXT_STORAGE_KEY } from "@/lib/auth/providers";
import {
  safeNextPath,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth/username";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "회원가입 – 민턴동 배드민턴 클럽" },
      {
        name: "description",
        content: "아이디와 비밀번호로 민턴동 계정을 만들고 동호회 활동을 기록하세요.",
      },
      { property: "og:title", content: "회원가입 – 민턴동" },
      { property: "og:description", content: "아이디로 민턴동 계정을 만들어 보세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [idNote, setIdNote] = useState<string | null>(null);
  const [emailNote, setEmailNote] = useState<string | null>(null);

  const checkId = async () => {
    const message = validateUsername(username);
    if (message) {
      setIdNote(message);
      return;
    }
    try {
      const { available } = await checkUsernameAvailable({ data: { username } });
      setIdNote(available ? "사용할 수 있는 아이디예요." : "이미 사용 중인 아이디예요.");
    } catch {
      setIdNote(null);
    }
  };

  const submit = async () => {
    if (busy) return;
    setEmailNote(null);
    const problem =
      validateUsername(username) ||
      validatePassword(password) ||
      (password !== password2 ? "비밀번호가 서로 달라요." : null) ||
      validateDisplayName(displayName) ||
      validateEmail(email);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const tokens = await signUpWithUsername({
        data: { username, password, displayName, email },
      });
      await establishSession(tokens);

      const intended = safeNextPath(next);
      if (intended !== "/") sessionStorage.setItem(NEXT_STORAGE_KEY, intended);

      toast.success("민턴동에 가입했어요!");
      void navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      const message =
        error instanceof Error && error.message && error.message.length < 120
          ? error.message
          : "회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.";

      if (message.startsWith("이 이메일로는 새 계정을 만들 수 없어요.")) {
        setEmailNote(message);
        toast.error("복구 이메일을 확인해 주세요.");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="text-base font-extrabold text-foreground">회원가입</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        아이디와 비밀번호로 로그인해요. 이메일은 비밀번호 찾기 및 계정 복구에만 사용돼요.
      </p>

      <div className="mt-4 space-y-2">
        <Input
          className="h-12 rounded-2xl"
          placeholder="아이디 (영문 소문자·숫자·_ 4~20자)"
          autoCapitalize="none"
          autoComplete="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setIdNote(null);
          }}
          onBlur={() => void checkId()}
        />
        {idNote ? (
          <p className="px-1 text-[11px] font-semibold text-muted-foreground">{idNote}</p>
        ) : null}
        <Input
          className="h-12 rounded-2xl"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          className="h-12 rounded-2xl"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호 확인"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
        <Input
          className="h-12 rounded-2xl"
          placeholder="닉네임 (2~20자)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          className="h-12 rounded-2xl"
          type="email"
          autoComplete="email"
          placeholder="복구 이메일"
          value={email}
          aria-invalid={Boolean(emailNote)}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailNote(null);
          }}
        />
        {emailNote ? (
          <p className="px-1 text-[11px] font-semibold text-destructive">{emailNote}</p>
        ) : null}
        <Button className="h-12 w-full rounded-2xl font-bold" disabled={busy} onClick={submit}>
          {busy ? "가입 중..." : "가입하기"}
        </Button>
      </div>

      <Link
        to="/auth"
        search={{ next }}
        className="mt-4 block text-center text-xs font-bold text-primary"
      >
        이미 계정이 있어요 · 로그인
      </Link>
    </section>
  );
}
