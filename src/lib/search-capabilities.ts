import type { RegistryModel } from "@/types/registry";

export type ProviderSearchSupport = {
  supported: boolean;
  label: string;
  hint?: string;
};

/** Resolved provider name after BYOK routing (may differ from model provider id). */
export function getSearchSupportForRoute(
  modelProviderId: string,
  resolvedProviderName?: string
): ProviderSearchSupport {
  const route = resolvedProviderName ?? modelProviderId;

  if (route === "google") {
    return {
      supported: true,
      label: "Gemini grounding",
      hint: "Google Search grounding via native API",
    };
  }
  if (route === "anthropic") {
    return {
      supported: true,
      label: "Claude web_search",
      hint: "Anthropic web_search tool (GA)",
    };
  }
  if (route === "meta") {
    return {
      supported: true,
      label: "OpenRouter online",
      hint: "openrouter:web_search server tool",
    };
  }
  if (route === "openai") {
    return {
      supported: false,
      label: "Not available",
      hint: "GPT-4o does not support live search in current ModelWise configuration",
    };
  }
  return {
    supported: false,
    label: "Unknown",
    hint: "Web search not configured for this provider",
  };
}

export function modelSupportsWebSearch(model: RegistryModel | undefined, routeProvider?: string): boolean {
  if (model?.supportsWebSearch === false) return false;
  if (model?.supportsWebSearch === true) return true;
  return getSearchSupportForRoute(model?.provider ?? "", routeProvider).supported;
}

export function getCombinedSearchHint(
  leftProviderId: string,
  rightProviderId: string,
  leftRoute?: string,
  rightRoute?: string
): string | null {
  const left = getSearchSupportForRoute(leftProviderId, leftRoute);
  const right = getSearchSupportForRoute(rightProviderId, rightRoute);
  if (!left.supported && !right.supported) {
    return "Neither selected route supports live web search. Use Gemini, Claude, or OpenRouter.";
  }
  if (!left.supported) return left.hint ?? null;
  if (!right.supported) return right.hint ?? null;
  return null;
}
