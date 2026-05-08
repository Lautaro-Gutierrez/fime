"use client";

import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { ThemePicker } from "@/components/config/personalizacion/theme-picker";
import { AccentPicker } from "@/components/config/personalizacion/accent-picker";
import { DensityPicker } from "@/components/config/personalizacion/density-picker";

export default function ConfigPersonalizacionPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <ConfigHeader
          title="Personalización"
          eyebrow="Theming"
          description="Tema OLED Black o Deep Gray. Densidad compacta o relajada."
          backHref="/config"
        />
        <div className="relative overflow-hidden rounded-xl border border-white/5 bg-card/60 p-6 backdrop-blur">
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-theme-500/8 blur-3xl" />
          <div className="relative flex flex-col gap-8">
            <AccentPicker />
            <ThemePicker />
            <DensityPicker />
          </div>
        </div>
      </div>
    </Shell>
  );
}
