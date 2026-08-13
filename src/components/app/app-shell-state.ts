export function hidesBottomNavigation(pathname: string): boolean {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  );
}

export function isExactBottomTabDestination(pathname: string, destination: string): boolean {
  return pathname === destination || (destination === "/club" && pathname === "/club/");
}

export function isIosNativeShell(capacitorPlatform: string, userAgent: string): boolean {
  if (capacitorPlatform === "ios") return true;

  // The production-origin WKWebView can lose the injected Capacitor bridge after
  // the bootstrap page navigates away. Its UA still differs from browser Safari,
  // so keep the iOS shell treatment without changing regular iOS web browsing.
  return (
    /\b(?:iPhone|iPad|iPod)\b/i.test(userAgent) &&
    /\bAppleWebKit\b/i.test(userAgent) &&
    !/\bSafari\b/i.test(userAgent)
  );
}
