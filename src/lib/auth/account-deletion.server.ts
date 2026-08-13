import { adminClient } from "./account.server";
import { ACCOUNT_DELETION_CODES, type AccountDeletionStatus } from "./account-deletion-core";
import { hasAppleIdentity } from "./apple-provider-token";
import { revokeAppleProviderToken } from "./apple-revocation.server";
import { serverEnv } from "@/lib/server-env.server";

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

function appleRevocationCredentials() {
  const credentials = {
    teamId: serverEnv("APPLE_TEAM_ID"),
    keyId: serverEnv("APPLE_KEY_ID"),
    clientId: serverEnv("APPLE_CLIENT_ID"),
    privateKey: serverEnv("APPLE_PRIVATE_KEY"),
  };
  if (
    !credentials.teamId ||
    !credentials.keyId ||
    !credentials.clientId ||
    !credentials.privateKey
  ) {
    throw new Error(ACCOUNT_DELETION_CODES.appleRevocationNotConfigured);
  }
  return credentials as {
    teamId: string;
    keyId: string;
    clientId: string;
    privateKey: string;
  };
}

export async function deleteCurrentAccount(
  userId: string,
  appleProviderToken?: string,
): Promise<{ deleted: true }> {
  const status = await getAccountDeletionStatus(userId);
  if (!status.canDelete) {
    throw new Error(status.blockerCode || ACCOUNT_DELETION_CODES.failed);
  }

  const admin = adminClient();
  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userResult.user) {
    console.error("[account-deletion] auth user lookup failed", {
      status: userError?.status,
      code: userError?.code,
      message: userError?.message,
    });
    throw new Error(ACCOUNT_DELETION_CODES.failed);
  }

  if (hasAppleIdentity(userResult.user)) {
    if (!appleProviderToken) {
      throw new Error(ACCOUNT_DELETION_CODES.appleReauthenticationRequired);
    }
    await revokeAppleProviderToken(appleProviderToken, appleRevocationCredentials());
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
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
