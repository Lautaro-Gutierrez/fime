"use client";

import { Suspense, useEffect, useMemo, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { ModuleInsightsPanel } from "@/components/module-insights-panel";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";

// Portfolios
import { PortfolioSelector } from "@/components/inversiones/portfolio-selector";
import { usePortfolios } from "@/hooks/use-portfolios";

// Bitácora components
import dynamic from "next/dynamic";
const NewTransactionDialog = dynamic(() => import("@/components/inversiones/new-transaction-dialog").then((mod) => mod.NewTransactionDialog), { ssr: false });
import { TransactionsList } from "@/components/inversiones/transactions-list";
import { useInvestments } from "@/hooks/use-investments";

// Portfolio components
import { AllocationDonut } from "@/components/portfolio/allocation-donut";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PerformanceChart } from "@/components/portfolio/performance-chart";
const InitialPositionsDialog = dynamic(() => import("@/components/portfolio/initial-positions-dialog").then((mod) => mod.InitialPositionsDialog), { ssr: false });
const TransferAssetDialog = dynamic(() => import("@/components/portfolio/transfer-asset-dialog").then((mod) => mod.TransferAssetDialog), { ssr: false });
import { usePortfolio } from "@/hooks/use-portfolio";
import type { ValuedHolding } from "@/lib/portfolio/holdings";

import { formatUSD } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import type { FxRates } from "@/lib/prices/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

