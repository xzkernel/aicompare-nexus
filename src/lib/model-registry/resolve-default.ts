import type { NormalizedRegistry } from "@/types/registry";
import { parseModelValue } from "./normalize";

const DEFAULT_BY_PROVIDER: Record<string, string> = {
  openai: "openai:gpt-5.5",
  google: "google:gemini-3.1-pro-preview",
  anthropic: "anthropic:claude-sonnet-4-6",
  meta: "meta:deepseek/deepseek-v4-flash",
};

/** Pick a live registry value when the current selection was removed or renamed. */
export function resolveLiveModelValue(
  registry: NormalizedRegistry | null,
  value: string,
  fallback: string
): string {
  if (!registry) return value || fallback;
  if (value && registry.byFullId.has(value)) return value;

  const { providerId } = parseModelValue(value || fallback);
  const sameProvider = registry.options.find((opt) => opt.providerId === providerId);
  if (sameProvider) return sameProvider.value;

  const providerDefault = DEFAULT_BY_PROVIDER[providerId];
  if (providerDefault && registry.byFullId.has(providerDefault)) {
    return providerDefault;
  }

  return registry.options[0]?.value ?? fallback;
}

