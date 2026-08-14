import { normalizeRoutePathname } from "./onboarding-state";

/** /club 탭 root만 공개 안내 화면을 허용하고 실제 동호회 기능은 보호한다. */
export function isPublicClubRoot(pathname: string): boolean {
  return normalizeRoutePathname(pathname) === "/club";
}

export function requiresClubAuthentication(pathname: string): boolean {
  return !isPublicClubRoot(pathname);
}

export type ClubRootView = "loading" | "login" | "content";

export function resolveClubRootView(input: {
  authLoading: boolean;
  authenticated: boolean;
}): ClubRootView {
  if (input.authLoading) return "loading";
  return input.authenticated ? "content" : "login";
}
