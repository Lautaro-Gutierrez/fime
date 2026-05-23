"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shell } from "@/components/layout/shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Bitácora components
import { FxStrip } from "@/components/inversiones/fx-strip";
import { NewTransactionDialog } from "@/components/inversiones/new-transaction-dialog";
import { TransactionsList } from "@/components/inversiones/transactions-list";
import { Filters, type FilterState } from "@/components/inversiones/filters";
import { useInvestments } from "@/hooks/use-investments";

// Portfolio components
import { PortfolioHeader } from "@/components/portfolio/header";
import { AllocationDonut } from "@/components/portfolio/allocation-donut";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PerformanceChart } from "@/components/portfolio/performance-chart";
import { InitialPositionsDialog } from "@/components/portfolio/initial-positions-dialog";
import { usePortfolio } from "@/hooks/use-portfolio";

export default function InversionesPage() {
  return (
    <Suspense fallback={
      <Shell>
        <div className="flex items-center justify-center p-12">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-indigo-400" />
            Cargando...
          </div>
        </div>
      </Shell>
    }>
      <InversionesContent />
    </Suspense>
  );
}

function InversionesContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "portfolio" ? "portfolio" : "bitacora";
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_80%)]" />

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-1"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/80">
            Inversiones
          </span>
          <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold uppercase tracking-tight text-transparent sm:text-4xl">
            Centro de Inversiones
          </h1>
          <p className="text-sm text-muted-foreground">
            Bitácora de operaciones y resumen de portfolio
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList id="inversiones-tabs" className="w-full max-w-xs">
            <TabsTrigger value="bitacora" className="flex-1">Bitácora</TabsTrigger>
            <TabsTrigger value="portfolio" className="flex-1">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="bitacora">
            <BitacoraTab />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioTab />
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

/* ── Bitácora Tab ── */
function BitacoraTab() {
  const [filters, setFilters] = useState<FilterState>({
    assetTypes: [],
    ticker: "",
  });

  const { data: investments = [], isLoading } = useInvestments();

  const filtered = useMemo(() => {
    return investments.filter((inv) => {
      if (filters.assetTypes.length > 0 && !filters.assetTypes.includes(inv.asset_type)) {
        return false;
      }
      if (filters.ticker.trim()) {
        const needle = filters.ticker.trim().toUpperCase();
        if (!inv.ticker?.toUpperCase().includes(needle)) return false;
      }
      return true;
    });
  }, [investments, filters]);

  const totalOps = investments.length;
  const filteredCount = filtered.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <NewTransactionDialog />
      </div>

      {/* FX strip */}
      <FxStrip />

      {/* Filtros */}
      <Filters state={filters} onChange={setFilters} />

      {/* Contador */}
      {totalOps > 0 && (
        <motion.div
          key={`${filteredCount}-${totalOps}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-1 text-xs"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/5 bg-card/40 px-3 py-1 backdrop-blur">
            <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="font-mono tabular-nums text-muted-foreground">
              {filteredCount === totalOps
                ? `${totalOps} ${totalOps === 1 ? "operación" : "operaciones"}`
                : `${filteredCount} de ${totalOps} operaciones`}
            </span>
          </div>
        </motion.div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-white/5 bg-card/40 p-12 backdrop-blur">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-indigo-400" />
            Cargando operaciones...
          </div>
        </div>
      ) : (
        <TransactionsList investments={filtered} />
      )}
    </div>
  );
}

/* ── Portfolio Tab ── */
function PortfolioTab() {
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
    <div className="flex flex-col gap-6">
      {/* Header con total + refresh */}
      <PortfolioHeader
        totalUsd={totals.total_usd}
        unrealizedPct={totals.unrealized_pnl_pct}
        dailyPct={dailyPct}
        isFetching={isFetchingPrices}
        onRefresh={() => refetchPrices()}
        holdingsCount={holdings.length}
      />

      {/* Action bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center justify-between gap-3 px-1"
      >
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-card/40 px-3 py-1 text-xs backdrop-blur">
          <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="font-mono tabular-nums text-muted-foreground">
            {holdings.length}{" "}
            {holdings.length === 1 ? "posición" : "posiciones"} activas
          </span>
        </div>
        <InitialPositionsDialog />
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-white/5 bg-card/40 p-12 backdrop-blur">
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
  );
}
