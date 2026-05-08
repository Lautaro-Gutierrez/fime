"use client";

import { ASSETS_BY_ID } from "@/lib/assets";
import { formatQuantity, formatUSD } from "@/lib/format";
import type { ValuedHolding } from "@/lib/portfolio/holdings";

type Props = { holdings: ValuedHolding[] };

function TypeBadge({ type, asset }: { type: string, asset: any }) {
  // Using the asset's text/bg classes for the badge to match the theme
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${asset.bgClass} ${asset.textClass} bg-opacity-20`}>
      {type}
    </span>
  );
}

function HoldingRow({ holding: h }: { holding: ValuedHolding }) {
  const asset = ASSETS_BY_ID[h.asset_type];
  const Icon = asset.icon;

  const currentPrice = h.quantity ? h.current_value_usd / h.quantity : 0;
  
  const pnl = h.unrealized_pnl_pct;
  const daily = h.change_24h_pct;
  
  const isPositive = (pnl ?? 0) >= 0;

  return (
    <div className="group flex items-center gap-4 py-4 px-4 -mx-4 hover:bg-white/[0.02] rounded-lg transition-colors cursor-pointer border-b border-white/[0.04] last:border-0">
      {/* Ticker Icon */}
      <div className="relative shrink-0">
        <div className={`absolute inset-0 rounded-xl blur-md opacity-50 ${asset.bgClass}`} />
        <div
          className={`relative flex size-10 items-center justify-center rounded-xl ring-1 ${asset.bgClass} ${asset.textClass} ${asset.borderClass}`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      
      {/* Name & Type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{h.label}</span>
          <TypeBadge type={asset.short} asset={asset} />
        </div>
        <p className="text-sm text-white/40 truncate">{asset.name}</p>
      </div>
      
      {/* Quantity & Price */}
      <div className="text-right hidden sm:block">
        <p className="text-sm text-white/60 tabular-nums">
          {formatQuantity(h.quantity)} × {formatUSD(currentPrice)}
        </p>
      </div>
      
      {/* Total Value & Weight */}
      <div className="text-right min-w-[100px]">
        <p className="font-semibold text-white tabular-nums">{formatUSD(h.current_value_usd)}</p>
        <p className="text-xs text-white/40 tabular-nums">{h.weight_pct.toFixed(1)}%</p>
      </div>
      
      {/* Returns */}
      <div className="text-right min-w-[80px]">
        <p className={`font-semibold tabular-nums ${pnl === null ? "text-muted-foreground" : isPositive ? "text-emerald-400" : "text-rose-400"}`}>
          {pnl === null ? "—" : `${isPositive ? "+" : ""}${pnl.toFixed(1)}%`}
        </p>
        {daily !== null && h.asset_type !== "usd_cash" && h.asset_type !== "time_deposit" ? (
          <p className={`text-xs tabular-nums ${daily >= 0 ? "text-white/30" : "text-rose-400/60"}`}>
            {daily >= 0 ? "+" : ""}{daily.toFixed(2)}%
          </p>
        ) : (
          <p className="text-xs text-white/30 tabular-nums">—</p>
        )}
      </div>
    </div>
  );
}

export function HoldingsList({ holdings }: Props) {
  if (holdings.length === 0) return null;

  const sorted = [...holdings].sort(
    (a, b) => b.current_value_usd - a.current_value_usd,
  );

  return (
    <div className="glass-card rounded-2xl p-6 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Holdings</h3>
        <span className="text-xs text-white/40">{holdings.length} {holdings.length === 1 ? "posición" : "posiciones"}</span>
      </div>
      
      {/* Header */}
      <div className="flex items-center gap-4 py-2 text-xs text-white/40 border-b border-white/[0.06] uppercase tracking-wider font-medium">
        <div className="w-10 shrink-0" />
        <div className="flex-1">Activo</div>
        <div className="text-right hidden sm:block">Detalles</div>
        <div className="text-right min-w-[100px]">Valor</div>
        <div className="text-right min-w-[80px]">Rendimiento</div>
      </div>
      
      {/* Holdings List */}
      <div className="flex flex-col">
        {sorted.map((holding) => (
          <HoldingRow key={holding.key} holding={holding} />
        ))}
      </div>
    </div>
  );
}
