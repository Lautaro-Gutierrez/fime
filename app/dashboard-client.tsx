"use client";

import { useMemo } from "react";
import { Shell } from "@/components/layout/shell";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useGoals } from "@/hooks/use-goals";
import { useInvestments } from "@/hooks/use-investments";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { SmartInsightsCarousel } from "@/components/dashboard/smart-insights-carousel";
import { GoalsStrip } from "@/components/dashboard/goals-strip";
import { HealthGauge } from "@/components/dashboard/health-gauge";
import { formatUSD } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart, XAxis } from "recharts";
import Link from "next/link";

export default function DashboardClient() {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const { mutate: updatePrefs } = useUpdatePreferences();
  const toggleStealthMode = () => updatePrefs({ stealth_mode: !isStealthMode });

  const portfolio = usePortfolio();
  const currentMonth = useMemo(() => new Date(), []);
  const incomesQ = useIncomes(currentMonth);
  const expensesQ = useExpenses(currentMonth);
  const goalsQ = useGoals();
  const investmentsQ = useInvestments();

  const fxMep = portfolio.fxMep > 0 ? portfolio.fxMep : 1000;

  /* ───── KPI Calculations ───── */
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

  const pnlPct = useMemo(() => {
    const series = portfolio.returnSeries;
    if (!series || series.length === 0) return 0;
    return series[series.length - 1].portfolio_pct;
  }, [portfolio.returnSeries]);

  const patrimonioPctChange = useMemo(() => {
    if (!portfolio.snapshots || portfolio.snapshots.length < 2) return 0;
    const latest = portfolio.snapshots[portfolio.snapshots.length - 1].total_usd;
    const prev = portfolio.snapshots[portfolio.snapshots.length - 2].total_usd;
    if (prev === 0) return 0;
    return ((latest - prev) / prev) * 100;
  }, [portfolio.snapshots]);

  /* ───── Return Series Chart Data ───── */
  const chartData = useMemo(() => {
    if (!portfolio.returnSeries || portfolio.returnSeries.length === 0) return [];
    return portfolio.returnSeries.map(pt => ({
      date: pt.date,
      portfolio: pt.portfolio_pct,
      sp500: pt.sp500_pct ?? 0,
    }));
  }, [portfolio.returnSeries]);

  /* ───── Activity Feed ───── */
  const combinedActivity = useMemo(() => {
    const expenses = (expensesQ.data ?? []).map(e => ({
      id: e.id, type: "expense" as const, date: e.date, created_at: e.created_at,
      amount: e.amount, currency: e.currency, category: e.category,
      label: e.note || e.category,
    }));
    const investments = (investmentsQ.data ?? []).map(i => ({
      id: i.id, type: "investment" as const, date: i.date, created_at: i.created_at,
      amount: (i.quantity * (i.price_usd || 0)) + i.fees_usd, currency: "USD",
      category: i.asset_type,
      label: `${i.tx_type === "buy" ? "Compra" : "Venta"} ${i.ticker || i.asset_type}`,
    }));
    return [...expenses, ...investments]
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.created_at.localeCompare(a.created_at);
      })
      .slice(0, 6);
  }, [expensesQ.data, investmentsQ.data]);

  const isLoading = portfolio.isLoading || incomesQ.isLoading || expensesQ.isLoading || goalsQ.isLoading;

  return (
    <Shell>
      <div className="view p-8 ambient-glow view-enter">
        <div className="relative z-10">

          {/* ═══════ 1. HEADER ═══════ */}
          <div className="mb-7">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">RESUMEN</p>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Patrimonio Neto</h1>
                <div className="flex items-center gap-4">
                  {isLoading ? (
                    <div className="h-10 w-48 bg-white/5 animate-pulse rounded" />
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-white [font-feature-settings:'tnum']">
                        {isStealthMode ? "••••••" : formatUSD(portfolio.totals.total_usd, false)}
                      </span>
                      <span className={`text-sm font-semibold [font-feature-settings:'tnum'] ${patrimonioPctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {isStealthMode ? "•••" : `${patrimonioPctChange >= 0 ? "+" : ""}${patrimonioPctChange.toFixed(1)}%`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={toggleStealthMode}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                aria-label={isStealthMode ? "Mostrar valores" : "Ocultar valores"}
              >
                {isStealthMode ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* ═══════ 2. SMART INSIGHTS CAROUSEL ═══════ */}
          <div className="relative z-10 mb-7">
            <SmartInsightsCarousel />
          </div>

          {/* ═══════ 3. KPI ROW (grid-cols-4) ═══════ */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            {/* Flujo Libre */}
            <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Flujo Libre</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                <p className={`text-2xl font-bold [font-feature-settings:'tnum'] ${freeCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {isStealthMode ? "••••••" : `${freeCashFlow >= 0 ? "+" : ""}${formatUSD(freeCashFlow, false)}`}
                </p>
              )}
            </div>
            {/* Gastos del Mes */}
            <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Gastos del Mes</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-white [font-feature-settings:'tnum']">
                  {isStealthMode ? "••••••" : formatUSD(totalExpensesUsd, false)}
                </p>
              )}
            </div>
            {/* Rend. Portfolio */}
            <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Rend. Portfolio</p>
              {isLoading ? (
                <div className="h-8 w-20 bg-white/5 animate-pulse rounded" />
              ) : (
                <p className={`text-2xl font-bold [font-feature-settings:'tnum'] ${pnlPct >= 0 ? "text-violet-400" : "text-rose-400"}`}>
                  {isStealthMode ? "••••••" : `${pnlPct > 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
                </p>
              )}
            </div>
            {/* Tasa de Ahorro */}
            <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Tasa de Ahorro</p>
              {isLoading ? (
                <div className="h-8 w-20 bg-white/5 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-blue-400 [font-feature-settings:'tnum']">
                  {isStealthMode ? "••••••" : `${savingsRate.toFixed(1)}%`}
                </p>
              )}
            </div>
          </div>

          {/* ═══════ 4. WIDGETS ROW (grid-cols-3): Metas, Liquidez, Rendimiento ═══════ */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7">

            {/* ── Col 1: Metas Principales ── */}
            <GoalsStrip />

            {/* ── Col 2: Salud Financiera ── */}
            <HealthGauge />

            {/* ── Col 3: Rendimiento (Portfolio vs S&P 500) ── */}
            <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Rendimiento</h3>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(135deg, #D0005F, #00CFFF)" }} /><span className="text-slate-300 font-medium">Portfolio</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" /><span className="text-slate-400 font-medium">S&P 500</span></div>
                </div>
              </div>
              {chartData.length > 1 ? (
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="portfolioStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#D0005F" />
                          <stop offset="100%" stopColor="#00CFFF" />
                        </linearGradient>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D0005F" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#D0005F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Area type="monotone" dataKey="portfolio" stroke="url(#portfolioStroke)" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="sp500" stroke="#64748b" strokeWidth={2} strokeDasharray="4" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-xs text-slate-500">
                  Sin datos de rendimiento
                </div>
              )}
            </div>
          </div>

          {/* ═══════ 5. ACTIVITY FEED ═══════ */}
          <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-20" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Movimientos Recientes</h3>
            {combinedActivity.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No hay operaciones recientes este mes.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {combinedActivity.map((item) => {
                  const isExpense = item.type === "expense";
                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isExpense ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-300 font-medium truncate capitalize">{item.label?.replace(/_/g, " ")}</p>
                          <p className="text-[10px] text-slate-500">{format(parseISO(item.date), "d MMM", { locale: es })}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold [font-feature-settings:'tnum'] shrink-0 ${isExpense ? "text-white" : "text-emerald-400"}`}>
                        {isStealthMode ? "••••" : `${isExpense ? "-" : "+"}${formatUSD(item.amount, false)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </Shell>
  );
}
