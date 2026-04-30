"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";
import type { AccentColor } from "@/types/database";

const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: "amber", label: "Ámbar", color: "bg-amber-500" },
  { id: "emerald", label: "Esmeralda", color: "bg-emerald-500" },
  { id: "blue", label: "Azul", color: "bg-blue-500" },
  { id: "rose", label: "Rosa", color: "bg-rose-500" },
  { id: "violet", label: "Violeta", color: "bg-violet-500" },
];

export function AccentPicker() {
  const { accentColor: currentAccent } = usePrefsContext();
  const updatePrefs = useUpdatePreferences();

  async function selectAccent(accent: AccentColor) {
    if (accent === currentAccent) return;
    try {
      await updatePrefs.mutateAsync({ accent_color: accent });
      toast.success("Color de acento actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar acento");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Acento
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {ACCENTS.map((a) => {
          const isActive = currentAccent === a.id;
          return (
            <motion.button
              key={a.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectAccent(a.id)}
              className={cn(
                "group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border p-3 transition-all",
                isActive
                  ? "border-theme-500/40 ring-1 ring-theme-500/20 bg-theme-500/10"
                  : "border-white/5 hover:border-white/10 bg-card/40",
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-full shadow-lg transition-transform",
                  a.color,
                  isActive ? "scale-110 shadow-theme-500/40 ring-2 ring-theme-500 ring-offset-2 ring-offset-background" : "opacity-70 group-hover:opacity-100"
                )}
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-theme-300" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {a.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
