"use client";

import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ASSETS } from "@/lib/assets";
import type { AssetType } from "@/types/database";
import { cn } from "@/lib/utils";

export type FilterState = {
  assetTypes: AssetType[];
  ticker: string;
};

type Props = {
  state: FilterState;
  onChange: (state: FilterState) => void;
};

// Clase de glow cuando el chip está activo, por asset.
const ACTIVE_GLOW: Record<AssetType, string> = {
  crypto: "shadow-[0_0_20px_-4px_rgba(249,115,22,0.4)]",
  stock_us: "shadow-[0_0_20px_-4px_rgba(99,102,241,0.4)]",
  cedear: "shadow-[0_0_20px_-4px_rgba(6,182,212,0.4)]",
  stock_ar: "shadow-[0_0_20px_-4px_rgba(14,165,233,0.4)]",
  bond_ar: "shadow-[0_0_20px_-4px_rgba(20,184,166,0.4)]",
  time_deposit: "shadow-[0_0_20px_-4px_rgba(245,158,11,0.4)]",
  usd_cash: "shadow-[0_0_20px_-4px_rgba(34,197,94,0.4)]",
};

export function Filters({ state, onChange }: Props) {
  const hasActive =
    state.assetTypes.length > 0 || state.ticker.trim().length > 0;

  function toggleAsset(id: AssetType) {
    if (state.assetTypes.includes(id)) {
      onChange({
        ...state,
        assetTypes: state.assetTypes.filter((a) => a !== id),
      });
    } else {
      onChange({ ...state, assetTypes: [...state.assetTypes, id] });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="group relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
        <Input
          type="text"
          placeholder="Buscar por ticker (BTC, AAPL, GD30...)"
          value={state.ticker}
          onChange={(e) =>
            onChange({ ...state, ticker: e.target.value.toUpperCase() })
          }
          className="h-12 rounded-2xl border-white/5 bg-white/[0.03] backdrop-blur-xl pl-11 pr-10 font-mono uppercase tabular-nums backdrop-blur transition-colors placeholder:normal-case placeholder:font-sans hover:border-white/10 focus-visible:border-white/20"
        />
        {state.ticker && (
          <button
            onClick={() => onChange({ ...state, ticker: "" })}
            className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Asset chips */}
      <div className="flex flex-wrap gap-1.5">
        {ASSETS.map((a) => {
          const selected = state.assetTypes.includes(a.id);
          const Icon = a.icon;
          return (
            <motion.button
              key={a.id}
              onClick={() => toggleAsset(a.id)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                selected
                  ? cn(
                      a.bgClass,
                      a.textClass,
                      a.borderClass,
                      "ring-1 ring-inset ring-white/10",
                      ACTIVE_GLOW[a.id],
                    )
                  : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground backdrop-blur hover:border-white/10 hover:bg-white/[0.03] backdrop-blur-xl hover:text-foreground",
              )}
            >
              <Icon className="size-3" />
              {a.short}
            </motion.button>
          );
        })}
        {hasActive && (
          <button
            onClick={() => onChange({ assetTypes: [], ticker: "" })}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X className="size-3" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
