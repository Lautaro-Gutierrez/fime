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
import { useSmartInsights } from "@/hooks/use-smart-insights";
import { computeGoalProgress } from "@/lib/goals/progress";
import { formatUSD } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart, XAxis } from "recharts";
import Link from "next/link";

/* ─────────────── Insight Category Colors ─────────────── */
const INSIGHT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  tip:         { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)", text: "text-emerald-400" },
  opportunity: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)", text: "text-amber-400" },
  reminder:    { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.15)", text: "text-blue-400" },
  warning:     { bg: "rgba(244,63,94,0.08)",  border: "rgba(244,63,94,0.15)",  text: "text-rose-400" },
  achievement: { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.15)", text: "text-violet-400" },
};
const INSIGHT_ICON_BG: Record<string, string> = {
  tip:         "rgba(16,185,129,0.15)",
  opportunity: "rgba(245,158,11,0.15)",
  reminder:    "rgba(59,130,246,0.15)",
  warning:     "rgba(244,63,94,0.15)",
  achievement: "rgba(139,92,246,0.15)",
};

/* ────────────── Insight Category Labels ──────────────── */
const INSIGHT_LABELS: Record<string, string> = {
  tip: "Tip de Ahorro",
  opportunity: "Oportunidad",
  reminder: "Recordatorio",
  warning: "Alerta",
  achievement: "Logro",
};

/* ────────────── Goal Color Palette ────────────────────── */
const GOAL_COLORS = ["text-emerald-400 bg-emerald-400", "text-blue-400 bg-blue-400", "text-violet-400 bg-violet-400", "text-amber-400 bg-amber-400"];

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
  const { insights, dismiss } = useSmartInsights("dashboard");

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

  /* ───── Goals Progress ───── */
  const activeGoals = useMemo(() => {
    const goals = goalsQ.data ?? [];
    return goals.filter(g => g.status === "active");
  }, [goalsQ.data]);

  const progressCtx = useMemo(() => {
    const expenses = expensesQ.data ?? [];
    const byCategory: Record<string, number> = {};
    let totalExp = 0;
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
      totalExp += Number(e.amount);
    }
    const incomesArs = (incomesQ.data ?? []).reduce((s, i) => s + Number(i.amount_ars), 0);
    return {
      portfolioTotalUsd: portfolio.totals.total_usd,
      valuedHoldings: portfolio.holdings,
      expensesCurrentMonth: { byCategory, total: totalExp },
      incomesCurrentMonthArs: incomesArs,
    };
  }, [portfolio.totals.total_usd, portfolio.holdings, expensesQ.data, incomesQ.data]);

  /* ───── Liquidez Projection ───── */
  const fixedExpenses = useMemo(() => {
    return (expensesQ.data ?? []).filter(e => e.type === "fixed").reduce((acc, e) => acc + e.amount, 0);
  }, [expensesQ.data]);
  const liquidezProjected = freeCashFlow;
  const fixedCoverage = totalIncomesUsd > 0 && (fixedExpenses / fxMep) <= totalIncomesUsd;

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
      <div className="p-8 w-full max-w-7xl mx-auto">
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
          {insights.length > 0 && (
            <div className="relative z-10 mb-7">
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {insights.map((insight) => {
                  const colors = INSIGHT_COLORS[insight.category] || INSIGHT_COLORS.tip;
                  const iconBg = INSIGHT_ICON_BG[insight.category] || INSIGHT_ICON_BG.tip;
                  const label = INSIGHT_LABELS[insight.category] || insight.category;

                  return (
                    <div
                      key={insight.id}
                      className="min-w-[320px] max-w-[340px] rounded-2xl p-4 border flex-shrink-0 relative transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                      style={{
                        background: `linear-gradient(135deg, ${colors.bg}, transparent)`,
                        borderColor: colors.border,
                      }}
                    >
                      {insight.dismissible && (
                        <button
                          onClick={() => dismiss(insight.id)}
                          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
                          <svg className={`w-4 h-4 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {insight.category === "tip" && <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />}
                            {insight.category === "reminder" && <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />}
                            {insight.category === "opportunity" && <path d="M13 10V3L4 14h7v7l9-11h-7z" />}
                            {insight.category === "warning" && <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
                            {insight.category === "achievement" && <><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></>}
                          </svg>
                        </div>
                        <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>{label}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
            <div className="rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Metas Principales</h3>
                <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                  {activeGoals.length} Activa{activeGoals.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-4">
                {activeGoals.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay metas activas.</p>
                ) : (
                  activeGoals.slice(0, 3).map((goal, i) => {
                    const progress = computeGoalProgress(goal, progressCtx);
                    const pct = Math.round(progress.pct);
                    const colorClass = GOAL_COLORS[i % GOAL_COLORS.length];
                    const [textColor, bgColor] = colorClass.split(" ");
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-white font-medium">{goal.name}</span>
                          <span className={`${textColor} font-semibold`}>
                            {isStealthMode ? "••" : `${pct}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                          <div className={`h-1.5 rounded-full ${bgColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Link
                href="/metas"
                className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors border border-white/[0.06] text-center block"
              >
                Ver todas
              </Link>
            </div>

            {/* ── Col 2: Proyección de Liquidez ── */}
            <div
              className="rounded-2xl p-5 border flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              style={{ background: "linear-gradient(135deg, #1F2229, rgba(16,185,129,0.05))", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Liquidez a 30 días</h3>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-xs text-slate-400 mb-1 font-medium">Sobrante proyectado</p>
                {isLoading ? (
                  <div className="h-9 w-36 bg-white/5 animate-pulse rounded" />
                ) : (
                  <p className="text-3xl font-extrabold text-white [font-feature-settings:'tnum']">
                    {isStealthMode ? "••••••" : formatUSD(Math.max(liquidezProjected, 0), false)}
                  </p>
                )}
                <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  {fixedCoverage ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                      Cobertura de fijos 100% asegurada
                    </>
                  ) : (
                    <span className="text-amber-400">⚠ Verificá la cobertura de gastos fijos</span>
                  )}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-50" />
            </div>

            {/* ── Col 3: Rendimiento (Portfolio vs S&P 500) ── */}
            <div className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Rendimiento</h3>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /><span className="text-slate-300 font-medium">Portfolio</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" /><span className="text-slate-400 font-medium">S&P 500</span></div>
                </div>
              </div>
              {chartData.length > 1 ? (
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Area type="monotone" dataKey="portfolio" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} isAnimationActive={false} />
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
