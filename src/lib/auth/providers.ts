import { supabase } from "@/integrations/supabase/client";
import { safeNextPath } from "./username";
import { Capacitor } from "@capacitor/core";

export type SocialProvider = "kakao" | "google" | "apple";

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
 * provider 자격증명이 외부 Supabase 에 설정된 경우에만 버튼을 노출한다.
 * Kakao 는 설정 완료 상태이므로 기본 활성화, Google/Apple 은 환경변수로 켠다.
 */
export function isProviderEnabled(id: SocialProvider): boolean {
  if (id === "kakao") return true;
  if (id === "google") return import.meta.env["VITE_ENABLE_GOOGLE_LOGIN"] === "true";
  if (id === "apple") return import.meta.env["VITE_ENABLE_APPLE_LOGIN"] === "true";
  return false;
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
