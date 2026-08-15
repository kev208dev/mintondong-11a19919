import { supabase } from "@/integrations/supabase/client";
import { safeNextPath } from "./username";
import { Capacitor } from "@capacitor/core";
import { NativeAuth } from "@/lib/native/native-auth";

export type SocialProvider = "kakao" | "google" | "apple";

type ConfigurableSocialProvider = Exclude<SocialProvider, "kakao">;

export const SOCIAL_PROVIDERS: {
  id: SocialProvider;
  label: string;
  className: string;
}[] = [
  {
    id: "kakao",
    label: "카카오로 계속하기",
    className: "bg-[#FEE500] text-[#191600]",
  },
  {
    id: "google",
    label: "Google로 계속하기",
    className: "border border-border bg-card text-foreground",
  },
  {
    id: "apple",
    label: "Apple로 계속하기",
    className: "bg-foreground text-background",
  },
];

/**
 * Production Supabase에서 활성화가 확인된 공개 provider 표시 설정이다.
 * VITE 플래그를 명시적으로 false로 둔 긴급 차단만 우선한다.
 */
export function resolveProviderEnabled(id: SocialProvider, configuredValue?: string): boolean {
  if (id === "kakao") return true;
  return configuredValue !== "false";
}

export function isProviderEnabled(id: SocialProvider): boolean {
  const configuredValues: Record<ConfigurableSocialProvider, string | undefined> = {
    google: import.meta.env["VITE_ENABLE_GOOGLE_LOGIN"],
    apple: import.meta.env["VITE_ENABLE_APPLE_LOGIN"],
  };
  return id === "kakao" ? true : resolveProviderEnabled(id, configuredValues[id]);
}

export const NEXT_STORAGE_KEY = "mintondong:next";

/** 모든 소셜 로그인 공통 진입점. next 는 내부 경로만 저장한다. */
export async function startSocialLogin(provider: SocialProvider, next?: string) {
  const native = Capacitor.isNativePlatform();
  try {
    sessionStorage.setItem(NEXT_STORAGE_KEY, safeNextPath(next));
  } catch {
    // 저장 실패는 무시 (로그인 후 홈으로 이동)
  }
  if (native && Capacitor.getPlatform() === "ios" && provider === "apple") {
    const credential = await NativeAuth.signInWithApple();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.idToken,
      nonce: credential.nonce,
    });
    if (error) throw error;

    const name = [credential.givenName, credential.familyName].filter(Boolean).join(" ").trim();
    if (name || credential.email) {
      await supabase.auth
        .updateUser({
          data: {
            ...(name
              ? {
                  full_name: name,
                  given_name: credential.givenName,
                  family_name: credential.familyName,
                }
              : {}),
            ...(credential.email ? { email: credential.email } : {}),
          },
        })
        .catch((metadataError) =>
          console.warn(
            "[native-auth] optional Apple profile metadata update failed",
            metadataError,
          ),
        );
    }
    if (!data.session) throw new Error("APPLE_SESSION_MISSING");
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: native ? "mintondong://auth/callback" : window.location.origin,
      skipBrowserRedirect: native,
      ...(provider === "apple" ? { scopes: "name email" } : {}),
    },
  });
  if (error) throw error;
  if (native && data.url) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  }
}