async function fetchFx(): Promise<FxRates> {
  const res = await fetch("/api/prices/fx", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron cargar cotizaciones");
  return res.json();
}

export default function PortfolioClient(props: {
  params: Promise<{ portfolioId: string }>;
}) {
  const params = use(props.params);
  const portfolioId = params.portfolioId;
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
  const { data: portfolios = [], isLoading: isLoadingPortfolios } = usePortfolios();

  const {
    holdings,
    totals,
    returnSeries,
    isLoading: isLoadingPortfolioData,
    isFetchingPrices,
    refetchPrices,
    resetHistory,
  } = usePortfolio(portfolioId);

  const { data: investments = [], isLoading: isLoadingInvestments } = useInvestments();

  // Filtramos por portfolio en el historial
  const filteredInvestments = useMemo(() => {
    if (portfolioId === "ALL") return investments;
    return investments.filter((inv) => inv.portfolio_id === portfolioId);
  }, [investments, portfolioId]);

  const { data: fx } = useQuery({
    queryKey: ["fx-rates"],
    queryFn: fetchFx,
    staleTime: 5 * 60 * 1000,
  });

  const [transferHolding, setTransferHolding] = useState<ValuedHolding | null>(null);

  // Delta de "hoy" desde la serie TWR.
  const dailyPct = useMemo(() => {
    if (returnSeries.length < 2) return null;
    const last = returnSeries[returnSeries.length - 1].portfolio_pct;
    const prev = returnSeries[returnSeries.length - 2].portfolio_pct;
    return last - prev;
  }, [returnSeries]);

  const newTxBtn = (
    <button className="flex items-center gap-2 bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-fuchsia-500/20 border-0">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>
      Nueva Operación
    </button>
  );

  return (
    <Shell>
      <div className="relative z-10 flex flex-col gap-6 p-4 md:p-6 lg:p-8 ambient-glow">
        {/* Header */}
        <div className="mb-5 animate-fade-in">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">PORTFOLIO</p>
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <h1 className="text-2xl font-bold text-white">Centro de Inversiones Profesional</h1>
            
            <div id="inv-tabs" className="flex flex-wrap items-center gap-3">
              <PortfolioSelector
                portfolios={portfolios}
                activeId={portfolioId}
                currentTotalUsd={totals.total_usd}
                holdingsCount={holdings.length}
                isLoading={isLoadingPortfolios}
              />
              
              <NewTransactionDialog 
                defaultPortfolioId={portfolioId === "ALL" ? undefined : portfolioId} 
                customTrigger={newTxBtn} 
              />
              
              <Sheet>
                <SheetTrigger render={
                  <button className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors">
                    Ver Historial
                  </button>
                } />
                <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-[#1F2229] border-l border-white/[0.06] p-6 overflow-y-auto">
                  <SheetHeader className="mb-6 text-left">
                    <SheetTitle className="text-xl text-white">Historial de Operaciones</SheetTitle>
                  </SheetHeader>
                  <TransactionsList investments={filteredInvestments} showPortfolioBadge={portfolioId === "ALL"} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Smart Insights Inversiones */}
        <div className="animate-fade-in delay-1">
          <ModuleInsightsPanel module="inversiones" />
        </div>

        {/* FX Strip */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-6 animate-fade-in delay-1 pb-1">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-400 font-medium">Oficial</span>
            <span className="text-xs text-white font-bold tnum">{fx ? formatUSD(fx.oficial, false) : "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-400 font-medium">MEP</span>
            <span className="text-xs text-white font-bold tnum">{fx ? formatUSD(fx.mep, false) : "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-400 font-medium">CCL</span>
            <span className="text-xs text-white font-bold tnum">{fx ? formatUSD(fx.ccl, false) : "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-400 font-medium">Blue</span>
            <span className="text-xs text-white font-bold tnum">{fx ? formatUSD(fx.blue, false) : "—"}</span>
          </div>
          
          <div className="w-px h-6 bg-white/[0.08] mx-1 self-center flex-shrink-0"></div>
          
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-indigo-400 font-bold">AAPL</span>
            <span className="text-xs text-white font-bold tnum">$215.30</span>
            <span className="text-[10px] text-emerald-400 font-semibold">+1.5%</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-rose-400 font-bold">SPY</span>
            <span className="text-xs text-white font-bold tnum">$540.25</span>
            <span className="text-[10px] text-emerald-400 font-semibold">+0.8%</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-amber-400 font-bold">TSLA</span>
            <span className="text-xs text-white font-bold tnum">$195.50</span>
            <span className="text-[10px] text-rose-400 font-semibold">-2.1%</span>
          </div>
        </div>
        
        {/* Portfolio Value Card */}
        <div className="rounded-2xl p-6 mb-6 relative overflow-hidden animate-fade-in delay-1" style={{ background: "linear-gradient(135deg, #1a1040, #1F2229)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 600 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="bgLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,90 C50,85 100,70 150,60 C200,50 250,55 300,45 C350,35 400,25 450,20 C500,15 550,10 600,5 L600,120 L0,120 Z" fill="url(#bgLine)"/>
              <path d="M0,90 C50,85 100,70 150,60 C200,50 250,55 300,45 C350,35 400,25 450,20 C500,15 550,10 600,5" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5"/>
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-slate-400 mb-2 font-medium">Valor del Portfolio</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tnum">{formatUSD(totals.total_usd)}</span>
              {totals.unrealized_pnl_pct !== null && totals.unrealized_pnl_pct !== 0 && (
                <span className={`font-bold text-lg tnum ${totals.unrealized_pnl_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {totals.unrealized_pnl_pct > 0 ? "+" : ""}{totals.unrealized_pnl_pct.toFixed(2)}%
                </span>
              )}
            </div>
            {dailyPct !== null && (
              <p className="text-sm text-slate-400 mt-1">
                ({dailyPct > 0 ? "+" : ""}{dailyPct.toFixed(2)}% hoy)
              </p>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 animate-fade-in delay-3">
          {/* Portfolio Composition */}
          <div className="lg:col-span-2">
            {isLoadingPortfolioData ? (
               <div className="flex h-[320px] items-center justify-center text-slate-500 bg-[#1F2229] border border-white/[0.06] rounded-2xl p-6">Calculando...</div>
            ) : (
               <AllocationDonut holdings={holdings} />
            )}
          </div>
          {/* Historial de Rendimiento */}
          <div className="lg:col-span-3">
            {isLoadingPortfolioData ? (
               <div className="flex h-[320px] items-center justify-center text-slate-500 bg-[#1F2229] border border-white/[0.06] rounded-2xl p-6">Calculando...</div>
            ) : (
               <PerformanceChart series={returnSeries} onReset={resetHistory} onlyPortfolio={true} />
            )}
          </div>
        </div>

        {/* Holdings Table */}
        <div className="animate-fade-in delay-4">
          {isLoadingPortfolioData ? (
            <div className="p-8 text-center text-slate-500 bg-[#1F2229] border border-white/[0.06] rounded-2xl">Calculando holdings...</div>
          ) : (
            <HoldingsList holdings={holdings} portfolioId={portfolioId} onTransfer={setTransferHolding} />
          )}
        </div>
      </div>
      
      {portfolioId !== "ALL" && (
        <TransferAssetDialog
          open={!!transferHolding}
          onOpenChange={(v) => !v && setTransferHolding(null)}
          holding={transferHolding}
          sourcePortfolioId={portfolioId}
        />
      )}
    </Shell>
  );
}
