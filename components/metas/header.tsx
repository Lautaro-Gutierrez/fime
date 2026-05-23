"use client";

import { motion } from "framer-motion";
import { Plus, Trophy } from "lucide-react";

type Props = {
  mainCount: number;
  sideCount: number;
  completedCount: number;
  avgProgressPct: number; // 0..100
  onCreate: () => void;
};

export function MetasHeader({
  mainCount,
  sideCount,
  completedCount,
  avgProgressPct,
  onCreate,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-7"
    >

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-theme-400" />
            Objetivos financieros
          </span>
          <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl uppercase">
            Objetivos
          </h1>
        </div>

        <button
          id="metas-quick-add"
          onClick={onCreate}
          className="group relative inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-white/[0.10]"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" />
          + Nuevo objetivo
        </button>
      </div>

      <div className="relative mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        <Stat label="Largo Plazo" value={mainCount} accent="text-theme-400" />
        <Stat label="Corto Plazo" value={sideCount} accent="text-orange-400" />
        <Stat label="Completadas" value={completedCount} accent="text-theme-400" icon={<Trophy className="size-3.5" />} />
        <Stat
          label="Progreso promedio"
          value={`${Math.round(avgProgressPct)}%`}
          accent="text-theme-300"
        />
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className={`inline-flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums [font-feature-settings:'tnum'] ${accent}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
