"use client";

import { motion } from "framer-motion";
import { Monitor, Moon } from "lucide-react";
import { toast } from "sonner";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";
import type { Theme } from "@/types/database";

const THEMES: { id: Theme; label: string; description: string; icon: typeof Moon; bg: string; card: string; text: string }[] = [
  {
    id: "deep-gray",
    label: "Deep Gray",
    description: "Gris profundo con sutiles contrastes",
    icon: Monitor,
    bg: "oklch(0.145 0 0)",
    card: "oklch(0.205 0 0)",
    text: "oklch(0.985 0 0)",
  },
  {
    id: "oled",
    label: "OLED Black",
    description: "Negro puro. Ideal para pantallas AMOLED",
    icon: Moon,
    bg: "oklch(0 0 0)",
    card: "oklch(0.1 0 0)",
    text: "oklch(0.985 0 0)",
  },
];

export function ThemePicker() {
  const { theme: currentTheme } = usePrefsContext();
  const updatePrefs = useUpdatePreferences();

  async function selectTheme(theme: Theme) {
    if (theme === currentTheme) return;
    try {
      await updatePrefs.mutateAsync({ theme });
      toast.success(theme === "oled" ? "Modo OLED activado" : "Tema Deep Gray aplicado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar tema");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className="size-1.5 rounded-full bg-theme-400" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Tema
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => {
          const isActive = currentTheme === t.id;
          const Icon = t.icon;
          return (
            <motion.button
              key={t.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectTheme(t.id)}
              className={cn(
                "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all",
                isActive
                  ? "border-theme-500/40 ring-1 ring-theme-500/20"
                  : "border-white/5 hover:border-white/10",
              )}
            >
              {/* Mini preview */}
              <div
                className="relative flex h-20 items-end gap-1.5 rounded-xl p-2"
                style={{ backgroundColor: t.bg }}
              >
                <div
                  className="h-6 flex-1 rounded-lg"
                  style={{ backgroundColor: t.card }}
                />
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: t.card }}
                />
                <div
                  className="h-8 flex-1 rounded-lg"
                  style={{ backgroundColor: t.card }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-4", isActive ? "text-theme-300" : "text-muted-foreground")} />
                  <span className="text-sm font-semibold tracking-tight">{t.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{t.description}</p>
              </div>

              {isActive && (
                <motion.div
                  layoutId="theme-active"
                  className="absolute right-3 top-3 size-2 rounded-full bg-theme-400"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
