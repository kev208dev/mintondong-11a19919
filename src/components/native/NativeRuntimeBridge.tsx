import { Capacitor } from "@capacitor/core";
import { useRouter } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NEXT_STORAGE_KEY } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/username";

function authParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  hash.forEach((value, key) => params.set(key, value));
  return params;
}

async function acceptAuthCallback(url: string): Promise<boolean> {
  if (!url.startsWith("mintondong://auth/callback")) return false;
  const params = authParams(url);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const code = params.get("code");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  throw new Error(params.get("error_description") || "OAUTH_CALLBACK_INVALID");
}

export function NativeRuntimeBridge() {
  const router = useRouter();
  const native = Capacitor.isNativePlatform();
  const [connected, setConnected] = useState(true);

  const handleAppUrl = useCallback(
    async (url: string) => {
      try {
        if (!(await acceptAuthCallback(url))) return;
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => undefined);
        const next = safeNextPath(sessionStorage.getItem(NEXT_STORAGE_KEY));
        sessionStorage.removeItem(NEXT_STORAGE_KEY);
        await router.navigate({ to: next, replace: true });
      } catch (error) {
        console.error("[native-auth] OAuth callback failed", error);
        await router.navigate({
          to: "/auth",
          search: { next: safeNextPath(sessionStorage.getItem(NEXT_STORAGE_KEY)) },
          replace: true,
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
        if (status.connected) void router.invalidate();
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
