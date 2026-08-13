import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionMessage,
} from "@/lib/auth/account-deletion-core";
import { deleteMyAccount, getMyAccountDeletionStatus } from "@/lib/auth/account-deletion.functions";
import {
  clearAppleProviderToken,
  hasAppleIdentity,
  readAppleProviderToken,
} from "@/lib/auth/apple-provider-token";
import { startSocialLogin } from "@/lib/auth/providers";

export function AccountDeletionPanel() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const getStatus = useServerFn(getMyAccountDeletionStatus);
  const deleteAccount = useServerFn(deleteMyAccount);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [appleProviderToken] = useState(() => readAppleProviderToken());
  const status = useQuery({
    queryKey: ["account-deletion-status", user?.id],
    queryFn: () => getStatus(),
    enabled: Boolean(user),
    retry: false,
  });

  if (!user) return null;

  const blocked = status.data?.canDelete === false;
  const unavailable = status.isError;
  const appleAccount = hasAppleIdentity(user);
  const appleReauthenticationRequired = appleAccount && !appleProviderToken;
  const canConfirm =
    !blocked &&
    !unavailable &&
    !appleReauthenticationRequired &&
    !status.isLoading &&
    !deleting &&
    confirmation.trim() === ACCOUNT_DELETION_CONFIRMATION;

  const removeAccount = async () => {
    if (!canConfirm) return;
    setDeleting(true);
    try {
      await deleteAccount({
        data: {
          confirmation: ACCOUNT_DELETION_CONFIRMATION,
          ...(appleProviderToken ? { appleProviderToken } : {}),
        },
      });
      clearAppleProviderToken();
      await signOut();
      toast.success("민턴동 계정이 삭제되었습니다.");
      void navigate({ to: "/", replace: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : null;
      toast.error(accountDeletionMessage(code));
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-destructive/30 bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Trash2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-foreground">계정 삭제</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            프로필과 로그인 계정은 복구할 수 없게 삭제됩니다. 법령상 보관이 필요한 결제 기록은 계정
            식별정보와 분리해 보관될 수 있습니다.
          </p>
        </div>
      </div>

      {status.isLoading ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary p-3 text-xs font-bold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 삭제 가능 여부를 확인하고 있어요.
        </p>
      ) : null}

      {blocked ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900">
          <AlertTriangle className="mr-1 inline size-4" />
          {accountDeletionMessage(status.data?.blockerCode)}
          {status.data?.ownedClubCount
            ? ` 현재 소유한 클럽 ${status.data.ownedClubCount}개가 확인됩니다.`
            : ""}
        </p>
      ) : null}

      {unavailable ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900">
          {accountDeletionMessage("ACCOUNT_DELETION_MIGRATION_REQUIRED")}
        </p>
      ) : null}

      {appleReauthenticationRequired ? (
        <p className="mt-4 rounded-2xl bg-secondary p-3 text-xs font-semibold leading-relaxed text-muted-foreground">
          Apple 계정 연결을 안전하게 해제하려면 삭제 직전에 Apple로 다시 인증해야 합니다.
        </p>
      ) : null}

      <AlertDialog>
        {appleReauthenticationRequired ? (
          <Button
            className="mt-4 h-12 w-full rounded-2xl font-bold"
            disabled={blocked || unavailable || status.isLoading || reauthenticating}
            onClick={async () => {
              setReauthenticating(true);
              try {
                await startSocialLogin("apple", "/account-deletion");
              } catch {
                toast.error("Apple 인증을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
                setReauthenticating(false);
              }
            }}
          >
            {reauthenticating ? "Apple 인증으로 이동 중..." : "Apple 인증 후 계정 삭제"}
          </Button>
        ) : (
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="mt-4 h-12 w-full rounded-2xl font-bold"
              disabled={blocked || unavailable || status.isLoading}
            >
              계정 삭제하기
            </Button>
          </AlertDialogTrigger>
        )}
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              삭제하면 프로필과 민턴동 로그인 계정을 복구할 수 없습니다. 계속하려면 아래에 ‘계정
              삭제’를 입력해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={ACCOUNT_DELETION_CONFIRMATION}
            autoComplete="off"
            disabled={deleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!canConfirm}
              onClick={(event) => {
                event.preventDefault();
                void removeAccount();
              }}
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {deleting ? "계정을 삭제하고 있어요..." : "계정 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
