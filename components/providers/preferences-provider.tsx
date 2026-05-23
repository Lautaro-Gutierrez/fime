"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePreferences, type UserPreferences } from "@/hooks/use-preferences";
import type { Theme, Density, AccentColor } from "@/types/database";

type PrefsContextValue = {
  theme: Theme;
  density: Density;
  stealthMode: boolean;
  accentColor: AccentColor;
  displayName: string | null;
  avatarKey: string | null;
  onboardingCompleted: boolean;
  completedTours: string[];
  isLoading: boolean;
};

const defaults: PrefsContextValue = {
  theme: "deep-gray",
  density: "relaxed",
  stealthMode: false,
  accentColor: "amber",
  displayName: null,
  avatarKey: null,
  onboardingCompleted: true, // Default to true so it doesn't flash during load
  completedTours: [],
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
    accentColor: prefs?.accent_color ?? "amber",
    displayName: prefs?.display_name ?? null,
    avatarKey: prefs?.avatar_url ?? null,
    onboardingCompleted: prefs?.onboarding_completed ?? false, // Defaults to false for new users without preference row
    completedTours: prefs?.completed_tours ?? [],
    isLoading,
  };

  // Apply theme & density to <html> element
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = value.theme;
    el.dataset.density = value.density;
    el.dataset.accent = value.accentColor;

    // OLED class toggle
    if (value.theme === "oled") {
      el.classList.add("oled");
    } else {
      el.classList.remove("oled");
    }
  }, [value.theme, value.density, value.accentColor]);

  return (
    <PrefsContext.Provider value={value}>
      {children}
    </PrefsContext.Provider>
  );
}
