"use client";

import { motion } from "framer-motion";
import { AlignJustify, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";
import type { Density } from "@/types/database";

const DENSITIES: { id: Density; label: string; description: string; icon: typeof AlignJustify }[] = [
  {
    id: "relaxed",
    label: "Relajada",
    description: "Más espacio y aire entre elementos",
    icon: AlignJustify,
  },
  {
    id: "compact",
    label: "Compacta",
    description: "Más información visible en pantalla",
    icon: AlignLeft,
  },
];

export function DensityPicker() {
  const { density: currentDensity } = usePrefsContext();
  const updatePrefs = useUpdatePreferences();

  async function selectDensity(density: Density) {
    if (density === currentDensity) return;
    try {
      await updatePrefs.mutateAsync({ density });
      toast.success(density === "compact" ? "Densidad compacta" : "Densidad relajada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar densidad");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className="size-1.5 rounded-full bg-theme-400" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Densidad
        </p>
      </div>

      <div className="flex gap-0.5 rounded-full border border-white/[0.06] bg-[#1A1D24] p-0.5 text-sm font-semibold">
        {DENSITIES.map((d) => {
          const isActive = currentDensity === d.id;
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => selectDensity(d.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 transition-all",
                isActive
                  ? "bg-gradient-to-br from-theme-500 to-orange-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {d.label}
            </button>
          );
        })}
      </div>

      <p className="px-1 text-[11px] text-muted-foreground">
        {currentDensity === "compact"
          ? "Más información visible en pantalla."
          : "Más espacio y aire entre elementos."}
      </p>
    </div>
  );
}
