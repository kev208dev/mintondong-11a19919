import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AccountDeletionPanel } from "@/components/app/AccountDeletionPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "민턴동 계정 삭제" },
      {
        name: "description",
        content: "민턴동 계정과 연결된 개인정보 삭제 방법을 안내합니다.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-4">
      <section className="brand-header rounded-3xl border border-border bg-card p-5">
        <ShieldAlert className="size-6 text-primary" />
        <h2 className="mt-2 text-xl font-extrabold text-foreground">민턴동 계정 삭제</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          로그인한 계정에서 직접 삭제를 요청할 수 있습니다. 소유한 클럽이 있으면 고객지원에 다른
          관리자로의 소유권 이전을 요청한 뒤 삭제할 수 있습니다.
        </p>
      </section>

      {loading ? <div className="h-36 animate-pulse rounded-3xl bg-secondary" aria-hidden /> : null}

      {!loading && !user ? (
        <section className="rounded-3xl border border-border bg-card p-5">
          <p className="text-sm font-extrabold text-foreground">
            로그인 후 계정을 삭제할 수 있어요.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            삭제할 본인 계정으로 로그인하면 계정 삭제 화면으로 돌아옵니다.
          </p>
          <Button asChild className="mt-4 h-12 w-full rounded-2xl font-bold">
            <Link to="/auth" search={{ next: "/account-deletion" }}>
              로그인하고 계정 삭제
            </Link>
          </Button>
        </section>
      ) : null}

      {!loading && user ? <AccountDeletionPanel /> : null}
    </div>
  );
}
