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
  text: string;
  glow: string;
  ring: string;
  primary?: boolean;
};

const RATES: RateConfig[] = [
  {
    key: "mep",
    label: "MEP",
    hint: "Bolsa",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    text: "text-emerald-300",
    glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.35)]",
    ring: "ring-emerald-500/30",
    primary: true,
  },
  {
    key: "ccl",
    label: "CCL",
    hint: "Contado Liqui",
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
    text: "text-violet-300",
    glow: "shadow-[0_0_40px_-8px_rgba(139,92,246,0.25)]",
    ring: "ring-violet-500/30",
  },
  {
    key: "blue",
    label: "Blue",
    hint: "Informal",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    text: "text-sky-300",
    glow: "shadow-[0_0_40px_-8px_rgba(14,165,233,0.25)]",
    ring: "ring-sky-500/30",
  },
  {
    key: "oficial",
    label: "Oficial",
    hint: "BNA",
    gradient: "from-zinc-500/15 via-zinc-500/5 to-transparent",
    text: "text-zinc-300",
    glow: "shadow-[0_0_30px_-8px_rgba(113,113,122,0.2)]",
    ring: "ring-zinc-500/20",
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
                "group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br p-4 transition-all",
                rate.gradient,
                rate.glow,
                rate.primary && "ring-1",
                rate.ring,
              )}
            >
              {/* Shimmer overlay on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-widest",
                      rate.text,
                    )}
                  >
                    {rate.label}
                  </span>
                  {rate.primary && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-emerald-300">
                      Ref
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    $
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-foreground md:text-3xl">
                    {isLoading ? (
                      <span className="inline-block h-8 w-20 animate-pulse rounded bg-white/5" />
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
