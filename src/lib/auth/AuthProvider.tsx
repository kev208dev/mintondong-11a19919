import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearAppleProviderToken,
  rememberAppleProviderToken,
} from "@/lib/auth/apple-provider-token";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: "USER" | "ADMIN";
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** 프로필을 아직 불러오는 중인지 (username 온보딩 판단용) */
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // 호스팅 환경에서 Supabase env 가 주입되지 않으면 client 접근이 throw 한다.
    // 앱 전체(루트 ErrorComponent)로 번지지 않게 여기서 흡수하고 로그아웃 상태로 둔다.
    let unsubscribe: (() => void) | undefined;
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        rememberAppleProviderToken(next);
        setSession(next);
        setLoading(false);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
          setLoading(false);
        })
        .catch((error) => {
          console.error("[auth] getSession failed", error);
          setLoading(false);
        });
    } catch (error) {
      console.error("[auth] Supabase client unavailable", error);
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    try {
      const result = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username, role")
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
        setProfile(row ? { ...row, role: "USER" } : null);
        return;
      }
      if (result.error) throw result.error;
      const row = result.data as Record<string, unknown> | null;
      setProfile(
        row
          ? {
              id: String(row["id"]),
              display_name: (row["display_name"] as string | null) ?? null,
              avatar_url: (row["avatar_url"] as string | null) ?? null,
              username: (row["username"] as string | null) ?? null,
              role: row["role"] === "ADMIN" ? "ADMIN" : "USER",
            }
          : null,
      );
    } catch (error) {
      console.error("[auth] profile fetch failed", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
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
      refreshProfile: async () => {
        if (userId) await loadProfile(userId);
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
      },
    }),
    [session, profile, loading, profileLoading, userId, loadProfile, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
