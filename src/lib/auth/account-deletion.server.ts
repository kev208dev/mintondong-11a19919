import { adminClient } from "./account.server";
import { ACCOUNT_DELETION_CODES, type AccountDeletionStatus } from "./account-deletion-core";

type PreflightRow = {
  can_delete: boolean;
  blocker_code: string | null;
  owned_club_count: number;
};

function isMissingPreflight(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
    (error.code === "42883" ||
      error.code === "PGRST202" ||
      error.message?.includes("account_deletion_preflight")),
  );
}

export async function getAccountDeletionStatus(userId: string): Promise<AccountDeletionStatus> {
  const { data, error } = await adminClient().rpc("account_deletion_preflight", {
    p_user_id: userId,
  });

  if (error) {
    if (isMissingPreflight(error)) throw new Error(ACCOUNT_DELETION_CODES.migrationRequired);
    console.error("[account-deletion] preflight failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error(ACCOUNT_DELETION_CODES.failed);
  }

  const row = (Array.isArray(data) ? data[0] : data) as PreflightRow | null;
  if (!row) throw new Error(ACCOUNT_DELETION_CODES.failed);

  return {
    canDelete: row.can_delete === true,
    blockerCode: row.blocker_code ?? null,
    ownedClubCount: Number(row.owned_club_count ?? 0),
  };
}

export async function deleteCurrentAccount(userId: string): Promise<{ deleted: true }> {
  const status = await getAccountDeletionStatus(userId);
  if (!status.canDelete) {
    throw new Error(status.blockerCode || ACCOUNT_DELETION_CODES.failed);
  }

  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) {
    const message = error.message || "";
    if (message.includes(ACCOUNT_DELETION_CODES.ownsClub)) {
      throw new Error(ACCOUNT_DELETION_CODES.ownsClub);
    }
    console.error("[account-deletion] auth user deletion failed", {
      status: error.status,
      code: error.code,
      message,
    });
    throw new Error(ACCOUNT_DELETION_CODES.failed);
  }

  return { deleted: true };
}
