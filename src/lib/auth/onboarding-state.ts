export type ProfileResolution = "loading" | "ready" | "missing" | "error";
export type ClubsResolution = "idle" | "loading" | "ready" | "error";

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
  clubs: ClubsResolution;
  activeClubCount: number;
}): "/onboarding/account" | "/onboarding" | null {
  if (!input.authenticated || input.pathname.startsWith("/auth/reset-password")) return null;
  if (input.profile === "loading" || input.profile === "error") return null;

  if (!input.username) {
    return input.pathname.startsWith("/onboarding/account") ? null : "/onboarding/account";
  }

  if (input.clubs !== "ready") return null;
  if (
    input.activeClubCount === 0 &&
    !isOnboardingSubflow(input.pathname) &&
    !isPublicAccountPage(input.pathname)
  ) {
    return "/onboarding";
  }
  return null;
}
