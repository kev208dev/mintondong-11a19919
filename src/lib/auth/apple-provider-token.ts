import type { Session, User } from "@supabase/supabase-js";

export const APPLE_PROVIDER_TOKEN_STORAGE_KEY = "mintondong:apple-provider-token";

type UserWithIdentities = Pick<User, "app_metadata" | "identities">;

export function hasAppleIdentity(user: UserWithIdentities | null | undefined): boolean {
  if (!user) return false;
  if (user.identities?.some((identity) => identity.provider === "apple")) return true;
  const providers = user.app_metadata?.["providers"];
  return (
    user.app_metadata?.["provider"] === "apple" ||
    (Array.isArray(providers) && providers.includes("apple"))
  );
}

export function rememberAppleProviderToken(session: Session | null | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  if (!session?.provider_token || !hasAppleIdentity(session.user)) return;
  sessionStorage.setItem(APPLE_PROVIDER_TOKEN_STORAGE_KEY, session.provider_token);
}

export function readAppleProviderToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(APPLE_PROVIDER_TOKEN_STORAGE_KEY);
}

export function clearAppleProviderToken(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(APPLE_PROVIDER_TOKEN_STORAGE_KEY);
}
