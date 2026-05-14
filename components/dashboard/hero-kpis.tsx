"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { formatUSD } from "@/lib/format";
import { Eye, EyeOff } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export function HeroKpis() {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const { mutate: updatePrefs } = useUpdatePreferences();
  const toggleStealthMode = () => updatePrefs({ stealth_mode: !isStealthMode });
  const portfolio = usePortfolio();
  
  // Usamos el mes actual para ingresos y gastos
  const currentMonth = useMemo(() => new Date(), []);
  const incomesQ = useIncomes(currentMonth);
  const expensesQ = useExpenses(currentMonth);

  const fxMep = portfolio.fxMep > 0 ? portfolio.fxMep : 1000;

  // Calculo Flujo Libre (Free Cash Flow)
  const totalIncomesUsd = useMemo(() => {
    return (incomesQ.data ?? []).reduce((acc, inc) => {
      return acc + (inc.currency === "USD" ? inc.amount : inc.amount / fxMep);
    }, 0);
  }, [incomesQ.data, fxMep]);

  const totalExpensesUsd = useMemo(() => {
    return (expensesQ.data ?? []).reduce((acc, exp) => {
      return acc + (exp.currency === "USD" ? exp.amount : exp.amount / fxMep);
    }, 0);
  }, [expensesQ.data, fxMep]);

  const freeCashFlow = totalIncomesUsd - totalExpensesUsd;
  const savingsRate = totalIncomesUsd > 0 ? (freeCashFlow / totalIncomesUsd) * 100 : 0;
  
  // P&L Portfolio (ultimo punto de la serie de retornos)
  const pnlPct = useMemo(() => {
    const series = portfolio.returnSeries;
    if (!series || series.length === 0) return 0;
    return series[series.length - 1].portfolio_pct;
  }, [portfolio.returnSeries]);

  // Sparkline data: Ultimos 7 días
  const sparklineData = useMemo(() => {
    if (!portfolio.snapshots || portfolio.snapshots.length === 0) return [];
    return portfolio.snapshots.slice(-7).map(s => ({
      value: s.total_usd
    }));
  }, [portfolio.snapshots]);

  // Loading states
  const isLoading = portfolio.isLoading || incomesQ.isLoading || expensesQ.isLoading;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl ring-1 ring-white/10 p-6 relative overflow-hidden flex flex-col gap-6">
      {/* Glow effect sutil */}
      
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl flex items-center gap-2">
            FiMe <span className="text-theme-400">·</span> Dashboard
          </h1>
          <h2 className="text-sm text-muted-foreground">Centro de Control Financiero</h2>
        </div>
        <button 
          onClick={toggleStealthMode} 
          className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5"
          aria-label={isStealthMode ? "Disable Stealth Mode" : "Enable Stealth Mode"}
        >
          {isStealthMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
        {/* KPI 1: Patrimonio Total */}
        <div className="flex flex-col gap-1 relative p-4 rounded-2xl bg-gradient-to-br from-slate-500/10 to-transparent border border-white/[0.05]">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Patrimonio Neto</div>
          {isLoading ? (
            <div className="h-9 w-32 bg-white/5 animate-pulse rounded" />
          ) : (
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white [font-feature-settings:'tnum']">
              {isStealthMode ? "******" : formatUSD(portfolio.totals.total_usd, false)}
            </div>
          )}
          {/* Sparkline background para Patrimonio */}
          {!isStealthMode && sparklineData.length > 1 && (
            <div className="absolute -bottom-2 -left-2 -right-2 h-12 opacity-20 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#818cf8" 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* KPI 2: Free Cash Flow */}
        <div className="flex flex-col gap-1 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-white/[0.05]">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Flujo Libre</div>
          {isLoading ? (
            <div className="h-9 w-24 bg-white/5 animate-pulse rounded" />
          ) : (
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold tracking-tight [font-feature-settings:'tnum'] ${!isStealthMode && freeCashFlow < 0 ? "text-red-400" : "text-white"}`}>
              {isStealthMode ? "******" : formatUSD(freeCashFlow, true)}
            </div>
          )}
        </div>

        {/* KPI 3: P&L */}
        <div className="flex flex-col gap-1 p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-white/[0.05]">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Rend. Portfolio</div>
          {isLoading ? (
            <div className="h-9 w-20 bg-white/5 animate-pulse rounded" />
          ) : (
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold tracking-tight [font-feature-settings:'tnum'] ${!isStealthMode && pnlPct > 0 ? "text-emerald-400" : !isStealthMode && pnlPct < 0 ? "text-red-400" : "text-white"}`}>
              {isStealthMode ? "******" : `${pnlPct > 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
            </div>
          )}
        </div>

        {/* KPI 4: Savings Rate */}
        <div className="flex flex-col gap-1 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-white/[0.05]">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Tasa de Ahorro</div>
          {isLoading ? (
            <div className="h-9 w-20 bg-white/5 animate-pulse rounded" />
          ) : (
            <div className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white [font-feature-settings:'tnum']">
              {isStealthMode ? "******" : `${savingsRate.toFixed(1)}%`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
