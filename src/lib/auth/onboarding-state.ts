export type ProfileResolution = "loading" | "ready" | "missing" | "error";

export function normalizeRoutePathname(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || "/";
  if (pathOnly === "/") return pathOnly;
  return pathOnly.replace(/\/+$/, "") || "/";
}

function isPathOrDescendant(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function isOnboardingSubflow(pathname: string): boolean {
  const normalized = normalizeRoutePathname(pathname);
  return (
    isPathOrDescendant(normalized, "/onboarding") ||
    normalized === "/clubs/find" ||
    normalized === "/clubs/new" ||
    normalized.startsWith("/clubs/")
  );
}

export function isPublicAccountPage(pathname: string): boolean {
  const normalized = normalizeRoutePathname(pathname);
  return (
    normalized.startsWith("/admin/") ||
    isPathOrDescendant(normalized, "/tournaments") ||
    normalized === "/terms" ||
    normalized === "/privacy" ||
    normalized === "/refund-policy" ||
    normalized === "/business-info" ||
    normalized === "/support" ||
    normalized === "/account-deletion"
  );
}

export function resolvePostAuthRedirect(input: {
  authenticated: boolean;
  pathname: string;
  profile: ProfileResolution;
  username: string | null | undefined;
  onboardingCompletedAt: string | null | undefined;
}): "/" | "/onboarding/account" | "/onboarding" | null {
  const pathname = normalizeRoutePathname(input.pathname);
  if (!input.authenticated || isPathOrDescendant(pathname, "/auth/reset-password")) return null;
  if (input.profile !== "ready") return null;

  // one-time onboarding 완료 여부가 최종 source of truth다.
  // 기존 계정은 username 유무와 관계없이 다시 onboarding으로 보내지 않는다.
  if (input.onboardingCompletedAt) {
    return isPathOrDescendant(pathname, "/onboarding") ? "/" : null;
  }

  if (!input.username) {
    return isPathOrDescendant(pathname, "/onboarding/account") ? null : "/onboarding/account";
  }

  // username 설정이 끝난 미완료 계정은 account form에 머물지 않는다.
  if (isPathOrDescendant(pathname, "/onboarding/account")) return "/onboarding";

  if (isOnboardingSubflow(pathname) || isPublicAccountPage(pathname)) return null;
  return "/onboarding";
}
