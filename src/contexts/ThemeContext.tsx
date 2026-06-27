import React, { createContext, useContext, useEffect, useState } from "react";
import { getPreferencesRecord, patchPreferencesRecord } from "@/lib/idb/preferences-store";
import { subscribeLocalDb } from "@/lib/idb/db";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveTheme(value: string | undefined): Theme {
  return value === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void getPreferencesRecord().then((prefs) => {
      setThemeState(resolveTheme(prefs.theme));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    return subscribeLocalDb(() => {
      void getPreferencesRecord().then((prefs) => {
        setThemeState(resolveTheme(prefs.theme));
      });
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme, hydrated]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    void patchPreferencesRecord({ theme: next });
  };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
