"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Shell } from "@/components/layout/shell";
import { PortfolioHeader } from "@/components/portfolio/header";
import { AllocationDonut } from "@/components/portfolio/allocation-donut";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PerformanceChart } from "@/components/portfolio/performance-chart";
import { InitialPositionsDialog } from "@/components/portfolio/initial-positions-dialog";
import { usePortfolio } from "@/hooks/use-portfolio";

export default function PortfolioPage() {
  const {
    holdings,
    totals,
    returnSeries,
    isLoading,
    isFetchingPrices,
    refetchPrices,
    resetHistory,
  } = usePortfolio();

  // Delta de "hoy" desde la serie TWR.
  const dailyPct = useMemo(() => {
    if (returnSeries.length < 2) return null;
    const last = returnSeries[returnSeries.length - 1].portfolio_pct;
    const prev = returnSeries[returnSeries.length - 2].portfolio_pct;
    return last - prev;
  }, [returnSeries]);

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.08),transparent_65%)]" />

        {/* Header con total + refresh */}
        <PortfolioHeader
          totalUsd={totals.total_usd}
          unrealizedPct={totals.unrealized_pnl_pct}
          dailyPct={dailyPct}
          isFetching={isFetchingPrices}
          onRefresh={() => refetchPrices()}
        />

        {/* Action bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-between gap-3 px-1"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/5 bg-card/40 px-3 py-1 text-xs backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="font-mono tabular-nums text-muted-foreground">
              {holdings.length}{" "}
              {holdings.length === 1 ? "posición" : "posiciones"} activas
            </span>
          </div>
          <InitialPositionsDialog />
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-card/40 p-12 backdrop-blur">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-fuchsia-400" />
              Calculando holdings...
            </div>
          </div>
        ) : (
          <>
            {/* Grid: Donut + Performance (desktop), stack (mobile) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <AllocationDonut holdings={holdings} />
              </div>
              <div className="lg:col-span-3">
                <PerformanceChart series={returnSeries} onReset={resetHistory} />
              </div>
            </div>

            {/* Holdings list */}
            <HoldingsList holdings={holdings} />
          </>
        )}
      </div>
    </Shell>
  );
}
