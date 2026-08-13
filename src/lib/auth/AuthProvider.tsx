import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearAppleProviderToken,
  rememberAppleProviderToken,
} from "@/lib/auth/apple-provider-token";
import type { ProfileResolution } from "@/lib/auth/onboarding-state";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: "USER" | "ADMIN";
  onboarding_completed_at: string | null;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** 프로필을 아직 불러오는 중인지 (username 온보딩 판단용) */
  profileLoading: boolean;
  profileStatus: ProfileResolution;
  refreshProfile: () => Promise<void>;
  establishSession: (tokens: { access_token: string; refresh_token: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  profileStatus: "loading",
  refreshProfile: async () => {},
  establishSession: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileResolution>("loading");
  const currentUserId = useRef<string | null>(null);
  const profileRequestId = useRef(0);
  const queryClient = useQueryClient();

  const acceptSession = useCallback((next: Session | null) => {
    const nextUserId = next?.user.id ?? null;
    const userChanged = currentUserId.current !== nextUserId;
    currentUserId.current = nextUserId;
    rememberAppleProviderToken(next);
    if (!nextUserId) {
      profileRequestId.current += 1;
      setProfile(null);
      setProfileLoading(false);
      setProfileStatus("missing");
    } else if (userChanged) {
      setProfile(null);
      setProfileLoading(true);
      setProfileStatus("loading");
    }
    setSession(next);
    setLoading(false);
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const requestId = ++profileRequestId.current;
    setProfileLoading(true);
    setProfileStatus("loading");
    try {
      const result = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username, role, onboarding_completed_at")
        .eq("id", id)
        .maybeSingle();
      if (result.error?.code === "42703" || result.error?.code === "PGRST204") {
        const legacy = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, username")
          .eq("id", id)
          .maybeSingle();
        if (legacy.error) throw legacy.error;
        const row = legacy.data as Omit<Profile, "role"> | null;
        if (currentUserId.current !== id || profileRequestId.current !== requestId) return;
        setProfile(row ? { ...row, role: "USER", onboarding_completed_at: null } : null);
        setProfileStatus(row ? "ready" : "missing");
        return;
      }
      if (result.error) throw result.error;
      const row = result.data as Record<string, unknown> | null;
      if (currentUserId.current !== id || profileRequestId.current !== requestId) return;
      setProfile(
        row
          ? {
              id: String(row["id"]),
              display_name: (row["display_name"] as string | null) ?? null,
              avatar_url: (row["avatar_url"] as string | null) ?? null,
              username: (row["username"] as string | null) ?? null,
              role: row["role"] === "ADMIN" ? "ADMIN" : "USER",
              onboarding_completed_at: (row["onboarding_completed_at"] as string | null) ?? null,
            }
          : null,
      );
      setProfileStatus(row ? "ready" : "missing");
    } catch (error) {
      console.error("[auth] profile fetch failed", error);
      if (currentUserId.current === id && profileRequestId.current === requestId) {
        setProfileStatus("error");
      }
    } finally {
      if (currentUserId.current === id && profileRequestId.current === requestId) {
        setProfileLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // 세션을 적용하는 순간 profile 상태도 loading으로 전환해 redirect 경쟁을 막는다.
    let unsubscribe: (() => void) | undefined;
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        acceptSession(next);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
      void supabase.auth
        .getSession()
        .then(({ data }) => acceptSession(data.session))
        .catch((error) => {
          console.error("[auth] getSession failed", error);
          acceptSession(null);
        });
    } catch (error) {
      console.error("[auth] Supabase client unavailable", error);
      acceptSession(null);
    }
    return () => unsubscribe?.();
  }, [acceptSession]);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      setProfileStatus("missing");
      return;
    }
    void loadProfile(userId);
  }, [userId, loadProfile]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      profileLoading,
      profileStatus,
      refreshProfile: async () => {
        if (userId) await loadProfile(userId);
      },
      establishSession: async (tokens) => {
        const { data, error } = await supabase.auth.setSession(tokens);
        if (error) throw error;
        acceptSession(data.session);
        if (data.session) await loadProfile(data.session.user.id);
      },
      signOut: async () => {
        try {
          await queryClient.cancelQueries();
          queryClient.clear();
          await supabase.auth.signOut();
        } catch (error) {
          console.error("[auth] signOut failed", error);
        }
        clearAppleProviderToken();
        setSession(null);
        setProfile(null);
        currentUserId.current = null;
        profileRequestId.current += 1;
        setProfileLoading(false);
        setProfileStatus("missing");
      },
    }),
    [
      session,
      profile,
      loading,
      profileLoading,
      profileStatus,
      userId,
      loadProfile,
      acceptSession,
      queryClient,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
