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
