"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/layout/shell";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useGoals } from "@/hooks/use-goals";
import { useInvestments } from "@/hooks/use-investments";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { formatUSD } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart, XAxis, CartesianGrid, Tooltip } from "recharts";
import Link from "next/link";
import { useSmartInsights } from "@/hooks/use-smart-insights";

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
    
    return portfolio.returnSeries.map(pt => {
      // Usamos dd MMM (ej. 01 jun, 05 jun) para evitar meses repetidos en datos diarios
      const labelX = format(parseISO(pt.date), "dd MMM", { locale: es });
      return {
        date: pt.date,
        portfolio: pt.portfolio_pct,
        sp500: pt.sp500_pct ?? 0,
        labelX,
      };
    });
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

  /* ───── Health Gauge Calculations ───── */
  const { rawCtx } = useSmartInsights();
  const score = useMemo(() => {
    if (!rawCtx) return 85;
    const totalIncome = rawCtx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
    const totalExpense = rawCtx.expenses.reduce((acc, e) => acc + e.amount, 0);
    const fixedExpense = rawCtx.expenses.filter(e => e.type === "fixed").reduce((acc, e) => acc + e.amount, 0);

    let savingsRateScore = 20;
    const sRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    if (sRate > 20) savingsRateScore = 100;
    else if (sRate >= 15) savingsRateScore = 80;
    else if (sRate >= 10) savingsRateScore = 50;

    let hhiScore = 10;
    const portfolioTotal = rawCtx.portfolioTotals.total_usd;
    if (portfolioTotal > 0) {
      let hhi = 0;
      for (const h of rawCtx.holdings) {
        const share = h.current_value_usd / portfolioTotal;
        hhi += share * share;
      }
      if (hhi < 0.15) hhiScore = 100;
      else if (hhi <= 0.25) hhiScore = 70;
      else if (hhi <= 0.40) hhiScore = 40;
    }

    let fixedRatioScore = 10;
    if (totalIncome > 0) {
      const fixedRatio = (fixedExpense / totalIncome) * 100;
      if (fixedRatio < 40) fixedRatioScore = 100;
      else if (fixedRatio <= 50) fixedRatioScore = 70;
      else if (fixedRatio <= 60) fixedRatioScore = 40;
    } else if (fixedExpense === 0) {
      fixedRatioScore = 100;
    }

    let metasScore = 50;
    let activeGoalsCount = 0;
    let sumMetasPct = 0;
    for (const goal of rawCtx.goals) {
      if (goal.status === "active") {
        const p = rawCtx.goalProgresses.get(goal.id);
        if (p) sumMetasPct += p.pct;
        activeGoalsCount++;
      }
    }
    if (activeGoalsCount > 0) {
      const avgMetas = sumMetasPct / activeGoalsCount;
      if (avgMetas > 80) metasScore = 100;
      else if (avgMetas > 50) metasScore = 80;
      else if (avgMetas > 20) metasScore = 60;
      else metasScore = 40;
    }

    const finalScore = Math.round(
      savingsRateScore * 0.25 + hhiScore * 0.20 + fixedRatioScore * 0.20 + metasScore * 0.35
    );
    return Math.max(0, Math.min(100, finalScore));
  }, [rawCtx]);

  // Dashoffset calc for gauge
  const circumference = 125.6; // pi * 40
  const dashoffset = circumference - (score / 100) * circumference;

  let gaugeStatus = "Regular";
  let gaugeColor = "text-amber-400";
  let gaugeBg = "bg-amber-500/15";
  let gaugeMsg = "Necesitas mejorar tus hábitos";
  if (score >= 80) {
    gaugeStatus = "Excelente";
    gaugeColor = "text-emerald-400";
    gaugeBg = "bg-emerald-500/15";
    gaugeMsg = "Tasa de ahorro óptima";
  } else if (score >= 50) {
    gaugeStatus = "Bien";
    gaugeColor = "text-blue-400";
    gaugeBg = "bg-blue-500/15";
    gaugeMsg = "Vas por buen camino";
  } else if (score < 30) {
    gaugeStatus = "Crítico";
    gaugeColor = "text-rose-400";
    gaugeBg = "bg-rose-500/15";
    gaugeMsg = "Gastos elevados, alerta roja";
  }

  const [dismissedInsights, setDismissedInsights] = useState<Record<string, boolean>>({});
  const dismissInsight = (id: string) => setDismissedInsights(prev => ({ ...prev, [id]: true }));

  const isLoading = portfolio.isLoading || incomesQ.isLoading || expensesQ.isLoading || goalsQ.isLoading;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1F2229] border border-white/[0.06] rounded-xl p-3 shadow-xl">
          <p className="text-xs text-slate-400 mb-2 font-medium capitalize">{label}</p>
          <div className="flex flex-col gap-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                  <span className="text-xs text-slate-300 font-semibold">{entry.name === "portfolio" ? "Portfolio" : "S&P 500"}</span>
                </div>
                <span className="text-sm font-bold text-white tnum ml-auto">
                  {Number(entry.value).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Shell>
      <div className="view p-8 ambient-glow view-enter">
        <div className="relative z-10">

          {/* ═══════ 1. HEADER ═══════ */}
          <div className="mb-7 animate-fade-in">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">RESUMEN FINANCIERO</p>
            <div className="flex items-end gap-5">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Patrimonio Neto</h1>
                <div className="flex items-baseline gap-3">
                  {isLoading ? (
                    <div className="h-10 w-48 bg-white/5 animate-pulse rounded" />
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-white tnum">
                        {isStealthMode ? "••••••" : formatUSD(portfolio.totals.total_usd, false)}
                      </span>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${patrimonioPctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {patrimonioPctChange >= 0 ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 15l7-7 7 7"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
                        )}
                        {isStealthMode ? "•••" : `${patrimonioPctChange >= 0 ? "+" : ""}${patrimonioPctChange.toFixed(1)}%`} <span className="text-slate-500 font-normal">vs mes anterior</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={toggleStealthMode}
                className="mb-1 p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-slate-400"
                title={isStealthMode ? "Mostrar valores" : "Ocultar valores"}
              >
                {isStealthMode ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* ═══════ 2. SMART INSIGHTS CAROUSEL ═══════ */}
          <div className="relative z-10 animate-fade-in delay-1 mb-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                Smart Insights
              </h2>
              <span className="text-[11px] text-slate-500">
                {3 - Object.values(dismissedInsights).filter(Boolean).length} activas
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {/* Tip de Ahorro */}
              {!dismissedInsights["insight-1"] && (
                <div className="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(20,184,166,0.04))", borderColor: "rgba(16,185,129,0.15)" }}>
                  <button onClick={() => dismissInsight('insight-1')} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Tip de Ahorro</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">Podrías ahorrar <span className="text-emerald-400 font-semibold">$50 extra</span> este mes reduciendo gastos en comida rápida. La categoría representa el 28% de tus egresos.</p>
                </div>
              )}
              {/* Recordatorio */}
              {!dismissedInsights["insight-2"] && (
                <div className="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.04))", borderColor: "rgba(59,130,246,0.15)" }}>
                  <button onClick={() => dismissInsight('insight-2')} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    </div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Recordatorio</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">Pago de tarjeta de crédito próximo, vence el <span className="text-blue-400 font-semibold">15/06</span>.</p>
                </div>
              )}
              {/* Oportunidad */}
              {!dismissedInsights["insight-3"] && (
                <div className="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,179,8,0.04))", borderColor: "rgba(245,158,11,0.15)" }}>
                  <button onClick={() => dismissInsight('insight-3')} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    </div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Oportunidad</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">Analiza tus suscripciones: podrías liberar <span className="text-amber-400 font-semibold">$30/mes</span>.</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══════ 3. KPI ROW (grid-cols-4) ═══════ */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7 animate-fade-in delay-2">
            {/* Flujo Libre */}
            <div className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">Flujo Libre</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                <>
                  <p className={`text-2xl font-bold tnum ${freeCashFlow >= 0 ? "text-white" : "text-rose-400"}`}>
                    {isStealthMode ? "••••••" : `${freeCashFlow >= 0 ? "+" : ""}${formatUSD(freeCashFlow, false)}`}
                  </p>
                  <p className="text-xs text-emerald-400 mt-1 font-medium">↑ 12% vs anterior</p>
                </>
              )}
            </div>
            {/* Gastos del Mes */}
            <div className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">Gastos del Mes</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,63,94,0.1)" }}>
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-white tnum">
                    {isStealthMode ? "••••••" : formatUSD(totalExpensesUsd, false)}
                  </p>
                  <p className="text-xs text-rose-400 mt-1 font-medium">↑ 3% vs anterior</p>
                </>
              )}
            </div>
            {/* Rend. Portfolio */}
            <div className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">Rend. Portfolio</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M2 20l5-5 4 4 11-14"/></svg>
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 w-20 bg-white/5 animate-pulse rounded" />
              ) : (
                <>
                  <p className={`text-2xl font-bold tnum ${pnlPct >= 0 ? "text-white" : "text-rose-400"}`}>
                    {isStealthMode ? "••••••" : `${pnlPct > 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-violet-400 mt-1 font-medium">+$250 este mes</p>
                </>
              )}
            </div>
            {/* Tasa de Ahorro */}
            <div className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">Tasa de Ahorro</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(14,165,233,0.1)" }}>
                  <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 w-20 bg-white/5 animate-pulse rounded" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-white tnum">
                    {isStealthMode ? "••••••" : `${savingsRate.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-sky-400 mt-1 font-medium">Meta: 40%</p>
                </>
              )}
            </div>
          </div>

          {/* ═══════ 4. WIDGETS ROW (grid-cols-3): Metas, Liquidez, Rendimiento ═══════ */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7 animate-fade-in delay-3">

            {/* ── Col 1: Metas Principales ── */}
            <div className="rounded-2xl p-6 border card-hover flex flex-col justify-between min-h-[300px]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)", height: "100%" }}>
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-white">Metas Principales</h3>
                  <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                    {rawCtx?.goals.filter(g => g.status === "active").length || 0} Activas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(rawCtx?.goals.filter(g => g.status === "active").slice(0, 2) || []).map((goal) => {
                    const prog = rawCtx!.goalProgresses.get(goal.id);
                    const pct = prog ? Math.min(100, Math.max(0, prog.pct)) : 0;
                    const offset = 201.06 - (pct / 100) * 201.06;
                    
                    return (
                      <div key={goal.id} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex flex-col items-center text-center card-hover">
                        <div className="relative w-20 h-20 mb-3">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                            <defs>
                              <linearGradient id={`donutGrad-${goal.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#d946ef" />
                                <stop offset="100%" stopColor="#06b6d4" />
                              </linearGradient>
                            </defs>
                            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"/>
                            <circle cx="40" cy="40" r="32" fill="none" stroke={`url(#donutGrad-${goal.id})`} strokeWidth="6" strokeDasharray="201.06" strokeDashoffset={offset} strokeLinecap="round"/>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold text-white tnum">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <p className="text-sm text-white font-semibold leading-tight truncate w-full">{goal.name}</p>
                        <p className="text-xs text-slate-300 mt-1 tnum truncate w-full">
                          {formatUSD(prog?.current || 0, false)} / {formatUSD(goal.target_amount, false)}
                        </p>
                        <p className="text-xs text-amber-400 font-medium tnum mt-0.5 truncate w-full">
                          {formatUSD(Math.max(0, goal.target_amount - (prog?.current || 0)), false)} restantes
                        </p>
                      </div>
                    );
                  })}
                  {(!rawCtx || rawCtx.goals.filter(g => g.status === "active").length === 0) && (
                    <div className="col-span-2 text-center text-xs text-slate-500 py-4">No hay metas activas</div>
                  )}
                </div>
              </div>
              <Link href="/metas" className="mt-4 w-full text-center block text-[11px] font-medium text-slate-400 hover:text-white transition-colors">
                Ver todas
              </Link>
            </div>

            {/* ── Col 2: Salud Financiera ── */}
            <div className="rounded-2xl p-5 border card-hover flex flex-col items-center justify-between relative overflow-hidden min-h-[300px]" style={{ background: "linear-gradient(135deg, #1F2229, rgba(16,185,129,0.03))", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-full flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Salud Financiera</h3>
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
              </div>
              
              {/* Semicircle Gauge */}
              <div className="relative flex flex-col items-center justify-end w-64 h-32 overflow-hidden mb-2">
                <svg viewBox="0 0 100 50" className="absolute top-0 left-0 w-full h-full">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"/>
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#brandGaugeGrad)" strokeWidth="10" strokeDasharray="125.6" strokeDashoffset={dashoffset} strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="brandGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d946ef" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute bottom-0 text-center">
                  <span className="text-5xl font-extrabold text-white tnum tracking-tighter">{score}</span>
                  <span className="text-sm text-slate-500 font-medium">/100</span>
                </div>
              </div>
              
              <div className="text-center mt-3 z-10 relative">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${gaugeBg} ${gaugeColor}`}>
                  {gaugeStatus}
                </span>
                <p className="text-xs text-slate-400 mt-2">{gaugeMsg}</p>
              </div>
            </div>

            {/* ── Col 3: Rendimiento (Portfolio vs S&P 500) ── */}
            <div className="rounded-2xl p-6 border card-hover min-h-[300px]" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Rendimiento</h3>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(135deg, #d946ef, #06b6d4)" }} /><span className="text-slate-300 font-medium">Portfolio</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" /><span className="text-slate-400 font-medium">S&P 500</span></div>
                </div>
              </div>
              {chartData.length > 1 ? (
                <div className="h-56 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="portfolioStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#d946ef" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                      <XAxis 
                        dataKey="labelX" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                        dx={-10}
                        tickFormatter={(value) => `${value}%`}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="portfolio" 
                        stroke="url(#portfolioStroke)" 
                        strokeWidth={2.5} 
                        fill="url(#portfolioGrad)" 
                        dot={false} 
                        activeDot={{ r: 4, fill: "#d946ef", stroke: "#1A1D24", strokeWidth: 2 }}
                        isAnimationActive={true} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sp500" 
                        stroke="#64748b" 
                        strokeWidth={2} 
                        strokeDasharray="4" 
                        dot={false} 
                        isAnimationActive={true} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-xs text-slate-500">
                  Sin datos de rendimiento
                </div>
              )}
            </div>
          </div>

          {/* ═══════ 5. ACTIVITY FEED ═══════ */}
          <div className="relative z-10 rounded-2xl p-5 border animate-fade-in delay-4 mb-20" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Actividad Reciente</h3>
            {combinedActivity.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No hay operaciones recientes este mes.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {combinedActivity.map((item) => {
                  const isExpense = item.type === "expense";
                  const isInvestment = item.type === "investment";
                  
                  let iconBg = "rgba(16,185,129,0.1)";
                  let iconColor = "text-emerald-400";
                  let IconSvg = <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>;

                  if (isExpense) {
                    iconBg = "rgba(244,63,94,0.1)";
                    iconColor = "text-rose-400";
                    IconSvg = <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>;
                  } else if (isInvestment) {
                    iconBg = "rgba(139,92,246,0.1)";
                    iconColor = "text-violet-400";
                    IconSvg = <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M2 20l5-5 4 4 11-14"/></svg>;
                  }

                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                          {IconSvg}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate capitalize">{item.label?.replace(/_/g, " ")}</p>
                          <p className="text-xs text-slate-500">{format(parseISO(item.date), "dd MMM yyyy", { locale: es })}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold tnum shrink-0 ${isExpense ? "text-rose-400" : "text-emerald-400"}`}>
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
