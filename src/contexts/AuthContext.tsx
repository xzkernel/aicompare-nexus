import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { ensureProfile } from "@/lib/sync-engine";
import { signInWithOAuthProvider, type OAuthProvider } from "@/lib/auth-oauth";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        void ensureProfile(next.user.id, {
          name: next.user.user_metadata?.full_name ?? next.user.user_metadata?.name,
          avatar: next.user.user_metadata?.avatar_url,
        });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    await signInWithOAuthProvider(provider);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: isSupabaseConfigured(),
      signInWithGitHub: () => signInWithOAuth("github"),
      signInWithGoogle: () => signInWithOAuth("google"),
      signOut,
    }),
    [session, loading, signInWithOAuth, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      session: null,
      loading: false,
      configured: isSupabaseConfigured(),
      signInWithGitHub: async () => {},
      signInWithGoogle: async () => {},
      signOut: async () => {},
    };
  }
  return ctx;
}
