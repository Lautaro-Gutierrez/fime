"use client";

import { Suspense, useEffect, useMemo, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shell } from "@/components/layout/shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";

// Portfolios
import { PortfolioSelector } from "@/components/inversiones/portfolio-selector";
import { usePortfolios } from "@/hooks/use-portfolios";

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

export default function InversionesPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = use(params);
  const activeId = portfolioId.toUpperCase() === "ALL" ? "ALL" : portfolioId;

  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-indigo-400" />
              Cargando...
            </div>
          </div>
        </Shell>
      }
    >
      <InversionesContent portfolioId={activeId} />
    </Suspense>
  );
}

function InversionesContent({ portfolioId }: { portfolioId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "portfolio" ? "portfolio" : "bitacora";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { currentStep, isActive } = useOnboarding();
  const { data: portfolios = [], isLoading: isLoadingPortfolios } = usePortfolios();

  useEffect(() => {
    if (isActive && currentStep) {
      if (currentStep.id === "inv-initial") {
        setActiveTab("portfolio");
      } else if (currentStep.id === "inv-welcome" || currentStep.id === "inv-tabs") {
        setActiveTab("bitacora");
      }
    }
  }, [isActive, currentStep?.id]);

  const {
    holdings,
    totals,
    returnSeries,
    isLoading: isLoadingPortfolioData,
    isFetchingPrices,
    refetchPrices,
    resetHistory,
  } = usePortfolio(portfolioId);

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

          <div className="mt-4 flex items-center">
            <PortfolioSelector
              portfolios={portfolios}
              activeId={portfolioId}
              currentTotalUsd={totals.total_usd}
              holdingsCount={holdings.length}
              isLoading={isLoadingPortfolios}
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList id="inv-tabs" className="w-full max-w-xs">
            <TabsTrigger value="bitacora" className="flex-1">
              Bitácora
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex-1">
              Portfolio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bitacora">
            <BitacoraTab portfolioId={portfolioId} />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioTab
              holdings={holdings}
              totals={totals}
              returnSeries={returnSeries}
              isLoading={isLoadingPortfolioData}
              isFetchingPrices={isFetchingPrices}
              refetchPrices={refetchPrices}
              resetHistory={resetHistory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

/* ── Bitácora Tab ── */
function BitacoraTab({ portfolioId }: { portfolioId: string }) {
  const [filters, setFilters] = useState<FilterState>({
    assetTypes: [],
    ticker: "",
  });

  const { data: investments = [], isLoading } = useInvestments();

  // Filtramos por portfolio activo (si no es 'ALL') y luego aplicamos los filtros del UI
  const filteredByPortfolio = useMemo(() => {
    if (portfolioId === "ALL") return investments;
    return investments.filter((inv) => inv.portfolio_id === portfolioId);
  }, [investments, portfolioId]);

  const filtered = useMemo(() => {
    return filteredByPortfolio.filter((inv) => {
      if (
        filters.assetTypes.length > 0 &&
        !filters.assetTypes.includes(inv.asset_type)
      ) {
        return false;
      }
      if (filters.ticker.trim()) {
        const needle = filters.ticker.trim().toUpperCase();
        if (!inv.ticker?.toUpperCase().includes(needle)) return false;
      }
      return true;
    });
  }, [filteredByPortfolio, filters]);

  const totalOps = filteredByPortfolio.length;
  const filteredCount = filtered.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <NewTransactionDialog defaultPortfolioId={portfolioId === "ALL" ? undefined : portfolioId} />
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
        <TransactionsList investments={filtered} showPortfolioBadge={portfolioId === "ALL"} />
      )}
    </div>
  );
}

/* ── Portfolio Tab ── */
function PortfolioTab({
  holdings,
  totals,
  returnSeries,
  isLoading,
  isFetchingPrices,
  refetchPrices,
  resetHistory,
}: {
  holdings: any[];
  totals: any;
  returnSeries: any[];
  isLoading: boolean;
  isFetchingPrices: boolean;
  refetchPrices: () => void;
  resetHistory: () => Promise<void>;
}) {
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
