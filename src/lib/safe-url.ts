/**
 * Safe URL utilities — treat model-supplied URLs as untrusted.
 * LLM02 / OWASP: Insecure Output Handling
 */

const SAFE_SCHEMES = ["https:", "http:"];

/**
 * Validate a URL from model output or grounded citations.
 * Blocks javascript:, data:, vbscript:, blob: and relative-protocol //
 * Returns null if the URL is unsafe or unparseable.
 */
export function sanitizeCitationUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Block protocol-relative and scheme-less injection attempts
  if (trimmed.startsWith("//")) return null;

  try {
    const url = new URL(trimmed);
    if (!SAFE_SCHEMES.includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Used in react-markdown's `a` component override.
 * Returns a safe href or "#" so the DOM always has a valid non-dangerous href.
 */
export function safeLinkHref(href: string | undefined | null): string {
  return sanitizeCitationUrl(href) ?? "#";
}
