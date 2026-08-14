export type ClubRouteBackHistory = {
  canGoBack: () => boolean;
  back: () => void;
};

type ClubRouteBackProfile = {
  authenticated: boolean;
  profileReady: boolean;
  onboardingCompletedAt: string | null | undefined;
};

export function resolveClubRouteBackFallback({
  authenticated,
  profileReady,
  onboardingCompletedAt,
}: ClubRouteBackProfile): "/" | "/onboarding" {
  return authenticated && profileReady && !onboardingCompletedAt ? "/onboarding" : "/";
}

export function goBackOrFallback(
  history: ClubRouteBackHistory,
  fallback: () => void,
): "history" | "fallback" {
  if (history.canGoBack()) {
    history.back();
    return "history";
  }

  fallback();
  return "fallback";
}
