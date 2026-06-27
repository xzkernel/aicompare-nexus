import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Github, Cloud, ArrowRight, HardDrive, Wifi, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function Auth() {
  const { t } = useTranslation();
  const { signInWithGitHub, signInWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const configured = isSupabaseConfigured();
  const [authError, setAuthError] = useState<string | null>(null);
  const [pending, setPending] = useState<"github" | "google" | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate("/settings?section=cloud", { replace: true });
    }
  }, [loading, user, navigate]);

  const handleOAuth = async (provider: "github" | "google") => {
    setAuthError(null);
    setPending(provider);
    try {
      if (provider === "github") await signInWithGitHub();
      else await signInWithGoogle();
      // Browser navigates away on success — pending state cleared on unmount.
    } catch (e) {
      setAuthError(
        e instanceof Error ? e.message : "Sign-in failed. Check Supabase configuration."
      );
      setPending(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000] text-[#e8eaed]">
      {/* Noise grain */}
      <div className="landing-grain" aria-hidden />

      {/* Subtle dot grid — left zone only */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[58%] landing-dot-grid opacity-60"
        aria-hidden
      />

      {/* Faint cyan scan line */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-[38%] h-px bg-gradient-to-r from-transparent via-[#5de6ff]/10 to-transparent"
        aria-hidden
      />

      {/* ── Top bar ── */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.05] px-10 py-4 lg:px-16">
        <Link
          to="/"
          className="landing-serif-display text-xl tracking-tight text-white transition-opacity hover:opacity-70"
        >
          ModelWise
        </Link>

        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          <LanguageSwitcher variant="landing" />
          <span>V1.0.4 FRONTIER</span>
          <span className="hidden sm:inline">LOCAL-FIRST · BYOK</span>
        </div>
      </header>

      {/* ── Main composition ── */}
      <div className="relative z-10 flex min-h-[calc(100vh-57px)]">

        {/* Left — message zone */}
        <div className="flex w-full flex-col justify-between px-10 py-16 lg:w-[58%] lg:px-16 lg:py-24">

          {/* Section label */}
          <div className="mb-auto">
            <div className="mb-10 flex items-center gap-3">
              <span className="mw-label-mono text-white/30">01</span>
              <span className="h-px w-8 bg-white/[0.1]" />
              <span className="mw-label-mono text-white/30">IDENTITY LAYER · OPTIONAL</span>
            </div>

            {/* Hero */}
            <h1 className="landing-serif-display mb-8 text-[clamp(52px,8vw,96px)] text-white">
              {t("auth.heroTitle")}<br />
              <span className="italic text-white/50">{t("auth.heroTitleAccent")}</span>
            </h1>

            <p className="max-w-md font-mono text-[13px] leading-relaxed text-white/40">
              {t("auth.heroSubtitle")}
            </p>
          </div>

          {/* Operational metadata strips — bottom of left zone */}
          <div className="mt-16 space-y-3 lg:mt-0">
            <div className="h-px w-full bg-white/[0.05]" />
            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
              <MetaStrip
                icon={HardDrive}
                label="Primary store"
                value="IndexedDB"
              />
              <MetaStrip
                icon={Lock}
                label="BYOK routing"
                value="Device-local"
              />
              <MetaStrip
                icon={Wifi}
                label="Inference"
                value="No auth required"
              />
            </div>
          </div>
        </div>

        {/* Vertical rule */}
        <div className="hidden self-stretch border-l border-white/[0.05] lg:block" />

        {/* Right — auth zone */}
        <div className="hidden w-full flex-col justify-start px-12 pb-16 pt-24 lg:flex lg:w-[42%] lg:px-14">

          {/* Section label */}
          <div className="mb-10 flex items-center gap-3">
            <span className="mw-label-mono text-white/30">02</span>
            <span className="h-px w-8 bg-white/[0.1]" />
            <span className="mw-label-mono text-white/30">AUTHENTICATION</span>
          </div>

          {/* Continue locally — PRIMARY action */}
          <div className="mb-10">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
              {t("auth.localModeLabel")}
            </p>
            <Link
              to="/playground"
              className={cn(
                "group flex w-full items-center justify-between border border-white/[0.12]",
                "bg-white/[0.02] px-5 py-4 font-mono text-[13px] text-white",
                "transition-all duration-200 hover:border-white/25 hover:bg-white/[0.04]"
              )}
            >
              <span>{t("auth.continueLocally")}</span>
              <ArrowRight
                className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70"
                strokeWidth={1.5}
              />
            </Link>
            <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-white/25">
              Sessions remain local unless sync is enabled.
              BYOK routing stays device-local.
            </p>
          </div>

          {/* Sync section — only shown if Supabase is configured */}
          {configured ? (
            <>
              <div className="mb-8 flex items-center gap-4">
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
                  {t("auth.optionalCloudSync")}
                </span>
                <span className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <div className="space-y-3">
                <OAuthButton
                  onClick={() => void handleOAuth("github")}
                  loading={pending === "github"}
                  disabled={pending !== null}
                >
                  <Github className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>GitHub</span>
                  <span className="ml-auto font-mono text-[9px] text-white/30">
                    OAUTH
                  </span>
                </OAuthButton>

                <OAuthButton
                  onClick={() => void handleOAuth("google")}
                  loading={pending === "google"}
                  disabled={pending !== null}
                >
                  <GoogleIcon />
                  <span>Google</span>
                  <span className="ml-auto font-mono text-[9px] text-white/30">
                    OAUTH
                  </span>
                </OAuthButton>
              </div>

              {authError && (
                <p className="mt-4 font-mono text-[10px] text-[#ff6b6b]/80">
                  {authError}
                </p>
              )}

              <p className="mt-6 font-mono text-[10px] leading-relaxed text-white/20">
                Sign in to enable optional multi-device session backup.
                Provider API keys are never synced.
              </p>
            </>
          ) : (
            <div className="border border-white/[0.05] bg-white/[0.02] px-4 py-4">
              <p className="font-mono text-[10px] leading-relaxed text-white/30">
                Cloud sync is not configured.
                Set{" "}
                <code className="text-white/50">VITE_SUPABASE_URL</code>
                {" and "}
                <code className="text-white/50">VITE_SUPABASE_ANON_KEY</code>
                {" "}to enable optional identity.
              </p>
              <p className="mt-2 font-mono text-[10px] text-white/20">
                See{" "}
                <a
                  href="https://github.com/Archiixyz/aicompare-nexus/blob/main/SUPABASE_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/40"
                >
                  SUPABASE_SETUP.md
                </a>
              </p>
            </div>
          )}

          {/* Bottom coordinates */}
          <div className="mt-auto pt-16">
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center justify-between pt-3">
              <span className="font-mono text-[9px] text-white/20">
                LOCAL-FIRST · BYOK · OSS
              </span>
              <Link
                to="/"
                className="font-mono text-[9px] text-white/20 transition-colors hover:text-white/40"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile auth — shown below lg */}
      <div className="relative z-10 border-t border-white/[0.05] px-10 pb-16 pt-10 lg:hidden">
        <div className="mb-8 flex items-center gap-3">
          <span className="mw-label-mono text-white/30">02</span>
          <span className="h-px w-8 bg-white/[0.1]" />
          <span className="mw-label-mono text-white/30">AUTHENTICATION</span>
        </div>

        <Link
          to="/playground"
          className="mb-6 flex w-full items-center justify-between border border-white/[0.12] bg-white/[0.02] px-5 py-4 font-mono text-[13px] text-white transition-all hover:border-white/25"
        >
          <span>{t("auth.continueLocally")}</span>
          <ArrowRight className="h-4 w-4 text-white/30" strokeWidth={1.5} />
        </Link>

        {configured && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-white/[0.06]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
                Optional cloud sync
              </span>
              <span className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <OAuthButton onClick={() => void handleOAuth("github")} loading={pending === "github"} disabled={pending !== null}>
              <Github className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>GitHub</span>
            </OAuthButton>
            <OAuthButton onClick={() => void handleOAuth("google")} loading={pending === "google"} disabled={pending !== null}>
              <GoogleIcon />
              <span>Google</span>
            </OAuthButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function MetaStrip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HardDrive;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-white/20" strokeWidth={1.5} />
        <span className="mw-label-mono text-white/25">{label}</span>
      </div>
      <span className="font-mono text-[11px] text-white/50">{value}</span>
    </div>
  );
}

function OAuthButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 border border-white/[0.08] bg-transparent",
        "px-5 py-3.5 font-mono text-[12px] text-white/70",
        "transition-all duration-150 hover:border-white/20 hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      {loading ? (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border border-white/20 border-t-white/60" />
      ) : null}
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="rgba(255,255,255,0.4)"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="rgba(255,255,255,0.4)"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="rgba(255,255,255,0.4)"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="rgba(255,255,255,0.4)"
      />
    </svg>
  );
}
