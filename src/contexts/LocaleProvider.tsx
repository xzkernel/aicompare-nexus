import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import i18n, {
  applyDocumentLocale,
  type AppLocale,
  SUPPORTED_LOCALES,
} from "@/i18n";
import { getPreferencesRecord, patchPreferencesRecord } from "@/lib/idb/preferences-store";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  isRtl: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const prefs = await getPreferencesRecord().catch(() => null);
      const stored = prefs?.locale ?? "en";
      const next = isAppLocale(stored) ? stored : "en";
      if (!cancelled) {
        await i18n.changeLanguage(next);
        applyDocumentLocale(next);
        setLocaleState(next);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    await i18n.changeLanguage(next);
    applyDocumentLocale(next);
    setLocaleState(next);
    await patchPreferencesRecord({ locale: next }).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      isRtl: locale === "ar",
    }),
    [locale, setLocale]
  );

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#131313]" aria-hidden />
    );
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
