import type { SearchMode } from "@/lib/search-metadata";

const STORAGE_KEY = "modelwise-search-prefs";

export type SearchPrefs = {
  searchMode: SearchMode;
};

const DEFAULTS: SearchPrefs = {
  searchMode: "off",
};

export function loadSearchPrefs(): SearchPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SearchPrefs & { webSearchEnabled?: boolean }>;
    // migrate legacy webSearchEnabled → auto
    let mode = parsed.searchMode;
    if (!mode && parsed.webSearchEnabled) mode = "auto";
    return {
      searchMode: mode === "force" || mode === "auto" ? mode : "off",
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSearchPrefs(prefs: SearchPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isSearchPolicyActive(mode: SearchMode): boolean {
  return mode !== "off";
}
