"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePreferences, type UserPreferences } from "@/hooks/use-preferences";
import type { Theme, Density } from "@/types/database";

type PrefsContextValue = {
  theme: Theme;
  density: Density;
  stealthMode: boolean;
  displayName: string | null;
  isLoading: boolean;
};

const defaults: PrefsContextValue = {
  theme: "deep-gray",
  density: "relaxed",
  stealthMode: false,
  displayName: null,
  isLoading: true,
};

const PrefsContext = createContext<PrefsContextValue>(defaults);

export function usePrefsContext() {
  return useContext(PrefsContext);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data: prefs, isLoading } = usePreferences();

  const value: PrefsContextValue = {
    theme: prefs?.theme ?? "deep-gray",
    density: prefs?.density ?? "relaxed",
    stealthMode: prefs?.stealth_mode ?? false,
    displayName: prefs?.display_name ?? null,
    isLoading,
  };

  // Apply theme & density to <html> element
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = value.theme;
    el.dataset.density = value.density;

    // OLED class toggle
    if (value.theme === "oled") {
      el.classList.add("oled");
    } else {
      el.classList.remove("oled");
    }
  }, [value.theme, value.density]);

  return (
    <PrefsContext.Provider value={value}>
      {children}
    </PrefsContext.Provider>
  );
}
