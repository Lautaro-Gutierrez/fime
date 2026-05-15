"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { FxRates } from "@/lib/prices/types";
import { cn } from "@/lib/utils";

async function fetchFx(): Promise<FxRates> {
  const res = await fetch("/api/prices/fx", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron cargar cotizaciones");
  return res.json();
}

function formatRate(value: number) {
  if (!value) return "—";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type RateConfig = {
  key: keyof FxRates;
  label: string;
  hint: string;
  gradient: string;
  bgTint: string;
  badgeClass: string;
  glow: string;
  ring: string;
  primary?: boolean;
};

const RATES: RateConfig[] = [
  {
    key: "mep",
    label: "MEP",
    hint: "Bolsa",
    gradient: "from-blue-500/10 to-transparent",
    bgTint: "bg-blue-500/[0.05]",
    badgeClass: "bg-blue-500/20 text-blue-300",
    glow: "shadow-[0_0_40px_-4px_rgba(59,130,246,0.5)]",
    ring: "ring-2 ring-blue-500/50",
    primary: true,
  },
  {
    key: "ccl",
    label: "CCL",
    hint: "Contado Liqui",
    gradient: "from-violet-500/10 to-transparent",
    bgTint: "bg-violet-500/[0.04]",
    badgeClass: "bg-violet-500/20 text-violet-300",
    glow: "shadow-[0_0_40px_-8px_rgba(139,92,246,0.25)]",
    ring: "ring-violet-500/30",
  },
  {
    key: "blue",
    label: "Blue",
    hint: "Informal",
    gradient: "from-amber-500/10 to-transparent",
    bgTint: "bg-amber-500/[0.04]",
    badgeClass: "bg-amber-500/20 text-amber-300",
    glow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.25)]",
    ring: "ring-amber-500/30",
  },
  {
    key: "oficial",
    label: "Oficial",
    hint: "BNA",
    gradient: "from-slate-500/10 to-transparent",
    bgTint: "bg-slate-500/[0.04]",
    badgeClass: "bg-slate-500/20 text-slate-300",
    glow: "shadow-[0_0_30px_-8px_rgba(100,116,139,0.2)]",
    ring: "ring-slate-500/20",
  },
];

export function FxStrip() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["fx-rates"],
    queryFn: fetchFx,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Cotizaciones ARS/USD
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          {isFetching ? "Actualizando" : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {RATES.map((rate, idx) => {
          const value = data?.[rate.key];
          return (
            <motion.div
              key={rate.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              whileHover={{ y: -2 }}
              className={cn(
                "group relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] backdrop-blur-xl bg-gradient-to-br p-3 sm:p-4 transition-all min-w-0",
                rate.bgTint,
                rate.gradient,
                rate.glow,
                rate.ring,
              )}
            >
              {/* Shimmer overlay on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                      rate.badgeClass,
                    )}
                  >
                    {rate.label}
                  </span>
                  {rate.primary && (
                    <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-blue-300">
                      Ref
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                    $
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-foreground md:text-3xl truncate min-w-0">
                    {isLoading ? (
                      <span className="inline-block h-8 w-16 sm:w-20 animate-pulse rounded bg-white/5" />
                    ) : typeof value === "number" ? (
                      formatRate(value)
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {rate.hint}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
