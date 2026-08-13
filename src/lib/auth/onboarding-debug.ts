const ONBOARDING_DEBUG_KEY = "mintondong:onboarding-debug";

function isIosProductionWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /\b(?:iPhone|iPad|iPod)\b/i.test(navigator.userAgent) &&
    /\bAppleWebKit\b/i.test(navigator.userAgent) &&
    !/\bSafari\b/i.test(navigator.userAgent)
  );
}

function isOnboardingDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined" || !isIosProductionWebView()) return false;
  try {
    const requested = new URLSearchParams(window.location.search).get("onboardingDebug") === "1";
    if (requested) sessionStorage.setItem(ONBOARDING_DEBUG_KEY, "1");
    return requested || sessionStorage.getItem(ONBOARDING_DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export function logOnboardingState(input: {
  pathname: string;
  profileStatus: string;
  usernamePresent: boolean;
  onboardingCompleted: boolean;
  redirectTarget: string | null;
}): void {
  if (!isOnboardingDebugEnabled()) return;
  console.info("[onboarding-debug]", input);
}

export function logOnboardingNavigation(from: string, target: string): void {
  if (!isOnboardingDebugEnabled()) return;
  console.info("[onboarding-debug]", { from, target });
}
