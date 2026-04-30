"use client";

import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatUSD } from "@/lib/format";

type Props = {
  totalUsd: number;
  unrealizedPct: number | null;
  dailyPct: number | null;
  isFetching: boolean;
  onRefresh: () => void;
};

export function PortfolioHeader({
  totalUsd,
  unrealizedPct,
  dailyPct,
  isFetching,
  onRefresh,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-6 backdrop-blur sm:p-7"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300/80">
            Tenencias
          </span>
          <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            MI PORTFOLIO
          </h1>
        </div>

        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition hover:border-white/20 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw
            className={`size-3.5 transition-transform ${
              isFetching ? "animate-spin" : "group-hover:rotate-90"
            }`}
          />
          {isFetching ? "Actualizando" : "Actualizar"}
        </button>
      </div>

      <div className="relative mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Valor total
          </span>
          <div className="mt-1 bg-gradient-to-br from-white to-white/70 bg-clip-text font-mono text-4xl font-bold tabular-nums text-transparent sm:text-5xl">
            {formatUSD(totalUsd)}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <DeltaPill label="Rendimiento" pct={unrealizedPct} />
          <DeltaPill label="Hoy" pct={dailyPct} />
        </div>
      </div>
    </motion.div>
  );
}

function DeltaPill({ label, pct }: { label: string; pct: number | null }) {
  const isUp = (pct ?? 0) > 0.05;
  const isDown = (pct ?? 0) < -0.05;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp
    ? "text-theme-400"
    : isDown
      ? "text-rose-400"
      : "text-muted-foreground";
  const bg = isUp
    ? "bg-theme-500/10 border-theme-500/20"
    : isDown
      ? "bg-rose-500/10 border-rose-500/20"
      : "bg-white/5 border-white/10";

  return (
    <div
      className={`inline-flex flex-col gap-0.5 rounded-2xl border px-3 py-2 backdrop-blur ${bg}`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${color}`}>
        <Icon className="size-3.5" />
        {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`}
      </div>
    </div>
  );
}
