export const BOTTOM_TAB_ROUTES = ["/", "/club", "/tournaments", "/me"] as const;

export type BottomTabRoute = (typeof BOTTOM_TAB_ROUTES)[number];
export type NativeTabId = "home" | "club" | "tournaments" | "me";

export type NativeChromeState = {
  pathname: string;
  title: string;
  selectedTab: NativeTabId | null;
  showsTabBar: boolean;
  showsNavigationBar: boolean;
  showsBackButton: boolean;
};

export const CLUB_SECTION_PREFIXES = ["/club", "/games", "/lessons", "/records"] as const;

function normalizedPathname(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function isClubSection(pathname: string) {
  return CLUB_SECTION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function hidesBottomNavigation(pathname: string): boolean {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  );
}

export function pageTitle(pathname: string): string {
  if (pathname === "/") return "홈";
  if (pathname === "/onboarding/account") return "계정 설정";
  if (pathname.startsWith("/onboarding")) return "시작하기";
  if (pathname.startsWith("/clubs/find")) return "동호회 찾기";
  if (pathname.startsWith("/clubs/new")) return "동호회 만들기";
  if (pathname.startsWith("/clubs/")) return "동호회";
  if (pathname.startsWith("/games")) return "경기";
  if (pathname.startsWith("/lessons")) return "레슨";
  if (pathname.startsWith("/payments/toss")) return "레슨 결제";
  if (pathname.startsWith("/terms")) return "이용약관";
  if (pathname.startsWith("/privacy")) return "개인정보처리방침";
  if (pathname.startsWith("/refund-policy")) return "취소 및 환불 정책";
  if (pathname.startsWith("/business-info")) return "사업자 정보";
  if (pathname.startsWith("/support")) return "고객지원";
  if (pathname.startsWith("/account-deletion")) return "계정 삭제";
  if (pathname.startsWith("/admin/tournaments")) return "대회 관리";
  if (pathname.startsWith("/records")) return "활동 기록";
  if (pathname.startsWith("/club/attendance")) return "출석 체크";
  if (pathname.startsWith("/club/schedule")) return "일정";
  if (pathname.startsWith("/club/ranking")) return "랭킹";
  if (pathname.startsWith("/club/members")) return "회원";
  if (pathname.startsWith("/club/notices")) return "공지";
  if (pathname.startsWith("/club/finance")) return "회비 · 재정";
  if (pathname.startsWith("/club/manage")) return "동호회 관리";
  if (pathname.startsWith("/club/more")) return "더보기";
  if (pathname.startsWith("/club")) return "동호회 홈";
  if (pathname.startsWith("/tournaments")) return "대회";
  if (pathname.startsWith("/auth")) return "로그인";
  if (pathname.startsWith("/me")) return "마이페이지";
  return "민턴동";
}

export function selectedNativeTab(pathname: string): NativeTabId | null {
  const normalized = normalizedPathname(pathname);
  if (normalized === "/" || normalized.startsWith("/clubs/find")) return "home";
  if (isClubSection(normalized)) return "club";
  if (normalized === "/tournaments" || normalized.startsWith("/tournaments/")) {
    return "tournaments";
  }
  if (normalized === "/me" || normalized.startsWith("/me/")) return "me";
  return null;
}

export function getNativeChromeState(pathname: string): NativeChromeState {
  const authFlow = pathname === "/auth" || pathname.startsWith("/auth/");
  const onboardingRoot = pathname === "/onboarding" || pathname === "/onboarding/account";
  const rootDestination = BOTTOM_TAB_ROUTES.some((route) =>
    isExactBottomTabDestination(pathname, route),
  );

  return {
    pathname,
    title: pageTitle(pathname),
    selectedTab: selectedNativeTab(pathname),
    showsTabBar: !hidesBottomNavigation(pathname),
    showsNavigationBar: !authFlow,
    showsBackButton: !authFlow && !onboardingRoot && !rootDestination,
  };
}

export function showsNativePrimaryControls(pathname: string): boolean {
  return BOTTOM_TAB_ROUTES.some((route) => isExactBottomTabDestination(pathname, route));
}

export function isBottomTabRoute(route: string): route is BottomTabRoute {
  return BOTTOM_TAB_ROUTES.includes(route as BottomTabRoute);
}

export function isExactBottomTabDestination(pathname: string, destination: string): boolean {
  return normalizedPathname(pathname) === normalizedPathname(destination);
}

export function usesNativeUIKitChrome(capacitorPlatform: string): boolean {
  return capacitorPlatform === "ios";
}
