import { getSupabase } from "@/lib/supabase";

export const AUTH_CALLBACK_PATH = "/auth/callback";

export function getAuthRedirectUrl(): string {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

export type OAuthProvider = "github" | "google";

/** Start OAuth — always navigates away on success. */
export async function signInWithOAuthProvider(provider: OAuthProvider): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
      queryParams:
        provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined,
    },
  });

  if (error) throw error;

  // Explicit redirect — required in some SPA / embedded browser contexts.
  if (data?.url) {
    window.location.assign(data.url);
    return;
  }

  throw new Error(
    "OAuth did not return a redirect URL. Enable GitHub/Google in Supabase Auth and add " +
      redirectTo +
      " to Redirect URLs."
  );
}

/** Parse OAuth error params when provider redirects back with ?error= */
export function readOAuthCallbackError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    params.get("error_description") ??
    params.get("error") ??
    hashParams.get("error_description") ??
    hashParams.get("error")
  );
}
