"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ASSETS_BY_ID } from "@/lib/assets";
import { formatQuantity, formatUSD } from "@/lib/format";
import type { ValuedHolding } from "@/lib/portfolio/holdings";

type Props = { holdings: ValuedHolding[] };

export function HoldingsList({ holdings }: Props) {
  if (holdings.length === 0) {
    return null;
  }

  const sorted = [...holdings].sort(
    (a, b) => b.current_value_usd - a.current_value_usd,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl backdrop-blur"
    >
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          MI PORTFOLIO
        </p>
      </div>

      <div className="flex flex-col divide-y divide-white/5">
        {sorted.map((h, i) => (
          <HoldingRow key={h.key} holding={h} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function HoldingRow({ holding: h, index }: { holding: ValuedHolding; index: number }) {
  const asset = ASSETS_BY_ID[h.asset_type];
  const Icon = asset.icon;

  const pnl = h.unrealized_pnl_pct;
  const daily = h.change_24h_pct;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.015]"
    >
      {/* Icon con aura */}
      <div className="relative shrink-0">
        <div className={`absolute inset-0 rounded-xl blur-md opacity-50 ${asset.bgClass}`} />
        <div
          className={`relative flex size-10 items-center justify-center rounded-xl ring-1 ${asset.bgClass} ${asset.textClass} ${asset.borderClass}`}
        >
          <Icon className="size-4" />
        </div>
      </div>

      {/* Ticker + meta */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-foreground">{h.label}</span>
          <span className="rounded-full border border-white/[0.08] bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {asset.short}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-md px-1.5 py-0.5 border border-white/[0.04]">
            <span className="font-mono tabular-nums text-foreground/80">{formatQuantity(h.quantity)}</span>
            <span className="text-muted-foreground/40 text-[9px]">×</span>
            <span className="font-mono tabular-nums text-foreground/80">{formatUSD(h.current_value_usd / (h.quantity || 1))}</span>
          </div>
          <span className="text-muted-foreground/40">=</span>
          <span className="font-mono tabular-nums font-medium text-white [font-feature-settings:'tnum']">
            {formatUSD(h.current_value_usd)}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-mono tabular-nums">{h.weight_pct.toFixed(1)}%</span>
        </div>
      </div>

      {/* P&L % + change 24h */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <DeltaChip pct={pnl} size="md" />
        {daily !== null && h.asset_type !== "usd_cash" && h.asset_type !== "time_deposit" && (
          <DeltaChip pct={daily} size="sm" label="24h" />
        )}
      </div>
    </motion.div>
  );
}

function DeltaChip({
  pct,
  size = "md",
  label,
}: {
  pct: number | null;
  size?: "sm" | "md";
  label?: string;
}) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/5 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
        <Minus className="size-3" />—
      </span>
    );
  }
  const isUp = pct > 0.05;
  const isDown = pct < -0.05;
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
  const textSize = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono font-semibold tabular-nums ${textSize} ${color} ${bg}`}
    >
      {label && (
        <span className="font-sans text-[9px] font-medium uppercase tracking-wider opacity-70">
          {label}
        </span>
      )}
      <Icon className="size-3" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}
