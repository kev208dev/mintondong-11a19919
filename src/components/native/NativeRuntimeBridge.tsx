import { Capacitor } from "@capacitor/core";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getNativeChromeState,
  isBottomTabRoute,
  isExactBottomTabDestination,
} from "@/components/app/app-shell-state";
import { useAuth } from "@/lib/auth/AuthProvider";
import { NEXT_STORAGE_KEY } from "@/lib/auth/providers";
import { acceptAuthCallback } from "@/lib/auth/native-callback";
import { safeNextPath } from "@/lib/auth/username";
import { goBackOrFallback, resolveClubRouteBackFallback } from "@/lib/navigation/club-route-back";
import { NativeChrome } from "@/lib/native/native-chrome";
import { isNavigationCancellation } from "@/lib/navigation/navigation-errors";

export function NativeRuntimeBridge() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, profile, profileStatus } = useAuth();
  const native = Capacitor.getPlatform() === "ios" || Capacitor.isNativePlatform();
  const iosNative = Capacitor.getPlatform() === "ios";
  const [connected, setConnected] = useState(true);
  const authCallbackUrls = useRef(new Set<string>());
  const routeState = useRef({ pathname, user, profile, profileStatus });
  routeState.current = { pathname, user, profile, profileStatus };

  const handleAppUrl = useCallback(
    async (url: string) => {
      if (!url.startsWith("mintondong://auth/callback")) return;
      if (authCallbackUrls.current.has(url)) return;
      authCallbackUrls.current.add(url);
      try {
        if (!(await acceptAuthCallback(url))) return;
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => undefined);
        const next = safeNextPath(sessionStorage.getItem(NEXT_STORAGE_KEY));
        sessionStorage.removeItem(NEXT_STORAGE_KEY);
        await router.navigate({ to: next, replace: true });
      } catch (error) {
        authCallbackUrls.current.delete(url);
        if (isNavigationCancellation(error)) return;
        console.error("[native-auth] OAuth callback failed", error);
        await router
          .navigate({
            to: "/auth",
            search: { next: safeNextPath(sessionStorage.getItem(NEXT_STORAGE_KEY)) },
            replace: true,
          })
          .catch((navigationError) => {
            if (!isNavigationCancellation(navigationError))
              console.error("[native-auth] callback recovery navigation failed", navigationError);
          });
      }
    },
    [router],
  );

  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    const cleanup: Array<() => Promise<void>> = [];

    void (async () => {
      const [
        { App },
        { Network },
        { SplashScreen },
        { StatusBar, Style },
        { Keyboard, KeyboardResize },
      ] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/network"),
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
        import("@capacitor/keyboard"),
      ]);
      if (cancelled) return;

      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setOverlaysWebView({ overlay: false });
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#ffffff" });
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      }
      await SplashScreen.hide();

      const initialNetwork = await Network.getStatus();
      setConnected(initialNetwork.connected);

      const urlListener = await App.addListener("appUrlOpen", ({ url }) => void handleAppUrl(url));
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) void handleAppUrl(launchUrl.url);

      const networkListener = await Network.addListener("networkStatusChange", (status) => {
        setConnected(status.connected);
        if (status.connected) {
          void router.invalidate().catch((error) => {
            if (!isNavigationCancellation(error))
              console.error("[native] route refresh failed", error);
          });
        }
      });
      const backListener = await App.addListener("backButton", ({ canGoBack }) => {
        const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
        if (openDialog) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          return;
        }
        if (canGoBack) window.history.back();
        else void App.exitApp();
      });

      cleanup.push(
        () => urlListener.remove(),
        () => networkListener.remove(),
        () => backListener.remove(),
      );
    })().catch((error) => console.error("[native] runtime initialization failed", error));

    const openExternalLink = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target !== "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;
      event.preventDefault();
      void import("@capacitor/browser").then(({ Browser }) => Browser.open({ url: url.href }));
    };
    document.addEventListener("click", openExternalLink);

    return () => {
      cancelled = true;
      document.removeEventListener("click", openExternalLink);
      for (const remove of cleanup) void remove();
    };
  }, [handleAppUrl, native, router]);

  useEffect(() => {
    if (!iosNative) return;
    let cancelled = false;
    const listeners: Array<{ remove: () => Promise<void> }> = [];

    void (async () => {
      const tabListener = await NativeChrome.addListener("tabSelected", ({ route }) => {
        const currentPathname = routeState.current.pathname;
        if (!isBottomTabRoute(route)) return;
        if (isExactBottomTabDestination(currentPathname, route)) return;
        void router.navigate({ to: route }).catch((error) => {
          if (!isNavigationCancellation(error))
            console.error("[native-chrome] tab navigation failed", error);
        });
      });
      const backListener = await NativeChrome.addListener("backRequested", () => {
        const current = routeState.current;
        const fallback = current.pathname.startsWith("/clubs/")
          ? resolveClubRouteBackFallback({
              authenticated: Boolean(current.user),
              profileReady: current.profileStatus === "ready",
              onboardingCompletedAt: current.profile?.onboarding_completed_at,
            })
          : current.pathname.startsWith("/tournaments/")
            ? "/tournaments"
            : current.pathname.startsWith("/club/") ||
                current.pathname.startsWith("/games") ||
                current.pathname.startsWith("/lessons") ||
                current.pathname.startsWith("/records")
              ? "/club"
              : "/";

        goBackOrFallback(router.history, () => {
          void router.navigate({ to: fallback, replace: true }).catch((error) => {
            if (!isNavigationCancellation(error))
              console.error("[native-chrome] back navigation failed", error);
          });
        });
      });
      if (cancelled) {
        await tabListener.remove();
        await backListener.remove();
        return;
      }
      listeners.push(tabListener, backListener);
    })().catch((error) => console.error("[native-chrome] listener setup failed", error));

    return () => {
      cancelled = true;
      for (const listener of listeners) void listener.remove();
    };
  }, [iosNative, router]);

  useEffect(() => {
    if (!iosNative) return;
    void NativeChrome.setState(getNativeChromeState(pathname)).catch((error) =>
      console.error("[native-chrome] state sync failed", error),
    );
  }, [iosNative, pathname]);

  if (!native || connected) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <section className="w-full max-w-sm text-center" role="alert">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
          <WifiOff className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-extrabold text-foreground">인터넷 연결을 확인해 주세요</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          연결이 복구되면 민턴동을 다시 불러올 수 있어요.
        </p>
        <Button
          className="mt-5 h-12 w-full rounded-2xl font-bold"
          onClick={async () => {
            const { Network } = await import("@capacitor/network");
            const status = await Network.getStatus();
            setConnected(status.connected);
            if (status.connected) window.location.reload();
          }}
        >
          다시 시도
        </Button>
      </section>
    </div>
  );
}
