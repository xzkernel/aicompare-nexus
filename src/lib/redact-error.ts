const SECRET_PATTERNS = [
  /sk-(?:proj-|svcacct-|admin-|ant-api\d{2}-|or-v\d+-)?[a-zA-Z0-9_-]{16,}/g,
  /AIza[a-zA-Z0-9_-]{16,}/g,
  /(?:api[_-]?key|authorization|token|secret)\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
];

export function redactSensitiveText(message: string, configuredSecrets: string[] = []): string {
  const withoutConfigured = configuredSecrets
    .map((secret) => secret.trim())
    .filter(Boolean)
    .reduce((text, secret) => text.split(secret).join("[REDACTED]"), message);

  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[REDACTED]"),
    withoutConfigured
  );
}
