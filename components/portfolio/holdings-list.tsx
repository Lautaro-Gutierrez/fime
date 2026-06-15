"use client";

import { memo } from "react";
import { ASSETS_BY_ID } from "@/lib/assets";
import { formatUSD } from "@/lib/format";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import { AssetLogo } from "@/components/ui/asset-logo";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowRightLeft, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { 
  holdings: ValuedHolding[];
  portfolioId?: string;
  onTransfer?: (holding: ValuedHolding) => void;
};

function TypeBadge({ type, asset }: { type: string, asset: any }) {
  return (
    <span className={`hidden md:inline-block shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${asset.bgClass} ${asset.textClass} bg-opacity-20`}>
      {type}
    </span>
  );
}

const HoldingRow = memo(function HoldingRow({ holding: h, portfolioId, onTransfer }: { holding: ValuedHolding, portfolioId?: string, onTransfer?: (h: ValuedHolding) => void }) {
  const asset = ASSETS_BY_ID[h.asset_type];
  
  const pnl = h.unrealized_pnl_pct;
  const daily = h.change_24h_pct;
  
  const isPositive = (pnl ?? 0) >= 0;

  return (
    <div className="group flex items-center justify-between py-3 border-b border-white/[0.04] gap-2 last:border-0">
      {/* Lado Izquierdo: Activo e Ícono */}
      <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 flex items-center justify-center relative">
          <AssetLogo 
            assetType={h.asset_type} 
            ticker={h.ticker} 
            issuer={h.metadata?.issuer as string}
            size="md" 
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white truncate text-sm md:text-base">{h.label}</span>
            <TypeBadge type={asset.short} asset={asset} />
          </div>
          <p className="text-[11px] md:text-xs text-slate-500 truncate max-w-[80px] md:max-w-none mt-0.5">
            {h.asset_type === 'on' && h.metadata?.issuer ? h.metadata.issuer as string : asset.label}
          </p>
        </div>
      </div>

      {/* Lado Derecho: Valor y Rendimiento Compactos */}
      <div className="flex items-center gap-3 md:gap-6 text-right">
        {/* Bloque Valor */}
        <div className="w-[80px] md:w-[100px] shrink-0 flex flex-col items-end">
          <p className="font-medium text-white tabular-nums text-sm md:text-base">{formatUSD(h.current_value_usd)}</p>
          <p className="text-[11px] md:text-xs text-slate-500 tabular-nums">{h.weight_pct.toFixed(1)}%</p>
        </div>

        {/* Bloque Rendimiento */}
        <div className="w-[80px] md:w-[100px] shrink-0 flex flex-col items-end">
          <p className={`font-medium tabular-nums text-sm md:text-base ${pnl === null ? "text-slate-500" : isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {pnl === null ? "—" : `${isPositive ? "+" : ""}${pnl.toFixed(1)}%`}
          </p>
          {daily !== null && h.asset_type !== "usd_cash" && h.asset_type !== "time_deposit" ? (
            <p className={`text-[11px] md:text-xs tabular-nums ${daily >= 0 ? "text-slate-500" : "text-rose-400/80"}`}>
              {daily >= 0 ? "+" : ""}{daily.toFixed(2)}%
            </p>
          ) : (
            <p className="text-[11px] md:text-xs text-slate-500 tabular-nums">—</p>
          )}
        </div>
      </div>

      {/* Acciones */}
      {portfolioId && portfolioId !== "ALL" && onTransfer && (
        <div className="w-[32px] shrink-0 flex justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-white/50 hover:text-white" aria-label="Opciones de posición">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                align="end"
                className="z-50 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
              >
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation();
                    onTransfer(h);
                  }}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors hover:bg-white/5 focus:bg-white/5 text-sm font-medium text-white/80 hover:text-white"
                >
                  <ArrowRightLeft className="size-4" />
                  <span>Mover posición</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
    </div>
  );
});

export function HoldingsList({ holdings, portfolioId, onTransfer }: Props) {
  if (holdings.length === 0) return null;

  const sorted = [...holdings].sort(
    (a, b) => b.current_value_usd - a.current_value_usd,
  );

  return (
    <div className="rounded-2xl p-4 md:p-6 bg-[#1F2229] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Holdings</h3>
        <span className="text-xs text-white/40">{holdings.length} {holdings.length === 1 ? "posición" : "posiciones"}</span>
      </div>
      
      {/* Table container (no scrollbar needed) */}
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between py-2 text-[10px] md:text-xs text-white/40 border-b border-white/[0.06] uppercase tracking-wider font-semibold gap-2 mb-1">
          <div className="flex-1">Activo</div>
          <div className="flex items-center gap-3 md:gap-6 text-right">
            <div className="w-[80px] md:w-[100px] text-right">Valor</div>
            <div className="w-[80px] md:w-[100px] text-right">Rendimiento</div>
          </div>
          {portfolioId && portfolioId !== "ALL" && onTransfer && <div className="w-[32px] shrink-0" />}
        </div>
        
        {/* Holdings List */}
        <div className="flex flex-col">
          {sorted.map((holding) => (
            <HoldingRow key={holding.key} holding={holding} portfolioId={portfolioId} onTransfer={onTransfer} />
          ))}
        </div>
      </div>
    </div>
  );
}
