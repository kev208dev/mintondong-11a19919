import { supabase } from "@/integrations/supabase/client";
import { rememberAppleProviderToken } from "./apple-provider-token";

export function authParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  hash.forEach((value, key) => params.set(key, value));
  return params;
}

export async function acceptAuthCallback(url: string): Promise<boolean> {
  if (!url.startsWith("mintondong://auth/callback")) return false;
  const params = authParams(url);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const code = params.get("code");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    const providerToken = params.get("provider_token");
    rememberAppleProviderToken(
      providerToken && data.session
        ? { ...data.session, provider_token: providerToken }
        : data.session,
    );
    return true;
  }
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    rememberAppleProviderToken(data.session);
    return true;
  }
  throw new Error(params.get("error_description") || "OAUTH_CALLBACK_INVALID");
}
