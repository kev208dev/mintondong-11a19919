export const ACCOUNT_DELETION_CONFIRMATION = "계정 삭제";

export const ACCOUNT_DELETION_CODES = {
  ownsClub: "ACCOUNT_OWNS_CLUB",
  migrationRequired: "ACCOUNT_DELETION_MIGRATION_REQUIRED",
  appleReauthenticationRequired: "APPLE_REAUTH_REQUIRED",
  appleRevocationNotConfigured: "APPLE_REVOCATION_NOT_CONFIGURED",
  appleRevocationFailed: "APPLE_REVOCATION_FAILED",
  failed: "ACCOUNT_DELETION_FAILED",
} as const;

export type AccountDeletionStatus = {
  canDelete: boolean;
  blockerCode: string | null;
  ownedClubCount: number;
};

export function accountDeletionMessage(code: string | null | undefined): string {
  if (code === ACCOUNT_DELETION_CODES.ownsClub) {
    return "소유한 클럽이 있습니다. 고객지원에 다른 관리자로의 소유권 이전을 요청한 뒤 다시 시도해 주세요.";
  }
  if (code === ACCOUNT_DELETION_CODES.migrationRequired) {
    return "계정 삭제 서버 준비가 아직 완료되지 않았습니다. 고객지원으로 문의해 주세요.";
  }
  if (code === ACCOUNT_DELETION_CODES.appleReauthenticationRequired) {
    return "Apple 계정 연결 해제를 위해 Apple로 다시 인증해 주세요.";
  }
  if (code === ACCOUNT_DELETION_CODES.appleRevocationNotConfigured) {
    return "Apple 계정 연결 해제 설정이 완료되지 않았습니다. 고객지원으로 문의해 주세요.";
  }
  if (code === ACCOUNT_DELETION_CODES.appleRevocationFailed) {
    return "Apple 계정 연결을 해제하지 못했습니다. 계정은 삭제되지 않았으니 잠시 후 다시 시도해 주세요.";
  }
  return "계정을 삭제하지 못했습니다. 잠시 후 다시 시도하거나 고객지원으로 문의해 주세요.";
}
