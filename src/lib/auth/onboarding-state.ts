export type ProfileResolution = "loading" | "ready" | "missing" | "error";

export function isOnboardingSubflow(pathname: string): boolean {
  return (
    pathname.startsWith("/onboarding") ||
    pathname === "/clubs/find" ||
    pathname === "/clubs/new" ||
    pathname.startsWith("/clubs/")
  );
}

export function isPublicAccountPage(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/tournaments") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/business-info" ||
    pathname === "/support" ||
    pathname === "/account-deletion"
  );
}

export function resolvePostAuthRedirect(input: {
  authenticated: boolean;
  pathname: string;
  profile: ProfileResolution;
  username: string | null | undefined;
  onboardingCompletedAt: string | null | undefined;
}): "/" | "/onboarding/account" | "/onboarding" | null {
  if (!input.authenticated || input.pathname.startsWith("/auth/reset-password")) return null;
  if (input.profile === "loading" || input.profile === "error") return null;

  if (!input.username) {
    return input.pathname.startsWith("/onboarding/account") ? null : "/onboarding/account";
  }

  if (!input.onboardingCompletedAt) {
    if (isOnboardingSubflow(input.pathname) || isPublicAccountPage(input.pathname)) return null;
    return "/onboarding";
  }

  // 이미 완료한 계정이 오래된 앱 history로 온보딩에 다시 진입해도 첫 화면으로 복귀한다.
  if (input.pathname.startsWith("/onboarding")) return "/";
  return null;
}
