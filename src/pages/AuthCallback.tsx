import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { readOAuthCallbackError } from "@/lib/auth-oauth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading, configured } = useAuth();
  const [error, setError] = useState<string | null>(() => readOAuthCallbackError());
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!configured) {
      navigate("/auth", { replace: true });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const urlError = readOAuthCallbackError();
    if (urlError) {
      setError(decodeURIComponent(urlError.replace(/\+/g, " ")));
      return;
    }

    const finish = () => {
      navigate("/settings?section=cloud", { replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        finish();
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) finish();
    });

    const timeout = window.setTimeout(() => {
      setTimedOut(true);
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [configured, navigate]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/settings?section=cloud", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-start justify-center bg-black px-10 lg:px-16">
      <div className="landing-grain" aria-hidden />

      <div className="relative z-10 max-w-md">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          Identity layer
        </p>

        {error ? (
          <>
            <h1 className="landing-serif-display mb-4 text-4xl text-white">Sign-in failed</h1>
            <p className="mb-6 font-mono text-[12px] leading-relaxed text-[#ff6b6b]/80">
              {error}
            </p>
            <p className="mb-8 font-mono text-[10px] leading-relaxed text-white/30">
              In Supabase → Authentication → URL Configuration, add{" "}
              <code className="text-white/50">{window.location.origin}/auth/callback</code> to
              Redirect URLs. Enable GitHub/Google under Providers.
            </p>
            <Link
              to="/auth"
              className="inline-block border border-white/15 px-4 py-2 font-mono text-[11px] text-white/70 hover:border-white/30"
            >
              ← Back to auth
            </Link>
          </>
        ) : timedOut ? (
          <>
            <h1 className="landing-serif-display mb-4 text-4xl text-white">Still waiting</h1>
            <p className="mb-6 font-mono text-[12px] text-white/40">
              Session was not established. Check redirect URLs in Supabase match this origin.
            </p>
            <Link
              to="/auth"
              className="inline-block border border-white/15 px-4 py-2 font-mono text-[11px] text-white/70"
            >
              ← Try again
            </Link>
          </>
        ) : (
          <>
            <h1 className="landing-serif-display mb-4 text-4xl text-white">Completing sign-in</h1>
            <p className="font-mono text-[12px] text-white/40">Exchanging OAuth session…</p>
            <div className="mt-6 h-px w-24 animate-pulse bg-[#5de6ff]/40" />
          </>
        )}
      </div>
    </div>
  );
}
