import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LOCALES = ["en", "fr", "ar"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES: AppLocale[] = ["ar"];

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale as AppLocale);
}

export function applyDocumentLocale(locale: AppLocale): void {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = isRtlLocale(locale) ? "rtl" : "ltr";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
